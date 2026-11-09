export function environmentReport(
  env: Record<string, string | undefined> = process.env,
) {
  const errors: string[] = [],
    warnings: string[] = [];
  const stage = env.VERCEL_ENV ?? env.APP_ENV ?? "development";
  let origin: string | null = null;
  try {
    const u = new URL(env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
    if (
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname !== "/"
    )
      throw new Error();
    origin = u.origin;
  } catch {
    errors.push("SITE_ORIGIN_INVALID");
  }
  if (!["development", "preview", "production", "test"].includes(stage))
    errors.push("ENVIRONMENT_INVALID");
  if (env.BILLING_MODE && !["disabled", "test"].includes(env.BILLING_MODE))
    errors.push("LIVE_BILLING_FORBIDDEN");
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith("sk_test_"))
    errors.push("STRIPE_TEST_KEY_REQUIRED");
  for (const name of Object.keys(env))
    if (
      name.startsWith("NEXT_PUBLIC_") &&
      /(SECRET|PASSWORD|SERVICE_ROLE|PRIVATE_KEY|RESEND_API|OPENAI_API|STRIPE_KEY|KHALTI_KEY)/i.test(
        name,
      )
    )
      errors.push("PUBLIC_SECRET_VARIABLE_FORBIDDEN");
  if (stage === "production") {
    if (
      !origin?.startsWith("https://") ||
      /localhost|127\.0\.0\.1|\.vercel\.app/.test(origin ?? "")
    )
      errors.push("PRODUCTION_DOMAIN_REQUIRED");
    if (
      !env.NEXT_PUBLIC_SUPABASE_URL ||
      !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
      errors.push("PRODUCTION_AUTH_CONFIG_REQUIRED");
    if (env.LAUNCH_RELEASE_APPROVED !== "true")
      errors.push("PRODUCTION_RELEASE_APPROVAL_REQUIRED");
  }
  if (
    env.BILLING_MODE === "test" &&
    (!env.SUPABASE_SECRET_KEY || !env.NEXT_PUBLIC_SUPABASE_URL)
  )
    errors.push("BILLING_SERVER_CONFIG_REQUIRED");
  if (
    env.AI_TUTOR_ENABLED === "true" &&
    (!env.OPENAI_API_KEY || !env.OPENAI_MODEL || !env.SUPABASE_SECRET_KEY)
  )
    errors.push("AI_SERVER_CONFIG_REQUIRED");
  if (
    env.EMAIL_DELIVERY_ENABLED === "true" &&
    env.EMAIL_PROVIDER_APPROVED !== "true"
  )
    errors.push("EMAIL_PROVIDER_APPROVAL_REQUIRED");
  if (
    env.EMAIL_DELIVERY_ENABLED === "true" &&
    (!env.RESEND_API_KEY ||
      !env.EMAIL_FROM ||
      env.EMAIL_PROVIDER !== "resend" ||
      !env.OPERATIONS_SECRET ||
      env.OPERATIONS_SECRET.length < 32)
  )
    errors.push("EMAIL_SERVER_CONFIG_REQUIRED");
  if (
    (env.OPERATIONS_ENABLED === "true" || env.ANALYTICS_ENABLED === "true") &&
    (!env.SUPABASE_SECRET_KEY || !env.NEXT_PUBLIC_SUPABASE_URL)
  )
    errors.push("OPERATIONS_SERVER_CONFIG_REQUIRED");
  if (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_secret_"))
    errors.push("PUBLIC_SECRET_VALUE_FORBIDDEN");
  if (!env.NEXT_PUBLIC_SUPABASE_URL) warnings.push("HOSTED_AUTH_UNCONFIGURED");
  if (env.LAUNCH_INDEXING_APPROVED !== "true")
    warnings.push("INDEXING_DISABLED");
  return {
    stage,
    origin,
    errors: [...new Set(errors)],
    warnings,
    indexing:
      stage === "production" &&
      env.LAUNCH_INDEXING_APPROVED === "true" &&
      errors.length === 0,
  };
}
