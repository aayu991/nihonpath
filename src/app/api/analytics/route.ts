import { analyticsSchema, vitalBucket } from "@/lib/launch/schema";
import { operationsClient } from "@/lib/launch/server";
import { environmentReport } from "@/lib/launch/environment";
let minute = 0,
  count = 0;
export async function POST(request: Request) {
  if (process.env.ANALYTICS_ENABLED !== "true")
    return new Response(null, { status: 204 });
  if (request.headers.get("origin") !== environmentReport().origin)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const now = Math.floor(Date.now() / 60000);
  if (now !== minute) {
    minute = now;
    count = 0;
  }
  if (++count > 1000)
    return Response.json({ error: "limited" }, { status: 429 });
  try {
    if (Number(request.headers.get("content-length")) > 1000) throw new Error();
    const p = analyticsSchema.parse(await request.json());
    const c = operationsClient(),
      r =
        p.type === "event"
          ? await c.rpc("launch_client_count", {
              p_event: p.event,
              p_locale: p.locale,
            })
          : await c.rpc("launch_vital", {
              p_metric: p.metric,
              p_bucket: vitalBucket(p.metric, p.value),
            });
    return new Response(null, { status: r.error ? 503 : 204 });
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
}
