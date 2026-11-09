"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { guidePreferencesSchema, progressSchema } from "@/lib/guides/schema";
export async function saveGuidePreferences(input: unknown) {
  const data = guidePreferencesSchema.safeParse(input),
    user = await getCurrentUser();
  if (!user || !data.success) return { error: "session" };
  const client = await createClient();
  if (!client) return { error: "unavailable" };
  const result = await client.rpc("set_guide_preferences", {
    p_data: data.data,
  });
  if (result.error) return { error: "unavailable" };
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function saveGuideProgress(input: unknown) {
  const data = progressSchema
      .extend({ expected: z.string().nullable() })
      .safeParse(input),
    user = await getCurrentUser();
  if (!user || !data.success) return { error: "invalid" };
  const client = await createClient();
  if (!client) return { error: "unavailable" };
  const v = data.data;
  const result = await client.rpc("save_guide_item", {
    p_item: v.itemId,
    p_completed: v.completed,
    p_notes: v.notes,
    p_due: v.dueDate,
    p_expected: v.expected,
  });
  if (result.error)
    return {
      error: result.error.message.includes("Stale") ? "stale" : "unavailable",
    };
  const parsed = z
    .object({
      item_id: z.uuid(),
      completed: z.boolean(),
      notes: z.string(),
      due_date: z.string().nullable(),
      item_version: z.number(),
      updated_at: z.string(),
    })
    .safeParse(result.data);
  if (!parsed.success) return { error: "unavailable" };
  return { data: parsed.data };
}
export async function sendArticleFeedback(input: unknown) {
  const parsed = z
      .object({
        articleId: z.uuid(),
        kind: z.enum(["helpful", "unclear", "outdated"]),
        notes: z.string().max(1000),
      })
      .safeParse(input),
    user = await getCurrentUser();
  if (!user || !parsed.success) return { error: "session" };
  const client = await createClient();
  if (!client) return { error: "unavailable" };
  const r = await client.rpc("submit_guide_feedback", {
    p_article: parsed.data.articleId,
    p_kind: parsed.data.kind,
    p_notes: parsed.data.notes,
  });
  return r.error ? { error: "unavailable" } : { ok: true };
}
