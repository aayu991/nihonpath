import { environmentReport } from "@/lib/launch/environment";
export const dynamic = "force-dynamic";
export function GET() {
  const report = environmentReport();
  return Response.json(
    {
      status: report.errors.length ? "degraded" : "ok",
      service: "NihonPath",
      checks: {
        application: "up",
        configuration: report.errors.length ? "invalid" : "valid",
      },
      dependencies: "not_probed",
    },
    {
      status: report.errors.length ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
