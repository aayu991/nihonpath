import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { purchaseInput, orderSchema } from "@/lib/billing/schema";
import { available, billingConfig } from "@/lib/billing/config";
import {
  billingCatalog,
  billingService,
  logAttempt,
} from "@/lib/billing/server";
import { paymentProvider, PaymentError } from "@/lib/billing/providers";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sign_in" }, { status: 401 });
  if (request.headers.get("origin") !== billingConfig().origin)
    return Response.json({ error: "invalid" }, { status: 403 });
  let id: string | undefined;
  try {
    if (Number(request.headers.get("content-length")) > 4096)
      throw new Error("invalid");
    const input = purchaseInput.parse(await request.json());
    const { prices } = await billingCatalog();
    const price = prices.find(
      (p) => p.id === input.price && p.provider === input.provider,
    );
    if (!price || !available(price, input.country))
      throw new PaymentError("unavailable");
    const c = await createClient();
    if (!c) throw new PaymentError("unavailable");
    const r = await c.rpc("billing_order_create", {
      p_price: price.id,
      p_provider: input.provider,
      p_country: input.country,
      p_key: input.key,
      p_locale: input.locale,
    });
    if (r.error) throw new PaymentError("unavailable");
    const o = orderSchema.parse(r.data);
    id = o.id;
    const service = billingService();
    const claim = await service.rpc("billing_claim", { p_order: o.id });
    if (claim.error) throw new PaymentError("unavailable");
    if (!claim.data)
      return Response.json({ error: "pending", order: o.id }, { status: 409 });
    await logAttempt(o.id, "initiate", "pending");
    const checkout = await paymentProvider(o.provider).createPayment(o);
    const attached = await service.rpc("billing_attach", {
      p_order: o.id,
      p_reference: checkout.reference,
    });
    if (attached.error) throw new PaymentError("unavailable");
    await logAttempt(o.id, "initiate", "success");
    return Response.json(
      { order: o.id, checkout },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const error = e instanceof PaymentError ? e.code : "invalid";
    if (id)
      await logAttempt(
        id,
        "initiate",
        e instanceof PaymentError ? e.code : "provider_error",
      ).catch(() => {});
    return Response.json(
      { error, ...(id ? { order: id } : {}) },
      { status: error === "invalid" ? 400 : 503 },
    );
  }
}
