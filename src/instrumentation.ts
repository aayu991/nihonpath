import type { Instrumentation } from "next";
import { environmentReport } from "./lib/launch/environment";
export function register() {
  const r = environmentReport();
  if (r.errors.length)
    throw new Error(`Invalid deployment configuration: ${r.errors.join(",")}`);
}
export const onRequestError: Instrumentation.onRequestError = async (
  _error,
  _request,
  context,
) => {
  void _error;
  void _request;
  const { reportFailure } = await import("./lib/launch/server");
  await reportFailure(
    context.routeType === "route" ? "api_failure" : "request_failure",
  );
};
