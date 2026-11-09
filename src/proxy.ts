import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { supabaseConfig } from "./lib/supabase/config";
import type { Database } from "./lib/supabase/database.types";
import { environmentReport } from "./lib/launch/environment";
import { privateSeoPath } from "./lib/seo/access";
const localize = createMiddleware(routing);
export default async function proxy(request: NextRequest) {
  function protect<T extends Response>(value: T) {
    const path = request.nextUrl.pathname;
    if (
      !environmentReport().indexing ||
      request.nextUrl.search ||
      privateSeoPath(path)
    )
      value.headers.set("X-Robots-Tag", "noindex, nofollow");
    return value;
  }
  let response = localize(request);
  const config = supabaseConfig();
  if (!config) return protect(response);
  const client = createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        const previous = response.cookies.getAll();
        response = localize(request);
        previous.forEach((cookie) => response.cookies.set(cookie));
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  try {
    await client.auth.getUser();
  } catch {
    /* Protected pages independently verify the user and fail closed. */
  }
  response.headers.set("Cache-Control", "private, no-store");
  return protect(response);
}
export const config = { matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"] };
