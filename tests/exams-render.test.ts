import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import en from "../messages/en.json";
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    en.Exams[key as keyof typeof en.Exams] ?? key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("@/actions/exams", () => ({
  finishExam: vi.fn(),
  loadExam: vi.fn(),
  updateExam: vi.fn(),
}));
import {
  ExamEngine,
  ExamResults,
  QuestionNavigator,
  ExamTimer,
} from "@/components/exams/exam-engine";
import type { Exam, ExamResultData } from "@/lib/exams/schema";
const question = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  level: "n5" as const,
  prompt: "毎朝、七時（　）起きます。",
  subject: "grammar",
  type: "grammar_completion",
  options: [
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", text: "に" },
    { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", text: "を" },
  ],
  selectedOptionId: null,
  flagged: false,
};
const initial: Exam = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  title: "Original practice",
  level: "n5",
  mode: "quick",
  status: "active",
  started_at: "2026-10-24T12:00:00Z",
  expires_at: "2026-10-24T12:03:00Z",
  serverTime: "2026-10-24T12:00:00Z",
  questions: [question],
  result: null,
};
describe("exam rendering", () => {
  it("renders selectable answers, navigation and progress without pre-submission explanations", () => {
    const html = renderToStaticMarkup(createElement(ExamEngine, { initial }));
    expect(html).toContain('type="radio"');
    expect(html).toContain("Question navigator");
    expect(html).toContain("Mark for review");
    expect(html).toContain("3:00");
    expect(html).not.toContain("Correct answer");
    expect(html).not.toContain("correctOptionId");
  });
  it("identifies answered, flagged and current questions accessibly", () => {
    const html = renderToStaticMarkup(
      createElement(QuestionNavigator, {
        questions: [
          {
            ...question,
            selectedOptionId: question.options[0].id,
            flagged: true,
          },
        ],
        index: 0,
        onChange: () => {},
        disabled: false,
      }),
    );
    expect(html).toContain("1: Answered, Flagged");
    expect(html).toContain('aria-current="step"');
  });
  it("formats expiration and shows actual results and review only after submission", () => {
    expect(
      renderToStaticMarkup(createElement(ExamTimer, { seconds: 0 })),
    ).toContain("0:00");
    const result: ExamResultData = {
      total: 1,
      correct: 0,
      unanswered: 1,
      seconds: 180,
      answers: [
        {
          ...question,
          correctOptionId: question.options[0].id,
          correct: false,
          explanation: "に marks the specific time.",
          japaneseExplanation: "「に」は時刻を表します。",
          translation: "I get up at seven.",
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(ExamResults, { result, level: "n5" }),
    );
    expect(html).toContain("に marks the specific time.");
    expect(html).toContain("Correct answer");
    expect(html).toContain("By subject");
    expect(html).toContain("By question type");
    expect(html).not.toContain("/courses/n5/grammar-practice");
  });
});
