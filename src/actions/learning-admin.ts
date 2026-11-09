"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/platform/admin";
import {
  learningKindSchema,
  learningSchemas,
} from "@/lib/learning/admin-validation";
import type { Json } from "@/lib/supabase/database.types";
export async function saveLearningDocument(input: unknown) {
  const parsed = z
    .object({
      kind: learningKindSchema,
      id: z.uuid().nullable(),
      version: z.string().nullable(),
      document: z.string().max(200000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const admin = await getAdminContext();
  if (!admin) return { ok: false, error: "Administrator access required" };
  let raw: unknown;
  try {
    raw = JSON.parse(parsed.data.document);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  const content = learningSchemas[parsed.data.kind].safeParse(raw);
  if (!content.success)
    return {
      ok: false,
      error: content.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  const prepMetadata =
    (parsed.data.kind === "bank" &&
      ("prep_category" in content.data || "prep_mode" in content.data)) ||
    (parsed.data.kind === "vocabulary" && "sector_id" in content.data) ||
    (parsed.data.kind === "deck" &&
      "cards" in content.data &&
      content.data.cards.some((c) => !!c.vocabulary_id));
  const { data, error } = await admin.client.rpc(
    prepMetadata ? "admin_prep_learning_save" : "admin_learning_save",
    {
      p_kind: parsed.data.kind,
      p_id: parsed.data.id,
      p_expected_updated_at: parsed.data.version,
      p_data: JSON.parse(JSON.stringify(content.data)) as Json,
    },
  );
  if (error || !data)
    return {
      ok: false,
      error:
        "Save failed. Reload stale content. If learners have used this bank/deck, save a new revision.",
    };
  revalidatePath("/", "layout");
  return { ok: true, id: data };
}
export async function reviewLearningDocument(input: unknown) {
  const parsed = z
    .object({
      kind: learningKindSchema,
      id: z.uuid(),
      version: z.string(),
      action: z.enum(["request_review", "approve", "publish", "unpublish"]),
    })
    .safeParse(input);
  if (!parsed.success) return false;
  const admin = await getAdminContext();
  if (!admin) return false;
  const { error } = await admin.client.rpc("admin_learning_review", {
    p_kind: parsed.data.kind,
    p_id: parsed.data.id,
    p_expected_updated_at: parsed.data.version,
    p_action: parsed.data.action,
  });
  if (!error) revalidatePath("/", "layout");
  return !error;
}
