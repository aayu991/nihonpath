import { z } from "zod";
import { trustedOrder, verifyOrder } from "@/lib/billing/server";
import { billingConfig } from "@/lib/billing/config";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const url = new URL(request.url),
    id = url.searchParams.get("order"),
    provider = (await params).provider;
  if (
    !z.uuid().safeParse(id).success ||
    !["stripe", "esewa", "khalti"].includes(provider) ||
    !billingConfig().ready
  )
    return Response.json({ error: "unavailable" }, { status: 400 });
  try {
    const order = await trustedOrder(id!);
    if (order.provider !== provider) throw new Error("invalid");
    let result = "verified";
    try {
      await verifyOrder(order, Object.fromEntries(url.searchParams));
    } catch {
      result = "pending";
    }
    // No PII or raw gateway payload in the redirect. The destination loads owner-scoped data.
    return Response.redirect(
      `${billingConfig().origin}/${order.locale}/billing?order=${order.id}&result=${result}`,
      303,
    );
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
}
