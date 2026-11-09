export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}
export function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SITE_URL");
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Invalid site URL");
  return parsed.origin;
}
