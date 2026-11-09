"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { createClient } from "@/lib/supabase/server";
import {
  applicationSchema,
  manageSchemas,
  bookingActions,
  meetingSchema,
  slotsSchema,
  timezoneSchema,
} from "@/lib/tutors/schema";
async function client() {
  return (await getCurrentUser()) ? await createClient() : null;
}
function error(message: string) {
  return /Stale|Conflicting retry/.test(message)
    ? "stale"
    : /Slot unavailable|Overlapping|Closed request/.test(message)
      ? "slotGone"
      : /Paid booking/.test(message)
        ? "paidUnavailable"
        : /request limit/.test(message)
          ? "limit"
          : "saveError";
}
function refresh() {
  revalidatePath("/", "layout");
}
export async function saveTutorApplication(
  input: unknown,
  expected: string | null,
  submit = false,
) {
  const p = applicationSchema.safeParse(input);
  if (!p.success || typeof submit !== "boolean") return { error: "invalid" };
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_application_save", {
    p_data: p.data,
    p_expected: expected,
    p_submit: submit,
  });
  if (r.error) return { error: error(r.error.message) };
  refresh();
  return { ok: true };
}
export async function submitTutorApplication(expected: string) {
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_application_submit", { p_expected: expected });
  if (r.error) return { error: error(r.error.message) };
  refresh();
  return { ok: true };
}
export async function manageTutor(
  action: keyof typeof manageSchemas,
  input: unknown,
) {
  if (!Object.hasOwn(manageSchemas, action)) return { error: "invalid" };
  const p = manageSchemas[action].safeParse(input);
  if (!p.success) return { error: "invalid" };
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_manage", { p_action: action, p_data: p.data });
  if (r.error) return { error: error(r.error.message) };
  refresh();
  return { ok: true };
}
export async function loadTutorSlots(input: unknown) {
  const p = z
    .object({
      tutor: z.uuid(),
      type: z.uuid(),
      day: z.iso.date(),
      timezone: timezoneSchema,
    })
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  const c = await createClient();
  if (!c) return { error: "unavailable" };
  const r = await c.rpc("tutor_local_slots", {
    p_tutor: p.data.tutor,
    p_type: p.data.type,
    p_day: p.data.day,
    p_zone: p.data.timezone,
  });
  const data = slotsSchema.safeParse(r.data);
  return r.error || !data.success
    ? { error: "unavailable" }
    : { slots: data.data };
}
export async function requestTutorBooking(input: unknown) {
  const p = z
    .object({
      id: z.uuid(),
      tutor: z.uuid(),
      type: z.uuid(),
      start: z.iso.datetime({ offset: true }),
      goals: z.string().max(2000),
    })
    .strict()
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_request_booking", {
    p_id: p.data.id,
    p_tutor: p.data.tutor,
    p_type: p.data.type,
    p_start: p.data.start,
    p_goals: p.data.goals,
  });
  if (r.error) return { error: error(r.error.message) };
  refresh();
  return { id: r.data };
}
export async function tutorBookingAction(input: unknown) {
  const p = z
    .object({
      id: z.uuid(),
      action: z.enum(bookingActions),
      expected: z.string(),
      text: z.string().max(3000),
    })
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  if (
    p.data.action === "meeting" &&
    !meetingSchema.safeParse(p.data.text).success
  )
    return { error: "invalid" };
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_booking_action", {
    p_booking: p.data.id,
    p_action: p.data.action,
    p_expected: p.data.expected,
    p_data: { reason: p.data.text, url: p.data.text, note: p.data.text },
  });
  if (r.error) return { error: error(r.error.message) };
  refresh();
  return { ok: true };
}
export async function writeTutorReview(input: unknown) {
  const p = z
    .object({
      booking: z.uuid(),
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_write_review", {
    p_booking: p.data.booking,
    p_rating: p.data.rating,
    p_body: p.data.body,
  });
  if (r.error) return { error: "saveError" };
  refresh();
  return { ok: true };
}
export async function respondTutorReview(id: string, response: string) {
  if (!z.uuid().safeParse(id).success || response.trim().length > 2000)
    return { error: "invalid" };
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_review_response", {
    p_review: id,
    p_response: response,
  });
  if (r.error) return { error: "saveError" };
  refresh();
  return { ok: true };
}
export async function reportTutorContent(input: unknown) {
  const p = z
    .object({
      kind: z.enum(["profile", "booking", "review"]),
      target: z.uuid(),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  const c = await client();
  if (!c) return { error: "session" };
  const r = await c.rpc("tutor_report", {
    p_kind: p.data.kind,
    p_target: p.data.target,
    p_reason: p.data.reason,
  });
  return r.error ? { error: "saveError" } : { ok: true };
}
export async function reviewTutorApplication(input: unknown) {
  const p = z
    .object({
      tutor: z.uuid(),
      action: z.enum([
        "under_review",
        "approved",
        "rejected",
        "suspended",
        "verification",
      ]),
      expected: z.string(),
      notes: z.string().trim().min(10).max(4000),
      verified: z.boolean(),
      summary: z.string().max(2000),
      attested: z.boolean(),
    })
    .safeParse(input);
  if (!p.success || (p.data.verified && !p.data.attested))
    return { error: "invalid" };
  const a = await getAdminContext();
  if (!a) return { error: "forbidden" };
  const r = await a.client.rpc("tutor_admin_review", {
    p_tutor: p.data.tutor,
    p_action: p.data.action,
    p_expected: p.data.expected,
    p_notes: p.data.notes,
    p_verified: p.data.verified,
    p_summary: p.data.summary,
  });
  if (r.error) return { error: error(r.error.message) };
  refresh();
  return { ok: true };
}
export async function moderateTutorContent(input: unknown) {
  const p = z
    .object({
      kind: z.enum(["review", "report", "booking"]),
      id: z.uuid(),
      action: z.enum(["published", "hidden", "resolved", "cancelled"]),
      notes: z.string().trim().min(10).max(4000),
    })
    .safeParse(input);
  if (!p.success) return { error: "invalid" };
  const a = await getAdminContext();
  if (!a) return { error: "forbidden" };
  const r = await a.client.rpc("tutor_moderate", {
    p_kind: p.data.kind,
    p_id: p.data.id,
    p_action: p.data.action,
    p_notes: p.data.notes,
  });
  if (r.error) return { error: "saveError" };
  refresh();
  return { ok: true };
}
export async function purgeTutorPrivate() {
  const a = await getAdminContext();
  if (!a) return { error: "forbidden" };
  const r = await a.client.rpc("tutor_purge_private");
  return r.error ? { error: "saveError" } : { ok: true };
}
