import { describe, it, expect } from "vitest";
import {
  applicationSchema,
  timezoneSchema,
  safeHttps,
  meetingSchema,
  manageSchemas,
  priceMinor,
  money,
  lessonTime,
  compatibleHours,
  tutorRating,
  type Tutor,
} from "@/lib/tutors/schema";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
import ne from "../messages/ne.json";
import hi from "../messages/hi.json";
describe("tutor marketplace contracts", () => {
  it("provides all interface labels in four languages", () => {
    for (const m of [ja, ne, hi])
      expect(Object.keys(m.Tutor).sort()).toEqual(Object.keys(en.Tutor).sort());
    expect(ne.Tutor.book).not.toBe(en.Tutor.book);
    expect(hi.Tutor.calendar).not.toBe(en.Tutor.calendar);
  });
  it("requires substantial application content and strips forged approval fields", () => {
    const v = {
      display_name: "Tutor",
      photo_url: "",
      languages: ["ja", "en"],
      country: "Japan",
      timezone: "Asia/Tokyo",
      specialties: ["jlpt"],
      levels: ["n5"],
      experience_years: 1,
      biography:
        "Original teaching introduction describing a useful approach to Japanese learning.",
      video_url: "",
      credentials: "",
      durations: [30],
      proposed_price_minor: 0,
      currency: "JPY",
      status: "approved",
      qualifications_verified: true,
    };
    const p = applicationSchema.parse(v);
    expect(p).not.toHaveProperty("status");
    expect(p).not.toHaveProperty("qualifications_verified");
    expect(
      applicationSchema.safeParse({ ...v, biography: "Short" }).success,
    ).toBe(false);
    expect(applicationSchema.safeParse({ ...v, languages: [] }).success).toBe(
      false,
    );
  });
  it("validates IANA timezones and rejects unknown zones", () => {
    expect(timezoneSchema.safeParse("America/New_York").success).toBe(true);
    expect(timezoneSchema.safeParse("Invalid/Timezone").success).toBe(false);
  });
  it("limits external links to HTTPS without embedded credentials and meeting links to configured services", () => {
    expect(safeHttps.safeParse("https://example.com/photo.jpg").success).toBe(
      true,
    );
    expect(
      safeHttps.safeParse("https://user:secret@example.com/photo").success,
    ).toBe(false);
    expect(safeHttps.safeParse("javascript:alert(1)").success).toBe(false);
    expect(
      meetingSchema.safeParse("https://meet.google.com/abc-defg-hij").success,
    ).toBe(true);
    expect(
      meetingSchema.safeParse("https://meet.google.com.evil.test/call").success,
    ).toBe(false);
  });
  it("converts money exactly and respects zero-decimal JPY", () => {
    expect(priceMinor("15.25", "USD")).toBe(1525);
    expect(priceMinor("2000", "JPY")).toBe(2000);
    expect(priceMinor("2000.00", "JPY")).toBe(2000);
    expect(Number.isNaN(priceMinor("2000.50", "JPY"))).toBe(true);
    expect(Number.isNaN(priceMinor("1.005", "USD"))).toBe(true);
    expect(money(1525, "USD", "en")).toContain("15.25");
  });
  it("does not accept overlapping or inverted availability windows as valid forms", () => {
    expect(
      manageSchemas.rule.safeParse({
        weekday: 1,
        start_time: "18:00",
        end_time: "09:00",
      }).success,
    ).toBe(false);
    expect(
      manageSchemas.rule.safeParse({
        weekday: 7,
        start_time: "09:00",
        end_time: "18:00",
      }).success,
    ).toBe(false);
    expect(
      manageSchemas.exception.safeParse({
        kind: "blocked",
        starts_at: "2026-10-28T12:00:00Z",
        ends_at: "2026-10-28T11:00:00Z",
      }).success,
    ).toBe(false);
  });
  it("distinguishes repeated DST hours through their offsets", () => {
    const a = lessonTime("2026-11-01T05:30:00Z", "America/New_York", "en"),
      b = lessonTime("2026-11-01T06:30:00Z", "America/New_York", "en");
    expect(a).not.toBe(b);
    expect(a).toContain("GMT-4");
    expect(b).toContain("GMT-5");
  });
  it("compares whole lesson intervals with timezone-compatible hours, including closing time and midnight", () => {
    expect(
      compatibleHours(
        "2026-10-28T09:30:00Z",
        "2026-10-28T10:00:00Z",
        "UTC",
        9,
        10,
      ),
    ).toBe(true);
    expect(
      compatibleHours(
        "2026-10-28T09:45:00Z",
        "2026-10-28T10:15:00Z",
        "UTC",
        9,
        10,
      ),
    ).toBe(false);
    expect(
      compatibleHours(
        "2026-10-28T23:45:00Z",
        "2026-10-29T00:15:00Z",
        "UTC",
        7,
        24,
      ),
    ).toBe(false);
  });
  it("derives ratings only from real published review inputs and leaves absence as null", () => {
    expect(tutorRating({ reviews: [] } as unknown as Tutor)).toBe(null);
    expect(
      tutorRating({
        reviews: [{ rating: 3 }, { rating: 5 }],
      } as unknown as Tutor),
    ).toBe(4);
  });
});
