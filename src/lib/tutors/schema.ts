import { z } from "zod";
export const specialties = [
  "jlpt",
  "jft",
  "business",
  "workplace",
  "interviews",
  "conversation",
  "grammar",
  "pronunciation",
  "industry",
] as const;
export const levels = ["n5", "n4", "n3", "n2", "n1"] as const;
export const currencies = ["JPY", "USD", "NPR", "INR"] as const;
export const durations = [25, 30, 45, 50, 60] as const;
export const zones = [
  "UTC",
  "Asia/Tokyo",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
];
export const timezoneSchema = z
  .string()
  .max(100)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  });
export const safeHttps = z.union([
  z.literal(""),
  z
    .url()
    .max(2000)
    .refine((v) => {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password && !u.port;
    }),
]);
export const meetingSchema = z
  .url()
  .max(2000)
  .refine((v) => {
    const u = new URL(v);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (u.hostname === "meet.google.com" ||
        u.hostname === "zoom.us" ||
        u.hostname.endsWith(".zoom.us") ||
        ["teams.microsoft.com", "teams.live.com"].includes(u.hostname))
    );
  });
export const applicationSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  photo_url: safeHttps,
  languages: z
    .array(
      z.enum([
        "ja",
        "en",
        "ne",
        "hi",
        "zh",
        "ko",
        "es",
        "fr",
        "de",
        "vi",
        "id",
        "th",
      ]),
    )
    .min(1)
    .max(10),
  country: z.string().trim().min(2).max(80),
  timezone: timezoneSchema,
  specialties: z.array(z.enum(specialties)).min(1).max(10),
  levels: z.array(z.enum(levels)).min(1).max(5),
  experience_years: z.number().int().min(0).max(80),
  biography: z.string().trim().min(50).max(4000),
  video_url: safeHttps,
  credentials: z.string().max(4000),
  durations: z
    .array(z.union(durations.map((v) => z.literal(v))))
    .min(1)
    .max(5),
  proposed_price_minor: z.number().int().min(0).max(10000000),
  currency: z.enum(currencies),
});
const id = z.uuid(),
  str = z.string(),
  nullable = str.nullable();
export const applicationRowSchema = applicationSchema.extend({
  user_id: id,
  status: z.enum([
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "suspended",
  ]),
  review_notes: str,
  updated_at: str,
});
export const lessonSchema = z.object({
  id,
  tutor_id: id,
  title: str,
  specialty: str,
  duration_minutes: z.number(),
  price_minor: z.number(),
  currency: z.enum(currencies),
  published: z.boolean(),
});
export const reviewSchema = z.object({
  id,
  rating: z.number().int().min(1).max(5),
  body: str,
  response: str,
  created_at: str,
});
export const publicTutorSchema = z.object({
  user_id: id,
  slug: str,
  display_name: str,
  photo_url: str,
  languages: z.array(str),
  country: str,
  timezone: str,
  specialties: z.array(str),
  levels: z.array(str),
  experience_years: z.number(),
  biography: str,
  video_url: str,
  qualification_summary: str,
  qualifications_verified: z.boolean(),
  notice_hours: z.number(),
  horizon_days: z.number(),
  published: z.boolean(),
  lesson_types: z.array(lessonSchema),
  reviews: z.array(reviewSchema),
});
export const catalogSchema = z.array(publicTutorSchema);
export type Tutor = z.infer<typeof publicTutorSchema>;
export const bookingSchema = z.object({
  id,
  learner_id: id,
  tutor_id: id,
  lesson_type_id: id.nullable(),
  lesson_title: str,
  duration_minutes: z.number().nullable(),
  price_minor: z.number().nullable(),
  currency: nullable,
  starts_at: str,
  ends_at: str,
  status: z.enum([
    "pending",
    "confirmed",
    "declined",
    "cancelled",
    "completed",
    "no_show",
  ]),
  learning_goals: str,
  request_expires_at: nullable,
  cancellation_requested_at: nullable,
  learner_completed_at: nullable,
  tutor_completed_at: nullable,
  status_reason: str,
  updated_at: str,
  tutor_name: str,
  learner_name: str,
  meeting_url: nullable,
  private_note: str,
  reviewed: z.boolean(),
});
export type Booking = z.infer<typeof bookingSchema>;
export const workspaceSchema = z.object({
  user_id: id,
  application: applicationRowSchema.nullable(),
  profile: publicTutorSchema
    .omit({ lesson_types: true, reviews: true })
    .nullable(),
  lesson_types: z.array(lessonSchema),
  rules: z.array(
    z.object({ id, weekday: z.number(), start_time: str, end_time: str }),
  ),
  exceptions: z.array(
    z.object({
      id,
      kind: z.enum(["available", "blocked"]),
      starts_at: str,
      ends_at: str,
    }),
  ),
  bookings: z.array(bookingSchema),
  reviews: z.array(
    reviewSchema.extend({
      booking_id: id,
      tutor_id: id,
      learner_id: id,
      moderation_status: str,
    }),
  ),
});
export type TutorWorkspace = z.infer<typeof workspaceSchema>;
export const slotsSchema = z.array(z.object({ starts_at: str, ends_at: str }));
export const adminWorkspaceSchema = z.object({
  applications: z.array(applicationRowSchema),
  reviews: z.array(
    reviewSchema.extend({
      booking_id: id,
      tutor_id: id,
      learner_id: id,
      moderation_status: str,
    }),
  ),
  reports: z.array(
    z.object({
      id,
      reason: str,
      status: str,
      tutor_id: id.nullable(),
      booking_id: id.nullable(),
      review_id: id.nullable(),
    }),
  ),
  bookings: z.array(
    z.object({ id, tutor_id: id, status: str, starts_at: str, ends_at: str }),
  ),
  logs: z.array(z.object({ id, action: str, notes: str, created_at: str })),
});
export type TutorAdminWorkspace = z.infer<typeof adminWorkspaceSchema>;
export const manageSchemas = {
  settings: z.object({
    timezone: timezoneSchema,
    notice_hours: z.number().int().min(0).max(168),
    horizon_days: z.number().int().min(7).max(90),
    published: z.boolean(),
  }),
  lesson: z.object({
    id: id.nullable(),
    title: z.string().trim().min(1).max(160),
    specialty: z.enum(specialties),
    duration_minutes: z.union(durations.map((v) => z.literal(v))),
    price_minor: z.number().int().min(0).max(10000000),
    currency: z.enum(currencies),
    published: z.boolean(),
  }),
  rule: z
    .object({
      weekday: z.number().int().min(0).max(6),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .refine((v) => v.end_time > v.start_time),
  exception: z
    .object({
      kind: z.enum(["available", "blocked"]),
      starts_at: z.iso.datetime({ offset: true }),
      ends_at: z.iso.datetime({ offset: true }),
    })
    .refine((v) => new Date(v.ends_at) > new Date(v.starts_at)),
  remove_rule: z.object({ id }),
  remove_exception: z.object({ id }),
};
export const bookingActions = [
  "confirm",
  "decline",
  "cancel",
  "request_cancel",
  "complete",
  "no_show",
  "meeting",
  "note",
] as const;
export function money(minor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    minor / (currency === "JPY" ? 1 : 100),
  );
}
export function lessonTime(value: string, zone: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).format(new Date(value));
}
export function tutorRating(t: Tutor) {
  return t.reviews.length
    ? t.reviews.reduce((n, r) => n + r.rating, 0) / t.reviews.length
    : null;
}
export function priceMinor(value: unknown, currency: unknown) {
  const text = String(value ?? ""),
    factor = currency === "JPY" ? 1 : 100;
  if (
    !new RegExp(
      factor === 1 ? "^\\d{1,8}(?:\\.0{1,2})?$" : "^\\d{1,6}(\\.\\d{1,2})?$",
    ).test(text)
  )
    return NaN;
  const [whole, fraction = ""] = text.split(".");
  return (
    Number(whole) * factor +
    (factor === 1 ? 0 : Number(fraction.padEnd(2, "0")))
  );
}
export function tutorDay(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function compatibleHours(
  start: string,
  end: string,
  zone: string,
  earliest: number,
  latest: number,
) {
  if (
    !timezoneSchema.safeParse(zone).success ||
    earliest < 0 ||
    latest > 24 ||
    earliest >= latest
  )
    return false;
  const minute = (value: string) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value));
    return (
      Number(parts.find((p) => p.type === "hour")?.value) * 60 +
      Number(parts.find((p) => p.type === "minute")?.value)
    );
  };
  return (
    minute(start) >= earliest * 60 &&
    minute(end) + (tutorDay(start, zone) !== tutorDay(end, zone) ? 1440 : 0) <=
      latest * 60
  );
}
