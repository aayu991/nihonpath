"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminContext } from "@/lib/platform/admin";
import {
  contentKindSchema,
  contentSchemas,
  contentActionSchema,
} from "@/lib/platform/validation";
import { localeSchema } from "@/lib/auth/validation";
import type { Json } from "@/lib/supabase/database.types";
export type ContentState = {
  error?: "accessDenied" | "contentError" | "stateError";
};
export async function saveContent(
  kindInput: string,
  localeInput: string,
  _state: ContentState,
  form: FormData,
): Promise<ContentState> {
  const locale = localeSchema.parse(localeInput);
  const kind = contentKindSchema.parse(kindInput);
  const admin = await getAdminContext();
  if (!admin) return { error: "accessDenied" };
  const parsed = contentSchemas[kind].safeParse(Object.fromEntries(form));
  const id = z.union([z.uuid(), z.literal("")]).safeParse(form.get("id") ?? "");
  const version = z
    .union([z.iso.datetime({ offset: true }), z.literal("")])
    .safeParse(form.get("expected_updated_at") ?? "");
  if (!parsed.success || !id.success || !version.success)
    return { error: "contentError" };
  let resultId: string | null = null;
  try {
    const { data, error } = await admin.client.rpc("admin_save_content", {
      p_kind: kind,
      p_id: id.data || null,
      p_expected_updated_at: version.data || null,
      p_data: JSON.parse(JSON.stringify(parsed.data)) as Json,
    });
    if (error || !data) return { error: "contentError" };
    resultId = data;
  } catch {
    return { error: "contentError" };
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/content/${kind}?id=${resultId}&saved=1`);
}
export async function reviewContent(
  kindInput: string,
  localeInput: string,
  _state: ContentState,
  form: FormData,
): Promise<ContentState> {
  const locale = localeSchema.parse(localeInput);
  const kind = contentKindSchema.parse(kindInput);
  const admin = await getAdminContext();
  if (!admin) return { error: "accessDenied" };
  const parsed = z
    .object({
      id: z.uuid(),
      expected_updated_at: z.iso.datetime({ offset: true }),
      action: contentActionSchema,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "stateError" };
  try {
    const { error } = await admin.client.rpc("admin_review_content", {
      p_kind: kind,
      p_id: parsed.data.id,
      p_action: parsed.data.action,
      p_expected_updated_at: parsed.data.expected_updated_at,
    });
    if (error) return { error: "stateError" };
  } catch {
    return { error: "stateError" };
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/content/${kind}?id=${parsed.data.id}&reviewed=1`);
}
