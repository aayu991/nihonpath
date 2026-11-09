"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/platform/admin";
import { supportSchema } from "@/lib/launch/schema";
export async function submitSupport(input: unknown) {
  if (!(await getCurrentUser())) return { error: "signIn" };
  const p = supportSchema.safeParse(input);
  if (!p.success) return { error: "invalid" };
  const c = await createClient();
  if (!c) return { error: "unavailable" };
  const r = await c.rpc("support_submit", {
    p_id: p.data.id,
    p_category: p.data.category,
    p_subject: p.data.subject,
    p_body: p.data.body,
  });
  if (r.error)
    return {
      error: r.error.message.includes("limit") ? "limit" : "unavailable",
    };
  revalidatePath("/[locale]/contact", "page");
  return { saved: true };
}
export async function reviewSupport(input: unknown) {
  const a = await getAdminContext();
  if (!a) return { error: "forbidden" };
  const p = z
    .object({
      id: z.uuid(),
      status: z.enum(["open", "in_review", "resolved"]),
      expected: z.iso.datetime({ offset: true }),
    })
    .strict()
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  const r = await a.client.rpc("support_review", {
    p_id: p.data.id,
    p_status: p.data.status,
    p_expected: p.data.expected,
  });
  if (r.error) return { error: "unavailable" };
  revalidatePath("/[locale]/admin/operations", "page");
  return { saved: true };
}
export async function saveNotificationPreferences(input: unknown) {
  if (!(await getCurrentUser())) return { error: "signIn" };
  const p = z
    .object({ learning: z.boolean(), renewal: z.boolean() })
    .strict()
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  const c = await createClient();
  if (!c) return { error: "unavailable" };
  const r = await c.rpc("notification_preferences_save", {
    p_learning: p.data.learning,
    p_renewal: p.data.renewal,
  });
  return r.error ? { error: "unavailable" } : { saved: true };
}
