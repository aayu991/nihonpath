import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import content from "../src/data/preparation-content.json";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
import { preparationKeys } from "@/lib/preparation/catalog";
import { gradeQuiz } from "@/lib/learning/scoring";
import {
  prepCourseHref,
  prepDraftSchemas,
  resourceSchema,
} from "@/lib/preparation/schema";
import { detectAudioMime } from "@/lib/preparation/audio";
import { recommendCategories, goalsToCategories } from "@/lib/platform/catalog";
describe("preparation content and shared architecture", () => {
  it("contains ten original section questions in each of seven non-audio categories", () => {
    const banks = content.banks.filter((b) => b.mode === "section");
    expect(banks).toHaveLength(7);
    expect(banks.every((b) => b.questions.length === 10)).toBe(true);
    expect(banks.flatMap((b) => b.questions)).toHaveLength(70);
  });
  it("contains six initial learning tracks and ten complete vocabulary entries each", () => {
    expect(content.sectors).toHaveLength(6);
    for (const sector of content.sectors) {
      expect(sector.cards).toHaveLength(10);
      for (const card of sector.cards) {
        expect(card.term).toMatch(/[ぁ-んァ-ヶ一-龯]/);
        expect(card.reading).toMatch(/[ぁ-んァ-ヶ]/);
        expect(card.translations.en.length).toBeGreaterThan(2);
        expect(card.exampleTranslation.length).toBeGreaterThan(8);
        expect(card.topic).toBeTruthy();
        expect(card.difficulty).toBe("basic");
      }
    }
  });
  it("grades shared-engine JFT keys correctly and rejects forged options", () => {
    const bank = content.banks.find((b) => b.mode === "section")!,
      keys = preparationKeys(bank.id),
      answers = keys.map((q) => ({
        questionId: q.id,
        optionId: q.options[q.correctIndex].id,
      }));
    expect(gradeQuiz(keys, answers, crypto.randomUUID()).score).toBe(10);
    expect(() =>
      gradeQuiz(
        keys,
        [{ ...answers[0], optionId: crypto.randomUUID() }, ...answers.slice(1)],
        crypto.randomUUID(),
      ),
    ).toThrow("Invalid answer");
  });
  it("uses distinct option IDs and balanced key positions", () => {
    const questions = content.banks.flatMap((b) => b.questions);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions) {
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.japaneseExplanation).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      expect(q.translation).toMatch(/[A-Za-z]/);
    }
    expect(new Set(questions.map((q) => q.correctIndex)).size).toBe(3);
  });
  it("includes six real dialogue structures with bilingual lines and furigana", () => {
    expect(content.scenarios).toHaveLength(6);
    for (const s of content.scenarios) {
      expect(s.dialogue.length).toBeGreaterThanOrEqual(2);
      expect(s.dialogue.every((l) => l.en && l.ja && l.speaker)).toBe(true);
      expect(s.dialogue.some((l) => l.ja.includes("|"))).toBe(true);
      expect(preparationKeys(s.bankId)).toHaveLength(1);
    }
  });
  it("includes interview topics and truthful personalization guidance", () => {
    expect(content.interviews).toHaveLength(13);
    expect(content.interviews.filter((q) => !q.sectorId)).toHaveLength(7);
    expect(content.interviews.filter((q) => !!q.sectorId)).toHaveLength(6);
    expect(
      content.interviews.every(
        (q) => q.answer && q.translation && q.explanationJa,
      ),
    ).toBe(true);
  });
  it("does not treat an arbitrary URL as an official source", () => {
    expect(
      resourceSchema.shape.url.safeParse("https://www.ssw.go.jp/en/").success,
    ).toBe(true);
    for (const url of [
      "https://ssw.go.jp.attacker.test/en/",
      "javascript:alert(1)",
      "https://attacker.test/",
    ])
      expect(resourceSchema.shape.url.safeParse(url).success).toBe(false);
  });
  it("validates sector documents rather than granting roles", () => {
    expect(
      prepDraftSchemas.sector.safeParse({
        slug: "x",
        title: "Test",
        title_ja: "例文",
        summary: "A learning course.",
        summary_ja: "日本語を学びます。",
        course_id: crypto.randomUUID(),
        is_admin: true,
      }).data,
    ).not.toHaveProperty("is_admin");
  });
  it("routes workplace courses without inventing JLPT levels", () => {
    expect(prepCourseHref("ssw-nursing-care")).toBe("/ssw/nursing-care");
    expect(prepCourseHref("jft-basic-foundation")).toBe("/jft-basic");
    expect(prepCourseHref("workplace-interviews")).toBe(
      "/interview-preparation",
    );
    expect(prepCourseHref("n4")).toBe("/courses/n4");
  });
  it("recommends the new learning goals without changing permissions", () => {
    expect(recommendCategories(["jft"])[0]).toBe("jft-basic");
    expect(goalsToCategories.ssw).toContain("ssw");
    expect(goalsToCategories.workplace).toContain("ssw");
  });
  it("keeps available English and Japanese interface keys aligned", () => {
    expect(Object.keys(en.Preparation).sort()).toEqual(
      Object.keys(ja.Preparation).sort(),
    );
    expect(Object.keys(en.Platform.goals).sort()).toEqual(
      Object.keys(ja.Platform.goals).sort(),
    );
  });
  it("recognizes supported audio signatures and rejects non-audio files", () => {
    expect(detectAudioMime(new TextEncoder().encode("RIFF0000WAVEdata"))).toBe(
      "audio/wav",
    );
    expect(detectAudioMime(new TextEncoder().encode("OggS000000000000"))).toBe(
      "audio/ogg",
    );
    expect(detectAudioMime(new TextEncoder().encode("ID30000000000000"))).toBe(
      "audio/mpeg",
    );
    expect(
      detectAudioMime(new TextEncoder().encode("<script>bad</script>")),
    ).toBe(null);
  });
});
