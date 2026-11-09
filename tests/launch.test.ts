import { it, expect, vi, afterEach } from "vitest";
import { environmentReport } from "@/lib/launch/environment";
import { privateSeoPath } from "@/lib/seo/access";
import { operationsAuthorized } from "@/lib/launch/authorization";
import { metadataFor, breadcrumbData } from "@/lib/seo/metadata";
import { publicSeo } from "@/lib/seo/catalog";
import {
  analyticsSchema,
  supportSchema,
  vitalBucket,
} from "@/lib/launch/schema";
import { renderNotification, notificationKinds } from "@/lib/email/templates";
vi.mock("server-only", () => ({}));
import { ApprovedEmailTransport, emailEnabled } from "@/lib/email/delivery";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("rejects malformed and multibyte operations credentials without throwing", () => {
  const s = "a".repeat(32);
  expect(operationsAuthorized(`Bearer ${s}`, s)).toBe(true);
  expect(operationsAuthorized(`Bearer ${"é".repeat(32)}`, s)).toBe(false);
  expect(operationsAuthorized(null, s)).toBe(false);
  expect(operationsAuthorized("Bearer short", "short")).toBe(false);
});
it("excludes private workspaces and booking variants without excluding public marketplaces", () => {
  for (const p of [
    "/en/tutor/dashboard",
    "/ja/organization/students",
    "/hi/tutors/teacher/book",
    "/ne/organizations/register",
    "/en/exams/attempt",
    "/en/admin/operations",
  ])
    expect(privateSeoPath(p)).toBe(true);
  for (const p of ["/en/tutors", "/ja/organizations", "/hi/exams", "/en/help"])
    expect(privateSeoPath(p)).toBe(false);
});
it("blocks unapproved production and live billing without printing values", () => {
  const r = environmentReport({
    APP_ENV: "production",
    BILLING_MODE: "live",
    STRIPE_SECRET_KEY: "sk_live_private",
    NEXT_PUBLIC_BAD_SECRET: "private-value",
  });
  expect(r.errors).toContain("PRODUCTION_RELEASE_APPROVAL_REQUIRED");
  expect(r.errors).toContain("LIVE_BILLING_FORBIDDEN");
  expect(r.errors).toContain("PUBLIC_SECRET_VARIABLE_FORBIDDEN");
  expect(JSON.stringify(r)).not.toContain("private-value");
  expect(r.indexing).toBe(false);
});
it("never indexes previews even when an indexing flag is supplied", () => {
  expect(
    environmentReport({
      VERCEL_ENV: "preview",
      LAUNCH_INDEXING_APPROVED: "true",
      NEXT_PUBLIC_SITE_URL: "https://preview.example.test",
    }).indexing,
  ).toBe(false);
});
it("requires an HTTPS custom origin and explicit production approvals for indexing", () => {
  expect(
    environmentReport({
      APP_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://nihonpath.example",
      LAUNCH_RELEASE_APPROVED: "true",
      LAUNCH_INDEXING_APPROVED: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
    }).indexing,
  ).toBe(true);
  expect(
    environmentReport({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" }).errors,
  ).toContain("SITE_ORIGIN_INVALID");
});
it("builds canonical and hreflang only for available primary translations", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://nihonpath.example");
  const m = metadataFor("courses/n5", "ne");
  expect(m.robots).toMatchObject({ index: false });
  expect(m.alternates?.canonical).toBe(
    "https://nihonpath.example/ne/courses/n5",
  );
  expect(m.alternates?.languages).toBeUndefined();
  const en = metadataFor("courses/n5", "en");
  expect(Object.keys(en.alternates?.languages ?? {})).toEqual([
    "en",
    "ja",
    "x-default",
  ]);
  expect(publicSeo.business.indexable).toBe(false);
});
it("never indexes unknown/private routes by default and escapes no guessed user content", () => {
  expect(metadataFor("dashboard", "en").robots).toMatchObject({ index: false });
  expect(breadcrumbData("help", "en").itemListElement).toHaveLength(2);
});
it("rejects analytics identities, query strings, transcripts and no-consent events", () => {
  const p = {
    type: "event",
    event: "homepage_visit",
    locale: "en",
    consent: true,
  };
  expect(analyticsSchema.safeParse(p).success).toBe(true);
  for (const extra of [
    { user_id: "private" },
    { path: "/billing?secret=x" },
    { transcript: "private" },
  ])
    expect(analyticsSchema.safeParse({ ...p, ...extra }).success).toBe(false);
  expect(analyticsSchema.safeParse({ ...p, consent: false }).success).toBe(
    false,
  );
});
it("uses actual Core Web Vitals thresholds without claiming observations", () => {
  expect(vitalBucket("LCP", 2500)).toBe("good");
  expect(vitalBucket("INP", 501)).toBe("poor");
  expect(vitalBucket("CLS", 0.2)).toBe("needs_improvement");
});
it("validates bounded private support requests, consent and spam honeypots", () => {
  const p = {
    id: crypto.randomUUID(),
    category: "account",
    subject: "Account help needed",
    body: "This is a local test message without private account information.",
    website: "",
    consent: true,
  };
  expect(supportSchema.safeParse(p).success).toBe(true);
  expect(supportSchema.safeParse({ ...p, website: "spam" }).success).toBe(
    false,
  );
  expect(
    supportSchema.safeParse({ ...p, user_id: crypto.randomUUID() }).success,
  ).toBe(false);
});
it("renders every notification in four languages without private message interpolation", () => {
  for (const l of ["en", "ja", "ne", "hi"] as const)
    for (const kind of notificationKinds) {
      const t = renderNotification(kind, l, "https://nihonpath.example");
      expect(t.html).toContain(`lang="${l}"`);
      expect(t.text).toContain(`https://nihonpath.example/${l}/`);
      expect(t.html).not.toContain("<script");
    }
});
it("does not contact any email provider when delivery or approval is absent", async () => {
  vi.stubEnv("EMAIL_DELIVERY_ENABLED", "false");
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  expect(emailEnabled()).toBe(false);
  await expect(
    new ApprovedEmailTransport().send({
      id: crypto.randomUUID(),
      to: "nobody@example.invalid",
      kind: "enrollment",
      locale: "en",
    }),
  ).rejects.toThrow("email_disabled");
  expect(f).not.toHaveBeenCalled();
});
