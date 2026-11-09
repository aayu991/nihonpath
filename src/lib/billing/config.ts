import "server-only";
import type { RegionalPrice } from "./schema";
export function billingConfig() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  let url: URL | null = null;
  try {
    url = origin ? new URL(origin) : null;
  } catch {
    /* Invalid deployment settings disable checkout. */
  }
  const sandbox =
    process.env.BILLING_MODE === "test" &&
    !!url &&
    url.origin === origin &&
    (url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)));
  const ready =
    sandbox &&
    !!process.env.SUPABASE_SECRET_KEY &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  return {
    origin,
    ready,
    stripe: !!(
      ready &&
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
      process.env.STRIPE_WEBHOOK_SECRET
    ),
    esewa: !!(
      ready &&
      process.env.ESEWA_TEST_SECRET &&
      process.env.ESEWA_TEST_PRODUCT_CODE
    ),
    khalti: !!(ready && process.env.KHALTI_SANDBOX_SECRET),
  };
}
export function available(
  p: Pick<RegionalPrice, "provider" | "country" | "currency" | "kind">,
  country: string,
) {
  const c = billingConfig();
  return (
    !!c[p.provider] &&
    (p.country === "*" || p.country === country) &&
    (p.provider === "stripe" ||
      (country === "NP" && p.currency === "NPR" && p.kind === "pass"))
  );
}
