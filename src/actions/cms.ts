"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCmsContext } from "@/lib/cms/server";
import { cmsKind, cmsRoles, parseCmsDocument } from "@/lib/cms/schema";
import type { Json } from "@/lib/supabase/database.types";
import { parseVocabularyCsv } from "@/lib/cms/csv";
import { operationsClient } from "@/lib/launch/server";
export type CmsResult = { ok: boolean; id?: string; error?: string };
export async function setAccountSuspension(input: unknown): Promise<CmsResult> {
  const ctx = await getCmsContext();
  if (!ctx?.permissions.users)
    return { ok: false, error: "Super Admin required." };
  const p = z
    .object({
      user: z.uuid(),
      suspend: z.boolean(),
      confirmed: z.literal(true),
    })
    .safeParse(input);
  if (!p.success)
    return { ok: false, error: "Explicit confirmation required." };
  if (!process.env.SUPABASE_SECRET_KEY)
    return {
      ok: false,
      error:
        "Account operations are disabled until server Auth administration credentials are configured.",
    };
  const action = p.data.suspend ? "suspend" : "restore";
  const check = await ctx.client.rpc("cms_user_operation", {
    p_user: p.data.user,
    p_action: `${action}_requested`,
  });
  if (check.error)
    return {
      ok: false,
      error: "Protected account or insufficient permissions.",
    };
  try {
    const result = await operationsClient().auth.admin.updateUserById(
      p.data.user,
      { ban_duration: p.data.suspend ? "720h" : "none" },
    );
    if (result.error) {
      await ctx.client.rpc("cms_user_operation", {
        p_user: p.data.user,
        p_action: "auth_operation_failed",
      });
      return { ok: false, error: "Auth provider rejected this operation." };
    }
    await ctx.client.rpc("cms_user_operation", {
      p_user: p.data.user,
      p_action: `${action}_completed`,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Auth operation could not be confirmed. Refresh account status before retrying.",
    };
  }
}
export async function updateCmsMedia(input: unknown): Promise<CmsResult> {
  const ctx = await getCmsContext();
  if (!ctx?.permissions.edit) return { ok: false, error: "Editor required." };
  const p = z
    .object({
      id: z.uuid(),
      action: z.enum(["rename", "approve", "archive", "delete"]),
      title: z.string().max(180).default(""),
      notes: z.string().max(2000).default(""),
      confirmed: z.boolean().default(false),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid media action." };
  if (p.data.action === "delete") {
    if (!ctx.permissions.publish || !p.data.confirmed)
      return {
        ok: false,
        error:
          "Publisher permission and explicit deletion confirmation required.",
      };
    if (!process.env.SUPABASE_SECRET_KEY)
      return {
        ok: false,
        error: "Storage administration credentials are not configured.",
      };
    try {
      const service = operationsClient(60000);
      const prepared = await service.rpc("cms_media_prepare_delete", {
        p_actor: ctx.user.id,
        p_id: p.data.id,
      });
      if (prepared.error || !prepared.data)
        return {
          ok: false,
          error:
            "Deletion rejected. Remove draft and published associations first.",
        };
      const removed = await service.storage
        .from("cms-education")
        .remove([prepared.data]);
      await service.rpc("cms_media_delete_result", {
        p_actor: ctx.user.id,
        p_id: p.data.id,
        p_success: !removed.error,
      });
      if (removed.error)
        return {
          ok: false,
          error:
            "Access was revoked, but Storage deletion failed. Retry after checking provider status.",
        };
      revalidatePath("/", "layout");
      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          "Storage deletion could not be confirmed. Reload before retrying.",
      };
    }
  }
  const { error } = await ctx.client.rpc("cms_media_update", {
    p_id: p.data.id,
    p_action: p.data.action,
    p_title: p.data.title,
    p_notes: p.data.notes,
  });
  if (error)
    return {
      ok: false,
      error:
        "Media action rejected. Approval needs publisher permission and review notes. Referenced assets cannot be archived.",
    };
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function importVocabulary(input: unknown) {
  const ctx = await getCmsContext();
  if (!ctx?.permissions.edit) return { error: "Editor required." };
  const p = z
    .object({
      course: z.uuid(),
      csv: z.string().max(250000),
      preview: z.boolean(),
    })
    .safeParse(input);
  if (!p.success) return { error: "Invalid import." };
  try {
    const rows = parseVocabularyCsv(p.data.csv, p.data.course);
    const { data, error } = await ctx.client.rpc("cms_import_vocabulary", {
      p_course: p.data.course,
      p_rows: rows as Json,
      p_preview: p.data.preview,
    });
    if (error)
      return {
        error:
          "Import rejected. Check duplicate rows, Japanese readings and required fields.",
      };
    if (!p.data.preview) revalidatePath("/", "layout");
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid CSV." };
  }
}
export async function saveCms(input: unknown): Promise<CmsResult> {
  const ctx = await getCmsContext();
  if (!ctx?.permissions.edit)
    return { ok: false, error: "Editing permission required." };
  const p = z
    .object({
      kind: cmsKind,
      id: z.uuid().nullable(),
      version: z.number().int().min(0),
      base: z.string().nullable(),
      document: z.string().max(200000),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid request." };
  let raw: unknown;
  try {
    raw = JSON.parse(p.data.document);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
  const doc = parseCmsDocument(p.data.kind, raw);
  if (!doc.success)
    return {
      ok: false,
      error: doc.error.issues
        .slice(0, 6)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  const { data, error } = await ctx.client.rpc("cms_save", {
    p_kind: p.data.kind,
    p_id: p.data.id,
    p_version: p.data.version,
    p_base: p.data.base,
    p_document: JSON.parse(JSON.stringify(doc.data)) as Json,
  });
  if (error || !data)
    return {
      ok: false,
      error:
        "Save rejected. Reload stale content, check references and remove unsafe markup. Your text remains in this editor.",
    };
  revalidatePath("/", "layout");
  return { ok: true, id: data };
}
export async function transitionCms(input: unknown): Promise<CmsResult> {
  const ctx = await getCmsContext();
  if (!ctx) return { ok: false, error: "CMS access required." };
  const p = z
    .object({
      kind: cmsKind,
      id: z.uuid(),
      version: z.number().int(),
      action: z.enum([
        "submit",
        "approve",
        "reject",
        "publish",
        "unpublish",
        "archive",
        "delete",
        "schedule",
      ]),
      notes: z.string().max(2000).default(""),
      when: z.iso.datetime().nullable().default(null),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid transition." };
  const d = p.data;
  const { error } = await ctx.client.rpc("cms_transition", {
    p_kind: d.kind,
    p_id: d.id,
    p_version: d.version,
    p_action: d.action,
    p_notes: d.notes,
    p_when: d.when,
  });
  if (error)
    return {
      ok: false,
      error:
        "Transition rejected. Check your permissions, current version, parent publication and independent review. Review notes need at least 10 characters.",
    };
  revalidatePath("/", "layout");
  return { ok: true, id: d.id };
}
export async function restoreCms(input: unknown): Promise<CmsResult> {
  const ctx = await getCmsContext();
  if (!ctx?.permissions.edit) return { ok: false, error: "Editor required." };
  const p = z
    .object({
      kind: cmsKind,
      id: z.uuid(),
      version: z.number().int(),
      revision: z.number().int().positive(),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid revision." };
  const d = p.data;
  const { error } = await ctx.client.rpc("cms_restore", {
    p_kind: d.kind,
    p_id: d.id,
    p_version: d.version,
    p_revision: d.revision,
  });
  if (error)
    return { ok: false, error: "Restore failed. Reload this revision." };
  revalidatePath("/", "layout");
  return { ok: true, id: d.id };
}
export async function assignCmsRole(input: unknown): Promise<CmsResult> {
  const ctx = await getCmsContext();
  if (!ctx?.permissions.users)
    return { ok: false, error: "Super Admin required." };
  const p = z
    .object({ user: z.uuid(), role: z.enum(cmsRoles).nullable() })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid assignment." };
  const { error } = await ctx.client.rpc("cms_assign_role", {
    p_user: p.data.user,
    p_role: p.data.role,
  });
  if (error)
    return {
      ok: false,
      error:
        "Assignment rejected. Use a separate verified account; legacy allowlist changes require the database owner.",
    };
  revalidatePath("/", "layout");
  return { ok: true };
}
