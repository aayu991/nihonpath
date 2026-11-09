import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { billingConfig } from "@/lib/billing/config";
import { trustedOrder, verifyOrder, logAttempt } from "@/lib/billing/server";
import {
  paymentProvider,
  StripePaymentProvider,
  PaymentError,
} from "@/lib/billing/providers";
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sign_in" }, { status: 401 });
  if (request.headers.get("origin") !== billingConfig().origin)
    return Response.json({ error: "invalid" }, { status: 403 });
  try {
    const p = z
      .object({
        order: z.uuid(),
        action: z.enum(["verify", "portal", "cancel"]),
      })
      .strict()
      .parse(await request.json());
    const order = await trustedOrder(p.order);
    if (order.user_id !== user.id)
      return Response.json({ error: "forbidden" }, { status: 403 });
    if (p.action === "verify") await verifyOrder(order);
    else if (p.action === "portal") {
      if (order.provider !== "stripe") throw new PaymentError("unsupported");
      return Response.json({
        url: await new StripePaymentProvider().portal(order),
      });
    } else {
      await paymentProvider(order.provider).cancelPayment(order);
      await logAttempt(order.id, "cancel", "success");
      await verifyOrder(order);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof PaymentError ? e.code : "invalid" },
      { status: 503 },
    );
  }
}
