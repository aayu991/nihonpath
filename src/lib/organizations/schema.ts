import { z } from "zod";
export const orgRoles = [
  "owner",
  "administrator",
  "instructor",
  "manager",
  "learner",
  "platform_admin",
] as const;
export const organizationSchema = z.object({
  name: z.string().trim().min(1).max(180),
  kind: z.enum(["institute", "employer", "ssw_center", "training_provider"]),
  contact_email: z.union([z.email().max(254), z.literal("")]),
  contact_phone: z.string().max(60),
  logo_url: z.union([
    z
      .url()
      .max(2000)
      .refine((v) => v.startsWith("https://")),
    z.literal(""),
  ]),
  preferred_language: z.enum(["en", "ja", "ne", "hi"]),
  timezone: z.enum(["Asia/Tokyo", "Asia/Kathmandu", "Asia/Kolkata", "UTC"]),
});
export type OrganizationInput = z.infer<typeof organizationSchema>;
const id = z.uuid(),
  str = z.string();
export const choicesSchema = z.array(
  z.object({ id, name: str, kind: str, role: z.enum(orgRoles) }),
);
const member = z.object({
  user_id: id,
  role: z.enum(orgRoles),
  status: z.enum(["active", "inactive"]),
  display_name: str,
  share_progress: z.boolean(),
  jlpt_level: str,
  jft_preparing: z.boolean(),
  sector_id: id.nullable(),
});
const classroom = z.object({ id, title: str, schedule: str, updated_at: str });
const session = z.object({ id, class_id: id, title: str, starts_at: str });
const attendance = z.object({
  session_id: id,
  student_id: id,
  status: z.enum(["present", "absent", "late", "excused"]),
  updated_at: str,
});
export const reportSchema = z.object({
  assignment_id: id,
  course_id: id,
  course_title: str,
  course_level: str,
  class_id: id.nullable(),
  deadline: str.nullable(),
  user_id: id,
  display_name: str,
  jlpt_level: str,
  sector_id: id.nullable(),
  jft_preparing: z.boolean(),
  share_progress: z.boolean(),
  total_lessons: z.number().nullable(),
  completed_lessons: z.number().nullable(),
  practice: z
    .array(
      z.object({
        score: z.number(),
        total: z.number(),
        created_at: str,
        subject: str,
      }),
    )
    .nullable(),
  last_activity: str.nullable(),
});
export const workspaceSchema = z.object({
  organization: organizationSchema.extend({ id }),
  role: z.enum(orgRoles),
  user_id: id,
  members: z.array(member),
  classes: z.array(classroom),
  teachers: z.array(z.object({ class_id: id, user_id: id })),
  enrollments: z.array(z.object({ class_id: id, user_id: id })),
  sessions: z.array(session),
  attendance: z.array(attendance),
  assignments: z.array(
    z.object({
      id,
      course_id: id,
      course_title: str,
      class_id: id.nullable(),
      learner_id: id.nullable(),
      deadline: str.nullable(),
    }),
  ),
  reports: z.array(reportSchema),
  invitations: z.array(
    z.object({
      id,
      email: str,
      role: str,
      expires_at: str,
      accepted_at: str.nullable(),
      revoked_at: str.nullable(),
    }),
  ),
  reminders: z.array(z.object({ id, assignment_id: id, created_at: str })),
  audit: z.array(
    z.object({
      id,
      action: str,
      entity_id: id.nullable(),
      created_at: str,
      detail: z.unknown(),
    }),
  ),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export type Report = z.infer<typeof reportSchema>;
export const commandSchemas = {
  settings: organizationSchema,
  sharing: z.object({ share_progress: z.boolean() }).strict(),
  member: z.object({
    user_id: id,
    role: z.enum(["administrator", "instructor", "manager", "learner"]),
    status: z.enum(["active", "inactive"]),
    jlpt_level: z.enum(["n5", "n4", "n3", "n2", "n1"]),
    jft_preparing: z.boolean(),
    sector_id: z.union([id, z.literal("")]),
  }),
  revoke_invite: z.object({ id }),
  class: z.object({
    id: id.nullable(),
    title: z.string().trim().min(1).max(180),
    schedule: z.string().max(1000),
    expected: str.nullable(),
  }),
  teacher: z.object({ class_id: id, user_id: id, remove: z.boolean() }),
  enroll: z.object({ class_id: id, user_id: id, remove: z.boolean() }),
  session: z.object({
    class_id: id,
    title: z.string().trim().min(1).max(180),
    starts_at: z.iso.datetime({ offset: true }),
  }),
  attendance: z.object({
    id,
    records: z
      .array(
        z.object({
          user_id: id,
          status: z.enum(["present", "absent", "late", "excused"]),
          expected: str.nullable(),
        }),
      )
      .min(1)
      .max(500),
  }),
  assignment: z
    .object({
      course_id: id,
      class_id: id.nullable(),
      user_id: id.nullable(),
      deadline: z.union([z.iso.date(), z.literal("")]),
    })
    .refine((v) => !!v.class_id !== !!v.user_id),
  remind: z.object({ id }),
};
export type OrgAction = keyof typeof commandSchemas;
export function isOrgAdmin(role: string) {
  return ["owner", "administrator", "platform_admin"].includes(role);
}
export function canTeach(role: string) {
  return isOrgAdmin(role) || role === "instructor";
}
export function csvCell(value: unknown) {
  return (
    '"' +
    String(value ?? "")
      .replace(/^(?:[\s\uFEFF]*[=+@\-]|[\t\r\n])/, "'$&")
      .replaceAll('"', '""') +
    '"'
  );
}
export function toCsv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function completion(r: Report) {
  return r.total_lessons && r.completed_lessons !== null
    ? Math.round((100 * r.completed_lessons) / r.total_lessons)
    : null;
}
export function organizationDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
