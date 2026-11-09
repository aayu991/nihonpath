import { operationsAuthorized } from "@/lib/launch/authorization";
import { operationsClient } from "@/lib/launch/server";
export async function GET(request: Request) {
  const secret = process.env.OPERATIONS_SECRET ?? "",
    token = request.headers.get("authorization") ?? "";
  if (!operationsAuthorized(token, secret))
    return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const r = await operationsClient().rpc("launch_schema_health");
    return Response.json(
      { ready: !r.error && r.data === true },
      {
        status: !r.error && r.data === true ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json({ ready: false }, { status: 503 });
  }
}
