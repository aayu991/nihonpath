import "server-only";
import { reportFailure } from "@/lib/launch/server";
import { createClient as serviceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  orderSchema,
  priceSchema,
  type PurchaseOrder,
  type VerifiedPayment,
} from "./schema";
import { available, billingConfig } from "./config";
import { paymentProvider, PaymentError } from "./providers";
export function billingService() {
  const c = billingConfig();
  if (!c.ready) throw new PaymentError("unavailable");
  return serviceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function billingCatalog() {
  const client = await createClient();
  if (!client) return { prices: [], unavailable: true };
  try {
    const r = await client.rpc("billing_catalog");
    const p = priceSchema.array().safeParse(r.data);
    return {
      prices: !r.error && p.success ? p.data : [],
      unavailable: !!r.error || !p.success,
    };
  } catch {
    return { prices: [], unavailable: true };
  }
}
export async function ownOrders() {
  const c = await createClient();
  if (!c) return [];
  const r = await c
    .from("purchase_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const p = orderSchema.array().safeParse(r.data);
  return p.success ? p.data : [];
}
export async function billingAccount() {
  const c = await createClient();
  if (!c)
    return { orders: [], periods: [], unavailable: true, now: Date.now() };
  const [o, e] = await Promise.all([
    c
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    c
      .from("entitlements")
      .select("*")
      .is("revoked_at", null)
      .order("ends_at", { ascending: false }),
  ]);
  const parsed = orderSchema.array().safeParse(o.data);
  return {
    orders: parsed.success ? parsed.data : [],
    periods: [...new Map((e.data ?? []).map((x) => [x.order_id, x])).values()],
    unavailable: !!o.error || !!e.error || !parsed.success,
    now: Date.now(),
  };
}
export async function trustedOrder(id: string) {
  const r = await billingService()
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return orderSchema.parse(r.data);
}
export async function logAttempt(
  id: string,
  operation: string,
  result: string,
) {
  const r = await billingService().rpc("billing_attempt", {
    p_order: id,
    p_operation: operation,
    p_result: result,
  });
  if (r.error) throw new PaymentError("unavailable");
}
export async function applyProof(order: PurchaseOrder, proof: VerifiedPayment) {
  const r = await billingService().rpc("billing_apply", {
    p_order: order.id,
    p_proof: JSON.parse(JSON.stringify(proof)) as Json,
  });
  if (r.error) throw new PaymentError("invalid_proof");
}
export async function verifyOrder(
  order: PurchaseOrder,
  input?: Record<string, string>,
  trusted = false,
) {
  if (!trusted) {
    const claim = await billingService().rpc("billing_verify_claim", {
      p_order: order.id,
    });
    if (claim.error || !claim.data) throw new PaymentError("unavailable");
  }
  try {
    const provider = paymentProvider(order.provider);
    const proof = input
      ? await provider.processCallback(order, input)
      : await provider.verifyPayment(order);
    await applyProof(order, proof);
    await logAttempt(order.id, input ? "callback" : "verify", "success");
    return proof;
  } catch (e) {
    await reportFailure("payment_verification_failure");
    await logAttempt(
      order.id,
      input ? "callback" : "verify",
      e instanceof PaymentError ? e.code : "provider_error",
    );
    throw e;
  }
}
export async function entitlement(feature: string) {
  const c = await createClient();
  if (!c) return false;
  const r = await c.rpc("billing_has_feature", { p_feature: feature });
  return !r.error && r.data === true;
}
export function enabledPrice(
  p: Parameters<typeof available>[0],
  country: string,
) {
  return available(p, country);
}
