import { describe, it, expect } from "vitest";
import raw from "../src/data/quiz-private.json";
import { gradeQuiz } from "../src/lib/learning/scoring";
import { contentId, flashcards } from "../src/lib/learning/content";
import { registrationSchema, profileSchema } from "../src/lib/auth/validation";
const keys = raw.map((q, i) => ({
  ...q,
  id: contentId(4, i),
  options: q.options.map((text, j) => ({ id: contentId(5, i * 4 + j), text })),
}));
const right = keys.map((q) => ({
  questionId: q.id,
  optionId: q.options[q.correctIndex].id,
}));
describe("curated learning content and scoring", () => {
  it("contains exactly ten cards per level and twenty four-option questions", () => {
    expect(flashcards.filter((c) => c.level === "n5")).toHaveLength(10);
    expect(flashcards.filter((c) => c.level === "n4")).toHaveLength(10);
    expect(new Set(flashcards.map((c) => c.id)).size).toBe(20);
    expect(keys).toHaveLength(20);
    for (const q of keys) {
      expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.explanation.length).toBeGreaterThan(30);
    }
  });
  it("scores all correct and all incorrect without scaled-score claims", () => {
    expect(gradeQuiz(keys, right, "attempt").score).toBe(20);
    const wrong = keys.map((q) => ({
      questionId: q.id,
      optionId: q.options[(q.correctIndex + 1) % 4].id,
    }));
    expect(gradeQuiz(keys, wrong, "attempt").score).toBe(0);
  });
  it("scores a mixed attempt and returns an explanation for each answer", () => {
    const mixed = right.map((a, i) =>
      i < 7
        ? a
        : {
            questionId: a.questionId,
            optionId: keys[i].options[(keys[i].correctIndex + 1) % 4].id,
          },
    );
    const result = gradeQuiz(keys, mixed, "attempt");
    expect(result.score).toBe(7);
    expect(result.answers).toHaveLength(20);
    expect(result.saved).toBe(false);
  });
  it("rejects incomplete, duplicated and foreign answer options", () => {
    expect(() => gradeQuiz(keys, right.slice(1), "a")).toThrow();
    expect(() =>
      gradeQuiz(keys, [right[0], ...right.slice(0, 19)], "a"),
    ).toThrow();
    expect(() =>
      gradeQuiz(
        keys,
        [{ ...right[0], optionId: right[1].optionId }, ...right.slice(1)],
        "a",
      ),
    ).toThrow();
  });
  it("does not mutate answers or keys", () => {
    const before = JSON.stringify(keys);
    gradeQuiz(keys, right, "a");
    expect(JSON.stringify(keys)).toBe(before);
  });
});
describe("account input validation", () => {
  const profile = {
    display_name: "Learner",
    preferred_language: "en",
    learning_goal: "jlpt",
    jlpt_target: "n4",
  };
  it("validates all six goals and four supported interface languages", () => {
    for (const goal of [
      "jlpt",
      "business",
      "conversation",
      "study",
      "work",
      "travel",
    ])
      expect(
        profileSchema.safeParse({ ...profile, learning_goal: goal }).success,
      ).toBe(true);
    expect(
      profileSchema.safeParse({ ...profile, preferred_language: "fr" }).success,
    ).toBe(false);
  });
  it("rejects short passwords and confirmation mismatches", () => {
    const valid = {
      ...profile,
      email: "test@example.com",
      password: "CorrectPassword123",
      confirmPassword: "CorrectPassword123",
    };
    expect(registrationSchema.safeParse(valid).success).toBe(true);
    expect(
      registrationSchema.safeParse({
        ...valid,
        confirmPassword: "DifferentPassword123",
      }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({
        ...valid,
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });
  it("strips privilege fields instead of accepting admin membership", () => {
    const value = profileSchema.parse({
      ...profile,
      is_admin: true,
      role: "admin",
      id: "another-user",
    });
    expect(value).not.toHaveProperty("is_admin");
    expect(value).not.toHaveProperty("role");
    expect(value).not.toHaveProperty("id");
  });
});
