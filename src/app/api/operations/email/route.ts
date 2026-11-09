import { operationsAuthorized } from "@/lib/launch/authorization";
import { z } from "zod";
import { operationsClient, reportFailure } from "@/lib/launch/server";
import { emailEnabled, ApprovedEmailTransport } from "@/lib/email/delivery";
import { notificationKinds } from "@/lib/email/templates";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.OPERATIONS_SECRET ?? "",
    given = request.headers.get("authorization") ?? "";
  if (!operationsAuthorized(given, secret))
    return Response.json({ error: "forbidden" }, { status: 403 });
  if (!emailEnabled())
    return Response.json({ error: "email_disabled" }, { status: 503 });
  try {
    const c = operationsClient();
    await c.rpc("launch_renewal_notifications");
    const claim = await c.rpc("launch_email_claim");
    if (claim.error) throw new Error();
    const items = z
      .array(
        z.object({
          id: z.uuid(),
          lease_token: z.uuid(),
          user_id: z.uuid(),
          kind: z.enum(notificationKinds),
          locale: z.enum(["en", "ja", "ne", "hi"]),
        }),
      )
      .parse(claim.data);
    const transport = new ApprovedEmailTransport();
    let accepted = 0;
    for (const item of items) {
      try {
        const user = await c.auth.admin.getUserById(item.user_id);
        if (
          user.error ||
          !user.data.user?.email ||
          !user.data.user.email_confirmed_at
        )
          throw new Error();
        const reference = await transport.send({
          ...item,
          to: user.data.user.email,
        });
        const r = await c.rpc("launch_email_finish", {
          p_id: item.id,
          p_lease: item.lease_token,
          p_result: "accepted",
          p_reference: reference,
        });
        if (r.error) throw new Error();
        accepted++;
      } catch {
        await c.rpc("launch_email_finish", {
          p_id: item.id,
          p_lease: item.lease_token,
          p_result: "retry",
        });
        await reportFailure("email_failure");
      }
    }
    return Response.json(
      { claimed: items.length, accepted },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    await reportFailure("database_failure");
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
