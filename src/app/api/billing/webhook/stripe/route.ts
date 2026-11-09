import { z } from "zod";
import { billingConfig } from "@/lib/billing/config";
import {
  StripePaymentProvider,
  stripeSignature,
} from "@/lib/billing/providers";
import {
  trustedOrder,
  verifyOrder,
  applyProof,
  billingService,
} from "@/lib/billing/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!billingConfig().stripe)
    return Response.json({ error: "unavailable" }, { status: 503 });
  try {
    const text = await request.text();
    if (text.length > 1000000) throw new Error("invalid");
    stripeSignature(
      text,
      request.headers.get("stripe-signature") ?? "",
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    const event = z
      .object({
        id: z.string().max(200),
        type: z.string(),
        livemode: z.literal(false),
        data: z.object({ object: z.record(z.string(), z.unknown()) }),
      })
      .parse(JSON.parse(text));
    const obj = event.data.object;
    let id: string | undefined;
    if (event.type.startsWith("checkout.session."))
      id = z.object({ order_id: z.uuid() }).parse(obj.metadata).order_id;
    else if (event.type.startsWith("customer.subscription."))
      id = z.object({ order_id: z.uuid() }).parse(obj.metadata).order_id;
    else if (event.type.startsWith("invoice.")) {
      const inv = await new StripePaymentProvider().request(
        `invoices/${encodeURIComponent(String(obj.id))}`,
      );
      const parent = z
        .object({
          subscription_details: z.object({ subscription: z.string() }),
        })
        .parse(inv.parent);
      const sub = await new StripePaymentProvider().request(
        `subscriptions/${encodeURIComponent(parent.subscription_details.subscription)}`,
      );
      id = z.object({ order_id: z.uuid() }).parse(sub.metadata).order_id;
    } else if (
      [
        "charge.refunded",
        "charge.dispute.created",
        "charge.dispute.closed",
      ].includes(event.type)
    ) {
      const charge = event.type.startsWith("charge.dispute.")
        ? await new StripePaymentProvider().request(
            `charges/${encodeURIComponent(String(obj.charge))}`,
          )
        : obj;
      const pi = z.string().parse(charge.payment_intent);
      const sessions = await new StripePaymentProvider().request(
        `checkout/sessions?payment_intent=${encodeURIComponent(pi)}&limit=1`,
      );
      const first = z
        .array(
          z.object({
            id: z.string(),
            metadata: z.object({ order_id: z.uuid() }),
          }),
        )
        .parse(sessions.data)[0];
      id = first?.metadata.order_id;
      let affectedSubscription: string | undefined;
      if (!id) {
        const payments = await new StripePaymentProvider().request(
          `invoice_payments?payment[type]=payment_intent&payment[payment_intent]=${encodeURIComponent(pi)}&limit=1`,
        );
        const payment = z
          .array(z.object({ invoice: z.string() }))
          .parse(payments.data)[0];
        if (payment) {
          const invoice = await new StripePaymentProvider().request(
            `invoices/${encodeURIComponent(payment.invoice)}`,
          );
          const parent = z
            .object({
              subscription_details: z.object({ subscription: z.string() }),
            })
            .parse(invoice.parent);
          affectedSubscription = parent.subscription_details.subscription;
          const subscription = await new StripePaymentProvider().request(
            `subscriptions/${encodeURIComponent(parent.subscription_details.subscription)}`,
          );
          id = z
            .object({ order_id: z.uuid() })
            .parse(subscription.metadata).order_id;
        }
      }
      if (!id) return Response.json({ error: "unmatched" }, { status: 500 });
      const order = await trustedOrder(id);
      if (
        order.provider !== "stripe" ||
        (first && first.id !== order.provider_reference)
      )
        throw new Error("invalid");
      if (affectedSubscription) {
        const original = await new StripePaymentProvider().request(
          `checkout/sessions/${encodeURIComponent(order.provider_reference!)}`,
        );
        if (original.subscription !== affectedSubscription)
          throw new Error("invalid");
      }
      if (event.type === "charge.dispute.closed" && obj.status === "won")
        return Response.json({ received: true });
      await applyProof(order, {
        reference: order.provider_reference!,
        event: event.id,
        state: "reversed",
        amount: order.amount_minor,
        currency: order.currency,
        refundReference: `charge:${String(charge.id)}`,
        ...(typeof charge.amount_refunded === "number"
          ? { refundAmount: charge.amount_refunded }
          : {}),
      });
      // A refund can arrive before the initial entitlement webhook persisted
      // the subscription reference. Use the verified invoice relationship too.
      if (order.subscription_reference || affectedSubscription)
        await new StripePaymentProvider().cancelPayment({
          ...order,
          subscription_reference:
            order.subscription_reference ?? affectedSubscription!,
        });
      return Response.json({ received: true });
    } else return Response.json({ received: true });
    if (!id) throw new Error("unmatched");
    const order = await trustedOrder(id);
    if (order.provider !== "stripe") throw new Error("invalid");
    // Webhook delivery can race checkout persistence: return 500 so Stripe retries.
    if (!order.provider_reference) throw new Error("retry");
    if (event.type === "customer.subscription.deleted") {
      const r = await billingService().rpc("billing_subscription_end", {
        p_order: order.id,
        p_event: event.id,
      });
      if (r.error) throw new Error("retry");
    } else await verifyOrder(order, undefined, true);
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "verification_failed" }, { status: 500 });
  }
}
