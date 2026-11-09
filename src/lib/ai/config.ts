import "server-only";
export function aiConfig() {
  const enabled = process.env.AI_TUTOR_ENABLED === "true";
  const model = process.env.OPENAI_MODEL?.trim();
  const key = process.env.OPENAI_API_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  return {
    enabled,
    model,
    key,
    secret,
    live: !!(
      enabled &&
      model &&
      key &&
      secret &&
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
  };
}
export function estimatedCost(input: number, output: number): number | null {
  if (
    !process.env.OPENAI_INPUT_USD_PER_MILLION?.trim() ||
    !process.env.OPENAI_OUTPUT_USD_PER_MILLION?.trim()
  )
    return null;
  const a = Number(process.env.OPENAI_INPUT_USD_PER_MILLION),
    b = Number(process.env.OPENAI_OUTPUT_USD_PER_MILLION);
  return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0
    ? (input * a + output * b) / 1e6
    : null;
}
