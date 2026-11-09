import { describe, it, expect } from "vitest";
import {
  remainingSeconds,
  breakdown,
  questionDraftSchema,
} from "@/lib/exams/schema";
import { officialSections } from "@/lib/exams/official";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
describe("examination foundation", () => {
  it("matches verified official section times", () => {
    expect(
      Object.fromEntries(
        Object.entries(officialSections).map(([l, s]) => [
          l,
          s.map((x) => x.minutes),
        ]),
      ),
    ).toEqual({
      n5: [20, 40, 30],
      n4: [25, 55, 35],
      n3: [30, 70, 40],
      n2: [105, 50],
      n1: [110, 55],
    });
  });
  it("uses a fixed server expiration rather than restarting duration", () => {
    const expiry = "2026-10-24T12:10:00Z";
    expect(remainingSeconds(expiry, Date.parse("2026-10-24T12:00:00Z"))).toBe(
      600,
    );
    expect(remainingSeconds(expiry, Date.parse("2026-10-24T12:04:00Z"))).toBe(
      360,
    );
    expect(remainingSeconds(expiry, Date.parse("2026-10-24T12:11:00Z"))).toBe(
      0,
    );
  });
  it("rejects incomplete draft documents and unverified listening", () => {
    expect(questionDraftSchema.safeParse({ prompt: "test" }).success).toBe(
      false,
    );
    expect(
      questionDraftSchema.safeParse({ subject: "listening" }).success,
    ).toBe(false);
  });
  it("keeps English and Japanese examination message keys equal", () => {
    expect(Object.keys(en.Exams).sort()).toEqual(Object.keys(ja.Exams).sort());
  });
  it("groups actual results by subject and question type", () => {
    const answers = [
      { subject: "grammar", type: "grammar_completion", correct: true },
      { subject: "grammar", type: "sentence_ordering", correct: false },
      { subject: "reading", type: "passage_reading", correct: false },
    ];
    expect(
      breakdown(answers as Parameters<typeof breakdown>[0], "subject"),
    ).toEqual([
      { label: "grammar", total: 2, correct: 1 },
      { label: "reading", total: 1, correct: 0 },
    ]);
  });
});
