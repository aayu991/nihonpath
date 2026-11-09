import { z } from "zod";
import { subjects } from "./study-types";
const text = z.string().trim().min(1).max(5000);
const japanese = text
  .refine((s) => /[ぁ-んァ-ヶ一-龯]/.test(s), "Japanese text required")
  .refine(
    (s) => !/[{}|]/.test(s.replace(/\{[^{}|]+\|[^{}|]+\}/g, "")),
    "Use {漢字|かんじ} for furigana.",
  );
const card = z.object({
  vocabulary_id: z.uuid().nullable().optional(),
  term: japanese,
  reading: z
    .string()
    .trim()
    .regex(/^[ぁ-ゖァ-ヺー・\s]+$/),
  meaning_en: text,
  meaning_ja: japanese,
  example: japanese,
  example_translation: text,
  category: text.default("General"),
});
const question = z
  .object({
    prompt: japanese,
    options: z.array(text).min(2).max(4),
    correctIndex: z.number().int().min(0),
    explanation: text.min(10),
    japaneseExplanation: japanese,
    translation: text,
  })
  .superRefine((q, ctx) => {
    if (q.correctIndex >= q.options.length)
      ctx.addIssue({
        code: "custom",
        message: "One correct option is required",
      });
    if (new Set(q.options).size !== q.options.length)
      ctx.addIssue({ code: "custom", message: "Options must be distinct" });
  });
export const learningKinds = ["vocabulary", "deck", "bank"] as const;
export const learningKindSchema = z.enum(learningKinds);
export type LearningKind = z.infer<typeof learningKindSchema>;
export const learningSchemas = {
  vocabulary: card.extend({
    course_id: z.uuid(),
    sector_id: z.uuid().nullable().optional(),
    topic: text.optional(),
    difficulty: z.enum(["basic", "intermediate"]).optional(),
  }),
  deck: z.object({
    course_id: z.uuid(),
    title: text.max(180),
    cards: z.array(card).min(1).max(100),
  }),
  bank: z.object({
    prep_category: z.string().max(100).nullable().optional(),
    prep_mode: z
      .enum(["quick", "section", "scenario", "industry"])
      .nullable()
      .optional(),
    course_id: z.uuid(),
    title: text.max(180),
    subject: z
      .enum(subjects)
      .refine((s) => s !== "listening", "Listening requires verified audio."),
    questions: z.array(question).min(1).max(100),
  }),
};
export const learningTemplates = {
  vocabulary: {
    course_id: "",
    term: "水",
    reading: "みず",
    meaning_en: "water",
    meaning_ja: "飲むための液体。",
    example: "{水|みず}を{飲|の}みます。",
    example_translation: "I drink water.",
    category: "Everyday Japanese",
  },
  deck: {
    course_id: "",
    title: "Vocabulary draft",
    cards: [
      {
        term: "水",
        reading: "みず",
        meaning_en: "water",
        meaning_ja: "飲むための液体。",
        example: "{水|みず}を{飲|の}みます。",
        example_translation: "I drink water.",
        category: "Everyday Japanese",
      },
    ],
  },
  bank: {
    course_id: "",
    title: "Grammar draft",
    subject: "grammar",
    questions: [
      {
        prompt: "パン（　）{食|た}べます。",
        options: ["を", "に", "で", "へ"],
        correctIndex: 0,
        explanation:
          "を marks the direct object of the action: bread is what is eaten.",
        japaneseExplanation:
          "「を」は{食|た}べるものの{後|あと}に{置|お}きます。",
        translation: "I eat bread.",
      },
    ],
  },
};
