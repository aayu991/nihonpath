import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { billingConfig } from "./config";
import {
  decimalAmount,
  parseAmount,
  type PurchaseOrder,
  type Checkout,
  type VerifiedPayment,
} from "./schema";
export class PaymentError extends Error {
  constructor(
    public code:
      | "unavailable"
      | "timeout"
      | "provider_error"
      | "invalid_proof"
      | "unsupported",
  ) {
    super(code);
  }
}
export interface PaymentProvider {
  readonly capabilities: {
    recurring: boolean;
    portal: boolean;
    refund: boolean;
    cancel: boolean;
  };
  createPayment(order: PurchaseOrder): Promise<Checkout>;
  initiateCheckout(order: PurchaseOrder): Promise<Checkout>;
  verifyPayment(order: PurchaseOrder): Promise<VerifiedPayment>;
  getPaymentStatus(order: PurchaseOrder): Promise<VerifiedPayment>;
  processCallback(
    order: PurchaseOrder,
    input: Record<string, string>,
  ): Promise<VerifiedPayment>;
  cancelPayment(order: PurchaseOrder): Promise<void>;
  requestRefund(
    order: PurchaseOrder,
    key: string,
  ): Promise<{ reference: string; status: string }>;
}
const object = z.record(z.string(), z.unknown());
async function api(url: string, init: RequestInit = {}) {
  try {
    const r = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new PaymentError("provider_error");
    const text = await r.text();
    if (text.length > 2000000) throw new PaymentError("invalid_proof");
    return object.parse(JSON.parse(text));
  } catch (e) {
    if (e instanceof PaymentError) throw e;
    if (e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name))
      throw new PaymentError("timeout");
    throw new PaymentError("provider_error");
  }
}
const str = (v: unknown) => z.string().min(1).max(500).parse(v);
const num = (v: unknown) => z.number().int().nonnegative().safe().parse(v);
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function hmac(message: string, key: string) {
  return createHmac("sha256", key).update(message).digest("base64");
}
export function stripeSignature(
  body: string,
  header: string,
  secret: string,
  now = Date.now(),
) {
  const parts = header.split(",");
  const t = parts.find((x) => x.startsWith("t="))?.slice(2);
  if (!t || !/^\d+$/.test(t) || Math.abs(now / 1000 - Number(t)) > 300)
    throw new PaymentError("invalid_proof");
  const expected = createHmac("sha256", secret)
    .update(`${t}.${body}`)
    .digest("hex");
  if (
    !parts
      .filter((x) => x.startsWith("v1="))
      .some((x) => equal(expected, x.slice(3)))
  )
    throw new PaymentError("invalid_proof");
}
export function esewaCallback(
  data: string,
  secret: string,
  order: PurchaseOrder,
  product: string,
) {
  if (data.length > 10000) throw new PaymentError("invalid_proof");
  const p = object.parse(
    JSON.parse(Buffer.from(data, "base64").toString("utf8")),
  );
  const names =
    "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names";
  if (
    p.signed_field_names !== names ||
    p.transaction_uuid !== order.id ||
    p.product_code !== product ||
    parseAmount(p.total_amount, "NPR") !== order.amount_minor
  )
    throw new PaymentError("invalid_proof");
  const message = names
    .split(",")
    .map((k) => `${k}=${p[k]}`)
    .join(",");
  if (!equal(hmac(message, secret), str(p.signature)))
    throw new PaymentError("invalid_proof");
  return p;
}
abstract class ProviderBase implements PaymentProvider {
  abstract readonly capabilities: PaymentProvider["capabilities"];
  abstract initiateCheckout(o: PurchaseOrder): Promise<Checkout>;
  abstract verifyPayment(o: PurchaseOrder): Promise<VerifiedPayment>;
  createPayment(o: PurchaseOrder) {
    return this.initiateCheckout(o);
  }
  getPaymentStatus(o: PurchaseOrder) {
    return this.verifyPayment(o);
  }
  processCallback(o: PurchaseOrder, _input: Record<string, string>) {
    void _input;
    return this.verifyPayment(o);
  }
  async cancelPayment(_o: PurchaseOrder): Promise<void> {
    void _o;
    throw new PaymentError("unsupported");
  }
  async requestRefund(
    _o: PurchaseOrder,
    _key: string,
  ): Promise<{ reference: string; status: string }> {
    void _o;
    void _key;
    throw new PaymentError("unsupported");
  }
}
export class EsewaPaymentProvider extends ProviderBase {
  readonly capabilities = {
    recurring: false,
    portal: false,
    refund: false,
    cancel: false,
  };
  async initiateCheckout(o: PurchaseOrder) {
    if (!billingConfig().esewa || o.currency !== "NPR" || o.kind !== "pass")
      throw new PaymentError("unavailable");
    const total = decimalAmount(o.amount_minor, "NPR"),
      product = process.env.ESEWA_TEST_PRODUCT_CODE!;
    const callback = `${billingConfig().origin}/api/billing/return/esewa?order=${o.id}`;
    const fields = {
      amount: decimalAmount(o.amount_minor - o.tax_minor, "NPR"),
      tax_amount: decimalAmount(o.tax_minor, "NPR"),
      product_service_charge: "0",
      product_delivery_charge: "0",
      total_amount: total,
      transaction_uuid: o.id,
      product_code: product,
      success_url: callback,
      failure_url: callback,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: hmac(
        `total_amount=${total},transaction_uuid=${o.id},product_code=${product}`,
        process.env.ESEWA_TEST_SECRET!,
      ),
    };
    return {
      reference: o.id,
      url: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
      fields,
    };
  }
  async processCallback(o: PurchaseOrder, input: Record<string, string>) {
    if (input.data)
      esewaCallback(
        input.data,
        process.env.ESEWA_TEST_SECRET!,
        o,
        process.env.ESEWA_TEST_PRODUCT_CODE!,
      );
    return this.verifyPayment(o);
  }
  async verifyPayment(o: PurchaseOrder): Promise<VerifiedPayment> {
    if (!billingConfig().esewa) throw new PaymentError("unavailable");
    const q = new URLSearchParams({
      product_code: process.env.ESEWA_TEST_PRODUCT_CODE!,
      transaction_uuid: o.id,
      total_amount: decimalAmount(o.amount_minor, "NPR"),
    });
    const p = await api(
      `https://uat.esewa.com.np/api/epay/transaction/status/?${q}`,
    );
    if (
      p.transaction_uuid !== o.id ||
      p.product_code !== process.env.ESEWA_TEST_PRODUCT_CODE ||
      parseAmount(p.total_amount, "NPR") !== o.amount_minor
    )
      throw new PaymentError("invalid_proof");
    const state = (
      {
        COMPLETE: "paid",
        PENDING: "pending",
        AMBIGUOUS: "pending",
        NOT_FOUND: "expired",
        CANCELED: "reversed",
        FULL_REFUND: "reversed",
        PARTIAL_REFUND: "reversed",
      } as const
    )[String(p.status) as "COMPLETE"];
    if (!state) throw new PaymentError("invalid_proof");
    return {
      reference: o.id,
      event: `esewa:${o.id}:${str(p.status)}`,
      state,
      amount: o.amount_minor,
      currency: "NPR",
      receipt: typeof p.ref_id === "string" ? p.ref_id : undefined,
      refundAmount: p.status === "FULL_REFUND" ? o.amount_minor : undefined,
      refundReference: `esewa:${o.id}`,
    };
  }
}
export class KhaltiPaymentProvider extends ProviderBase {
  readonly capabilities = {
    recurring: false,
    portal: false,
    refund: false,
    cancel: false,
  };
  async initiateCheckout(o: PurchaseOrder) {
    if (
      !billingConfig().khalti ||
      o.currency !== "NPR" ||
      o.kind !== "pass" ||
      o.amount_minor < 1000
    )
      throw new PaymentError("unavailable");
    const p = await api("https://dev.khalti.com/api/v2/epayment/initiate/", {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.KHALTI_SANDBOX_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: `${billingConfig().origin}/api/billing/return/khalti?order=${o.id}`,
        website_url: billingConfig().origin,
        amount: o.amount_minor,
        purchase_order_id: o.id,
        purchase_order_name: o.product,
      }),
    });
    const u = new URL(str(p.payment_url));
    if (u.protocol !== "https:" || u.hostname !== "test-pay.khalti.com")
      throw new PaymentError("invalid_proof");
    return { reference: str(p.pidx), url: u.href };
  }
  async processCallback(o: PurchaseOrder, input: Record<string, string>) {
    if (input.pidx && input.pidx !== o.provider_reference)
      throw new PaymentError("invalid_proof");
    return this.verifyPayment(o);
  }
  async verifyPayment(o: PurchaseOrder): Promise<VerifiedPayment> {
    if (!billingConfig().khalti || !o.provider_reference)
      throw new PaymentError("unavailable");
    const p = await api("https://dev.khalti.com/api/v2/epayment/lookup/", {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.KHALTI_SANDBOX_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx: o.provider_reference }),
    });
    if (
      p.pidx !== o.provider_reference ||
      num(p.total_amount) !== o.amount_minor
    )
      throw new PaymentError("invalid_proof");
    const state = (
      {
        Completed: "paid",
        Pending: "pending",
        Initiated: "pending",
        Refunded: "reversed",
        "Partially Refunded": "reversed",
        Expired: "expired",
        "User canceled": "cancelled",
      } as const
    )[String(p.status) as "Completed"];
    if (!state) throw new PaymentError("invalid_proof");
    return {
      reference: o.provider_reference,
      event: `khalti:${o.provider_reference}:${str(p.status)}`,
      state,
      amount: o.amount_minor,
      currency: "NPR",
      receipt:
        typeof p.transaction_id === "string" ? p.transaction_id : undefined,
      refundAmount: p.status === "Refunded" ? o.amount_minor : undefined,
      refundReference: `khalti:${o.provider_reference}`,
    };
  }
}
export class StripePaymentProvider extends ProviderBase {
  readonly capabilities = {
    recurring: true,
    portal: true,
    refund: true,
    cancel: true,
  };
  async request(path: string, values?: Record<string, string>, key?: string) {
    if (!billingConfig().stripe) throw new PaymentError("unavailable");
    return api(`https://api.stripe.com/v1/${path}`, {
      method: values ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        ...(values
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(values ? { body: new URLSearchParams(values) } : {}),
    });
  }
  async initiateCheckout(o: PurchaseOrder) {
    const base = billingConfig().origin!;
    const values: Record<string, string> = {
      mode: o.kind === "subscription" ? "subscription" : "payment",
      "line_items[0][price_data][currency]": o.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(o.amount_minor),
      "line_items[0][price_data][product_data][name]": `NihonPath ${o.product} (test)`,
      "line_items[0][quantity]": "1",
      client_reference_id: o.id,
      "metadata[order_id]": o.id,
      success_url: `${base}/api/billing/return/stripe?order=${o.id}`,
      cancel_url: `${base}/${o.locale}/billing?order=${o.id}`,
    };
    if (o.kind === "subscription") {
      values["line_items[0][price_data][recurring][interval]"] = o.interval!;
      values["subscription_data[metadata][order_id]"] = o.id;
    }
    const p = await this.request("checkout/sessions", values, o.id);
    if (p.livemode !== false) throw new PaymentError("invalid_proof");
    const u = new URL(str(p.url));
    if (u.protocol !== "https:" || u.hostname !== "checkout.stripe.com")
      throw new PaymentError("invalid_proof");
    return { reference: str(p.id), url: u.href };
  }
  async verifyPayment(o: PurchaseOrder): Promise<VerifiedPayment> {
    if (!o.provider_reference?.startsWith("cs_test_"))
      throw new PaymentError("invalid_proof");
    const session = await this.request(
      `checkout/sessions/${encodeURIComponent(o.provider_reference)}`,
    );
    if (
      session.livemode !== false ||
      session.client_reference_id !== o.id ||
      num(session.amount_total) !== o.amount_minor ||
      session.currency !== o.currency.toLowerCase()
    )
      throw new PaymentError("invalid_proof");
    const result: VerifiedPayment = {
      reference: o.provider_reference,
      event: `stripe:${o.provider_reference}:${session.status}:${session.payment_status}`,
      state:
        session.status === "expired"
          ? "expired"
          : session.payment_status === "paid"
            ? "paid"
            : "pending",
      amount: o.amount_minor,
      currency: o.currency,
      customer:
        typeof session.customer === "string" ? session.customer : undefined,
    };
    if (o.kind === "subscription" && typeof session.subscription === "string") {
      const sub = await this.request(
        `subscriptions/${encodeURIComponent(session.subscription)}?expand[]=latest_invoice`,
      );
      const metadata = object.parse(sub.metadata);
      if (sub.livemode !== false || metadata.order_id !== o.id)
        throw new PaymentError("invalid_proof");
      result.subscription = session.subscription;
      const inv = object.parse(sub.latest_invoice);
      const items = z
        .object({
          data: z
            .array(
              z.object({
                current_period_start: z.number().int(),
                current_period_end: z.number().int(),
              }),
            )
            .length(1),
        })
        .parse(sub.items);
      if (items.data[0].current_period_end < items.data[0].current_period_start)
        throw new PaymentError("invalid_proof");
      const lines = z
        .object({
          data: z
            .array(
              z.object({
                period: z.object({
                  start: z.number().int(),
                  end: z.number().int(),
                }),
              }),
            )
            .length(1),
          has_more: z.literal(false),
        })
        .safeParse(inv.lines);
      if (
        inv.currency !== o.currency.toLowerCase() ||
        num(inv.amount_paid) !== o.amount_minor
      ) {
        result.state = "pending";
        return result;
      }
      result.event = `stripe:invoice:${str(inv.id)}`;
      result.receipt = str(inv.id);
      result.state =
        inv.status === "paid" &&
        ["active", "canceled", "past_due", "unpaid"].includes(
          String(sub.status),
        )
          ? "paid"
          : "pending";
      // A failed renewal can advance subscription-item dates. Only the paid
      // invoice's line period authorizes time; never infer it from current dates.
      if (!lines.success) {
        result.state = "pending";
        return result;
      }
      result.periodStart = new Date(
        lines.data.data[0].period.start * 1000,
      ).toISOString();
      result.periodEnd = new Date(
        lines.data.data[0].period.end * 1000,
      ).toISOString();
      if (sub.status === "canceled" && typeof sub.ended_at === "number")
        result.periodEnd = new Date(
          Math.min(lines.data.data[0].period.end, sub.ended_at) * 1000,
        ).toISOString();
    }
    return result;
  }
  async portal(o: PurchaseOrder) {
    if (!o.customer_reference) throw new PaymentError("unavailable");
    const p = await this.request("billing_portal/sessions", {
      customer: o.customer_reference,
      return_url: `${billingConfig().origin}/${o.locale}/billing`,
    });
    const u = new URL(str(p.url));
    if (u.protocol !== "https:" || u.hostname !== "billing.stripe.com")
      throw new PaymentError("invalid_proof");
    return u.href;
  }
  async cancelPayment(o: PurchaseOrder) {
    if (o.subscription_reference)
      await this.request(
        `subscriptions/${encodeURIComponent(o.subscription_reference)}`,
        { cancel_at_period_end: "true" },
        `cancel-${o.id}`,
      );
    else if (o.provider_reference)
      await this.request(
        `checkout/sessions/${encodeURIComponent(o.provider_reference)}/expire`,
        {},
        `expire-${o.id}`,
      );
    else throw new PaymentError("unsupported");
  }
  async requestRefund(o: PurchaseOrder, key: string) {
    if (o.kind === "subscription") throw new PaymentError("unsupported");
    const s = await this.request(
      `checkout/sessions/${encodeURIComponent(o.provider_reference!)}`,
    );
    const p = await this.request(
      "refunds",
      { payment_intent: str(s.payment_intent) },
      key,
    );
    return { reference: str(p.id), status: str(p.status) };
  }
}
export function paymentProvider(
  name: PurchaseOrder["provider"],
): PaymentProvider {
  return name === "stripe"
    ? new StripePaymentProvider()
    : name === "esewa"
      ? new EsewaPaymentProvider()
      : new KhaltiPaymentProvider();
}
