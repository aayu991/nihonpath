import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
export function operationsClient(timeoutMs = 4000) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("operations_unavailable");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
    },
  });
}
export async function reportFailure(
  code:
    | "request_failure"
    | "api_failure"
    | "auth_failure"
    | "database_failure"
    | "payment_verification_failure"
    | "email_failure",
) {
  console.error(
    JSON.stringify({ event: code, time: new Date().toISOString() }),
  );
  if (process.env.OPERATIONS_ENABLED === "true")
    try {
      await operationsClient().rpc("launch_monitor", { p_event: code });
    } catch {
      /* Never log exception messages, URLs, bodies or credentials. */
    }
}
