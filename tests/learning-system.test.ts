import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  demoLessons,
  demoBanks,
  studyCards,
  demoQuizKeys,
} from "../src/lib/learning/study-catalog";
import {
  learningSchemas,
  learningTemplates,
} from "../src/lib/learning/admin-validation";
import { gradeQuiz } from "../src/lib/learning/scoring";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
describe("interactive learning content", () => {
  it("contains ten original keyed demonstration grammar questions for N5 and N4", () => {
    for (const level of ["n5", "n4"]) {
      const bank = demoBanks.find(
        (b) => b.level === level && b.subject === "grammar",
      )!;
      const keys = demoQuizKeys(bank.id);
      expect(keys).toHaveLength(10);
      expect(new Set(keys.map((k) => k.prompt)).size).toBe(10);
      for (const q of keys) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
        expect(q.options[q.correctIndex]).toBeDefined();
        expect(q.japaneseExplanation).toMatch(/[ぁ-んァ-ヶ一-龯]/);
        expect(q.explanation.length).toBeGreaterThan(30);
      }
      const result = gradeQuiz(
        keys,
        keys.map((q) => ({
          questionId: q.id,
          optionId: q.options[q.correctIndex].id,
        })),
        crypto.randomUUID(),
      );
      expect(result.score).toBe(10);
      expect(result.saved).toBe(false);
    }
  });
  it("supports four text-based practice types and omits unplayable listening", () => {
    for (const subject of ["vocabulary", "kanji", "grammar", "reading"])
      expect(demoBanks.some((b) => b.subject === subject)).toBe(true);
    expect(demoBanks.some((b) => b.subject === "listening")).toBe(false);
  });
  it("has multiple meaningful bilingual grammar examples and proper furigana syntax", () => {
    for (const l of demoLessons.filter((l) => l.subject === "grammar")) {
      expect(l.body.examples!.length).toBeGreaterThanOrEqual(2);
      expect(l.body.explanationEn).toBeTruthy();
      expect(l.body.explanationJa).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      for (const e of l.body.examples!) {
        expect(e.japanese.replace(/\{[^{}|]+\|[^{}|]+\}/g, "")).not.toMatch(
          /[{}|]/,
        );
        expect(e.english).toBeTruthy();
      }
    }
  });
  it("has usable curated flashcards at all five levels", () => {
    for (const l of ["n5", "n4", "n3", "n2", "n1"])
      expect(studyCards.filter((c) => c.level === l).length).toBeGreaterThan(0);
    expect(new Set(studyCards.map((c) => c.id)).size).toBe(studyCards.length);
    for (const c of studyCards) {
      expect(c.category).toBeTruthy();
      expect(c.reading).toMatch(/[ぁ-んァ-ヶ]/);
      expect(c.translations.ja).toMatch(/[ぁ-んァ-ヶ一-龯]/);
    }
  });
  it("rejects malformed furigana, duplicate answers, invalid keys and fake listening", () => {
    const base = {
      ...learningTemplates.bank,
      course_id: "60000000-0000-4000-8000-000000000001",
    };
    expect(learningSchemas.bank.safeParse(base).success).toBe(true);
    for (const q of [
      { ...base.questions[0], correctIndex: 9 },
      { ...base.questions[0], options: ["を", "を"] },
      { ...base.questions[0], prompt: "{水|みず" },
    ])
      expect(
        learningSchemas.bank.safeParse({ ...base, questions: [q] }).success,
      ).toBe(false);
    expect(
      learningSchemas.bank.safeParse({ ...base, subject: "listening" }).success,
    ).toBe(false);
  });
  it("maintains matching English and Japanese learning interface keys", () => {
    function keys(v: unknown, p = ""): string[] {
      return typeof v === "object" && v !== null
        ? Object.entries(v).flatMap(([k, x]) => keys(x, p + k + "."))
        : [p];
    }
    expect(keys(en.Learning)).toEqual(keys(ja.Learning));
  });
});
