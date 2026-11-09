import type { Json } from "@/lib/supabase/database.types";
export function contentText(value: Json | undefined, key = "text"): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : "";
}
