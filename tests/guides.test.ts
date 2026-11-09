import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import raw from "../src/data/guide-content.json";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
import { guidePreview, guideQuizKeys } from "@/lib/guides/catalog";
import {
  guidePreferencesSchema,
  defaultGuidePreferences,
  relevantArticles,
  relevantItems,
  officialGuideUrl,
  progressSchema,
  guideDraftSchemas,
} from "@/lib/guides/schema";
import { gradeQuiz } from "@/lib/learning/scoring";
describe("Japan guide content and personalization", () => {
  it("has ten categories, ten guides, eight culture lessons and seven structured conversations", () => {
    expect(guidePreview.categories).toHaveLength(10);
    expect(
      guidePreview.articles.filter((a) => a.format === "guide"),
    ).toHaveLength(10);
    expect(
      guidePreview.articles.filter((a) => a.format === "lesson"),
    ).toHaveLength(8);
    expect(
      guidePreview.articles.flatMap((a) => a.content.roleplays),
    ).toHaveLength(7);
  });
  it("keeps all original content in draft without pretending an educator or official verified it", () => {
    expect(
      guidePreview.articles.every(
        (a) =>
          !a.published && a.review_status === "draft" && !a.last_reviewed_at,
      ),
    ).toBe(true);
    expect(
      guidePreview.sources
        .filter((s) => s.url.includes("moj.go.jp"))
        .every((s) => !s.verified_at),
    ).toBe(true);
    expect(
      guidePreview.articles.every((a) => a.content.deadline === null),
    ).toBe(true);
  });
  it("includes Japanese translations, explicit rule kinds and source metadata for every guide", () => {
    for (const a of guidePreview.articles) {
      expect(
        guidePreview.translations.some(
          (t) => t.article_id === a.id && t.locale === "ja",
        ),
      ).toBe(true);
      expect(a.source_ids.length).toBeGreaterThan(0);
      expect(a.content.sections.every((s) => s.kind && s.text)).toBe(true);
    }
    for (const s of guidePreview.sources) {
      expect(officialGuideUrl.safeParse(s.url).success).toBe(true);
      expect(s.jurisdiction.length).toBeGreaterThan(4);
    }
  });
  it("filters recommendations by goal and arrival stage without inferring verified status", () => {
    const tourist = relevantArticles(guidePreview, defaultGuidePreferences);
    expect(tourist.some((a) => a.slug === "prepare-your-journey")).toBe(true);
    expect(tourist.some((a) => a.slug === "workplace-orientation")).toBe(false);
    const worker = relevantArticles(guidePreview, {
      ...defaultGuidePreferences,
      audiences: ["ssw"],
      stage: "arriving",
    });
    expect(worker.some((a) => a.slug === "workplace-orientation")).toBe(true);
    expect(
      guidePreferencesSchema.safeParse({
        ...defaultGuidePreferences,
        audiences: ["admin"],
      }).success,
    ).toBe(false);
  });
  it("adapts checklists to stage, housing and banking choices", () => {
    const plain = relevantItems(guidePreview, defaultGuidePreferences);
    const housing = relevantItems(guidePreview, {
      ...defaultGuidePreferences,
      renting: true,
    });
    expect(housing.length).toBeGreaterThan(plain.length);
    expect(plain.every((i) => i.circumstance === "all")).toBe(true);
    const arrival = relevantItems(guidePreview, {
      ...defaultGuidePreferences,
      audiences: ["student"],
      stage: "arriving",
    });
    expect(
      arrival.some((i) => i.title.includes("school's international")),
    ).toBe(true);
    expect(arrival.some((i) => i.title.includes("Ask your employer who"))).toBe(
      false,
    );
  });
  it("uses the same private-key scoring contract for thirty words and eight culture checks", () => {
    expect(raw.cards).toHaveLength(30);
    expect(raw.banks.flatMap((b) => b.questions)).toHaveLength(38);
    for (const bank of raw.banks) {
      const keys = guideQuizKeys(bank.id),
        answers = keys.map((q) => ({
          questionId: q.id,
          optionId: q.options[q.correctIndex].id,
        }));
      expect(gradeQuiz(keys, answers, crypto.randomUUID()).score).toBe(
        keys.length,
      );
      expect(keys.every((q) => q.explanation && q.japaneseExplanation)).toBe(
        true,
      );
    }
  });
  it("bounds notes and refuses non-official source URLs", () => {
    expect(
      progressSchema.safeParse({
        itemId: crypto.randomUUID(),
        completed: true,
        notes: "x".repeat(2001),
        dueDate: null,
      }).success,
    ).toBe(false);
    for (const url of [
      "https://www.moj.go.jp.attacker.test/",
      "https://user:password@www.japan.travel/en/",
      "javascript:alert(1)",
    ]) {
      expect(officialGuideUrl.safeParse(url).success).toBe(false);
    }
  });
  it("does not accept role flags or publish state through editorial document fields", () => {
    const source = guideDraftSchemas.source.parse({
      title: "Official reference",
      url: "https://www.japan.travel/en/",
      summary: "Verify the actual source.",
      summary_ja: "実際の情報元を確認します。",
      jurisdiction: "Japan",
      publication_date: null,
      verified_at: null,
      verified_by: crypto.randomUUID(),
      published: true,
    });
    expect(source).not.toHaveProperty("verified_by");
    expect(source).not.toHaveProperty("published");
  });
  it("has matching English/Japanese localization keys", () => {
    const keys = (v: object): string[] =>
      Object.entries(v).flatMap(([k, x]) =>
        typeof x === "object" ? keys(x).map((s) => `${k}.${s}`) : [k],
      );
    expect(keys(en.Guide).sort()).toEqual(keys(ja.Guide).sort());
  });
});
