import { z } from "zod";
export const examQuestionSchema = z.object({
  level: z.enum(["n5", "n4", "n3", "n2", "n1"]).optional(),
  id: z.uuid(),
  prompt: z.string(),
  subject: z.string(),
  type: z.string(),
  passage: z.string().nullable().optional(),
  options: z.array(z.object({ id: z.uuid(), text: z.string() })),
  selectedOptionId: z.uuid().nullable(),
  flagged: z.boolean(),
  lessonId: z.string().nullable().optional(),
  deckId: z.string().nullable().optional(),
});
export const resultAnswerSchema = examQuestionSchema.extend({
  correctOptionId: z.uuid(),
  correct: z.boolean(),
  explanation: z.string(),
  japaneseExplanation: z.string(),
  translation: z.string(),
});
export const examResultSchema = z.object({
  total: z.number(),
  correct: z.number(),
  unanswered: z.number(),
  seconds: z.number(),
  answers: z.array(resultAnswerSchema),
});
export const examSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  level: z.string(),
  mode: z.string(),
  status: z.enum(["active", "submitted"]),
  started_at: z.string(),
  expires_at: z.string(),
  serverTime: z.string(),
  questions: z.array(examQuestionSchema),
  result: examResultSchema.nullable(),
});
export const templateSchema = z.object({
  difficultyCounts: z.record(z.string(), z.number()),
  id: z.uuid(),
  title: z.string(),
  level: z.string(),
  mode: z.enum(["quick", "section", "full"]),
  subject: z.string(),
  count: z.number(),
  seconds: z.number(),
  available: z.boolean(),
});
export type Exam = z.infer<typeof examSchema>;
export type ExamQuestionData = z.infer<typeof examQuestionSchema>;
export type ExamResultData = z.infer<typeof examResultSchema>;
export type ExamTemplate = z.infer<typeof templateSchema>;
export const questionDraftSchema = z
  .object({
    level: z.enum(["n5", "n4", "n3", "n2", "n1"]),
    subject: z.enum(["vocabulary", "kanji", "grammar", "reading"]),
    type: z.enum([
      "kanji_reading",
      "vocabulary_meaning",
      "vocabulary_usage",
      "grammar_completion",
      "sentence_ordering",
      "passage_reading",
      "information_retrieval",
    ]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    prompt: z.string().min(4).max(5000),
    passage: z.string().max(12000).optional(),
    options: z.array(z.string().trim().min(1).max(2000)).min(2).max(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().min(10).max(5000),
    japaneseExplanation: z.string().min(5).max(5000),
    translation: z.string().max(5000),
    source: z.string().min(3).max(500),
    tags: z.array(z.string().max(60)).max(20),
    lessonId: z.uuid().optional(),
    deckId: z.uuid().optional(),
  })
  .refine(
    (d) =>
      d.correctIndex < d.options.length &&
      new Set(d.options).size === d.options.length,
    "Choose one valid answer and distinct options",
  )
  .refine(
    (d) =>
      !["passage_reading", "information_retrieval"].includes(d.type) ||
      !!d.passage?.trim(),
    "Reading questions need a passage",
  );
export function remainingSeconds(expires: string, serverNow: number) {
  return Math.max(0, Math.ceil((Date.parse(expires) - serverNow) / 1000));
}
export function breakdown(
  answers: ExamResultData["answers"],
  field: "subject" | "type",
) {
  const groups = answers.reduce<Record<string, typeof answers>>(
    (all, answer) => {
      (all[answer[field]] ??= []).push(answer);
      return all;
    },
    {},
  );
  return Object.entries(groups).map(([label, items]) => ({
    label,
    total: items.length,
    correct: items.filter((a) => a.correct).length,
  }));
}
