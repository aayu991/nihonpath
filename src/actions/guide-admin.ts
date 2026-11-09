"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/platform/admin";
import { guideKinds, guideDraftSchemas } from "@/lib/guides/schema";
export async function saveGuideContent(input: unknown) {
  const admin = await getAdminContext();
  if (!admin) return { error: "Administrator required." };
  const parsed = z
    .object({
      kind: z.enum(guideKinds),
      id: z.uuid().nullable(),
      version: z.string().nullable(),
      document: z.string().max(100000),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid document." };
  let json: unknown;
  try {
    json = JSON.parse(parsed.data.document);
  } catch {
    return { error: "Enter a valid JSON object." };
  }
  const doc = guideDraftSchemas[parsed.data.kind].safeParse(json);
  if (!doc.success)
    return {
      error: doc.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 8)
        .join("; "),
    };
  const r = await admin.client.rpc("admin_guide_save", {
    p_kind: parsed.data.kind,
    p_id: parsed.data.id,
    p_expected: parsed.data.version,
    p_data: doc.data,
  });
  if (r.error)
    return {
      error:
        "Save failed. Check parent IDs and reload stale content. Your draft has been kept.",
    };
  revalidatePath("/", "layout");
  return { id: r.data };
}
export async function transitionGuideContent(input: unknown) {
  const admin = await getAdminContext();
  if (!admin) return { error: "Administrator required." };
  const parsed = z
    .object({
      kind: z.enum(guideKinds),
      id: z.uuid(),
      version: z.string(),
      action: z.enum([
        "request_review",
        "review_sources",
        "approve",
        "publish",
        "unpublish",
        "outdated",
      ]),
      notes: z.string().max(2000),
      attested: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid review request." };
  const p = parsed.data;
  if (
    ["review_sources", "approve", "outdated"].includes(p.action) &&
    (!p.attested || p.notes.trim().length < 10)
  )
    return {
      error:
        "Record review notes and confirm that you actually performed the review.",
    };
  const r = await admin.client.rpc("admin_guide_transition", {
    p_kind: p.kind,
    p_id: p.id,
    p_action: p.action,
    p_expected: p.version,
    p_notes: p.notes,
  });
  if (r.error)
    return {
      error:
        "Transition rejected. Check the current review state, source verification, parent publication and Japanese translation. Reload stale content before retrying.",
    };
  revalidatePath("/", "layout");
  return { ok: true };
}
