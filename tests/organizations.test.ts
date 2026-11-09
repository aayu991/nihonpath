import { describe, it, expect } from "vitest";
import {
  organizationSchema,
  commandSchemas,
  isOrgAdmin,
  canTeach,
  toCsv,
  completion,
  reportSchema,
  organizationDate,
} from "@/lib/organizations/schema";
import { organizationMessageKey } from "@/lib/organizations/messages";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
import ne from "../messages/ne.json";
import hi from "../messages/hi.json";
describe("organization UI contracts", () => {
  it("assigns session dates to the organization timezone across month and year boundaries", () => {
    expect(organizationDate("2026-12-31T16:00:00Z", "Asia/Tokyo")).toBe(
      "2027-01-01",
    );
    expect(organizationDate("2026-12-31T16:00:00Z", "UTC")).toBe("2026-12-31");
  });
  it("translates every organization label into four languages", () => {
    for (const m of [ja, ne, hi])
      expect(Object.keys(m.Organization).sort()).toEqual(
        Object.keys(en.Organization).sort(),
      );
    expect(ne.Organization.attendance).not.toBe(en.Organization.attendance);
    expect(organizationMessageKey("untrusted")).toBe("invalid");
  });
  it("distinguishes management from assigned teacher and read-only employer roles", () => {
    expect(isOrgAdmin("learner")).toBe(false);
    expect(isOrgAdmin("owner")).toBe(true);
    expect(canTeach("instructor")).toBe(true);
    expect(canTeach("manager")).toBe(false);
  });
  it("validates organization types, contact information, timezone and safe logo protocols", () => {
    const value = {
      name: "Institute",
      kind: "institute",
      contact_email: "office@example.test",
      contact_phone: "",
      logo_url: "",
      preferred_language: "ne",
      timezone: "Asia/Tokyo",
    };
    expect(organizationSchema.safeParse(value).success).toBe(true);
    expect(
      organizationSchema.safeParse({
        ...value,
        logo_url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      organizationSchema.safeParse({ ...value, timezone: "invalid" }).success,
    ).toBe(false);
  });
  it("requires exactly one assignment target and a real calendar deadline", () => {
    const id = crypto.randomUUID(),
      v = { course_id: id, user_id: id, class_id: null, deadline: "" };
    expect(commandSchemas.assignment.safeParse(v).success).toBe(true);
    expect(
      commandSchemas.assignment.safeParse({ ...v, class_id: id }).success,
    ).toBe(false);
    expect(
      commandSchemas.assignment.safeParse({ ...v, user_id: null }).success,
    ).toBe(false);
    expect(
      commandSchemas.assignment.safeParse({ ...v, deadline: "2026-02-30" })
        .success,
    ).toBe(false);
  });
  it("bounds attendance batches and refuses a profile role as a sharing preference", () => {
    expect(
      commandSchemas.attendance.safeParse({
        id: crypto.randomUUID(),
        records: [],
      }).success,
    ).toBe(false);
    expect(
      commandSchemas.sharing.safeParse({ share_progress: true, role: "owner" })
        .success,
    ).toBe(false);
  });
  it("escapes CSV quotations, commas and spreadsheet formulas", () => {
    const csv = toCsv([["=1+1", "a,b", 'a"b', null]]);
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"a""b"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
  it("never turns unavailable or zero-denominator progress into fake completion", () => {
    const raw = {
      assignment_id: crypto.randomUUID(),
      course_id: crypto.randomUUID(),
      course_title: "Course",
      course_level: "n5",
      class_id: null,
      deadline: null,
      user_id: crypto.randomUUID(),
      display_name: "Learner",
      jlpt_level: "n5",
      sector_id: null,
      jft_preparing: false,
      share_progress: false,
      total_lessons: null,
      completed_lessons: null,
      practice: null,
      last_activity: null,
    };
    const r = reportSchema.parse(raw);
    expect(completion(r)).toBe(null);
    expect(completion({ ...r, total_lessons: 0, completed_lessons: 0 })).toBe(
      null,
    );
    expect(completion({ ...r, total_lessons: 4, completed_lessons: 1 })).toBe(
      25,
    );
  });
});
