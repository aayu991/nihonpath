import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { miniLevels, miniQuestions } from "../src/lib/learning/mini-test";
import { miniKeys } from "../src/lib/learning/mini-test-keys";
import { gradeMiniTest } from "../src/actions/mini-test";
describe("homepage mini test", () => {
  it("provides three unique questions and valid answer keys at every level", () => {
    const ids = new Set<string>();
    for (const level of miniLevels) {
      expect(miniQuestions[level]).toHaveLength(3);
      expect(miniKeys[level]).toHaveLength(3);
      miniQuestions[level].forEach((q, i) => {
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.options[miniKeys[level][i].correctIndex]).toBeTruthy();
        expect(miniKeys[level][i].explanation.length).toBeGreaterThan(70);
      });
    }
  });
  it("grades correct, incorrect, and mixed answers for all levels", async () => {
    for (const level of miniLevels) {
      const correct = miniKeys[level].map((k) => k.correctIndex);
      expect((await gradeMiniTest({ level, answers: correct }))?.score).toBe(3);
      expect(
        (
          await gradeMiniTest({
            level,
            answers: correct.map((i) => (i + 1) % 3),
          })
        )?.score,
      ).toBe(0);
      expect(
        (
          await gradeMiniTest({
            level,
            answers: [correct[0], (correct[1] + 1) % 3, correct[2]],
          })
        )?.score,
      ).toBe(2);
    }
  });
  it("rejects missing, out-of-range, and forged level input", async () => {
    for (const input of [
      { level: "n0", answers: [0, 0, 0] },
      { level: "n5", answers: [-1, 0, 0] },
      { level: "n5", answers: [0, 0] },
      { level: "n5", answers: [0, 3, 0] },
      null,
    ])
      expect(await gradeMiniTest(input)).toBeNull();
  });
  it("keeps answer keys and explanations out of the public question data", () => {
    expect(JSON.stringify(miniQuestions)).not.toContain("correctIndex");
    expect(JSON.stringify(miniQuestions)).not.toContain("explanation");
  });
});
