import { z } from "zod";
import { learningSchemas } from "@/lib/learning/admin-validation";
import { guideDraftSchemas, guideBodySchema } from "@/lib/guides/schema";
export const cmsKinds = [
  "program",
  "course",
  "module",
  "lesson",
  "block",
  "translation",
  "vocabulary",
  "deck",
  "bank",
  "kanji",
  "guide_article",
  "guide_category",
  "guide_source",
  "exam",
] as const;
export const cmsKind = z.enum(cmsKinds);
export type CmsKind = z.infer<typeof cmsKind>;
export const cmsRoles = [
  "super_admin",
  "content_admin",
  "content_editor",
  "content_reviewer",
] as const;
export type CmsRole = (typeof cmsRoles)[number];
export const richBlocks = z
  .array(
    z
      .object({
        type: z.enum(["paragraph", "heading", "bullet"]),
        text: z.string().max(5000),
      })
      .strict(),
  )
  .max(60);
export const lessonBody = z.object({
  text: z.string().max(20000).default(""),
  explanationEn: z.string().max(20000).optional(),
  explanationJa: z.string().max(20000).optional(),
  examples: z
    .array(
      z.object({
        japanese: z.string().max(2000),
        english: z.string().max(2000),
      }),
    )
    .max(30)
    .default([]),
  richText: richBlocks.default([]),
});
const title = z.string().trim().min(1).max(180),
  slug = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  optionalId = z.uuid().nullable().default(null);
export const seoSchema = z.object({
  title: z.string().max(180).default(""),
  description: z.string().max(320).default(""),
  canonical: z
    .union([
      z.literal(""),
      z.url().refine((s) => {
        const u = new URL(s);
        return (
          u.origin === "https://nihonpath.org" &&
          !u.username &&
          !u.password &&
          !u.search &&
          !u.hash
        );
      }),
    ])
    .default(""),
  image: z.union([z.literal(""), z.uuid()]).default(""),
  index: z.boolean().default(false),
});
const extras = {
  seo: seoSchema.optional(),
  description: z.string().max(4000).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  minutes: z.number().int().min(1).max(600).optional(),
  media_ids: z.array(z.uuid()).max(30).optional(),
};
export const cmsSchemas = {
  guide_article: guideDraftSchemas.article.extend({
    seo: seoSchema.optional(),
    media_ids: z.array(z.uuid()).max(30).optional(),
    translations: z
      .array(
        z.object({
          locale: z.enum(["ja", "ne", "hi"]),
          title: z.string().min(2).max(180),
          summary: z.string().min(1).max(10000),
          content: guideBodySchema,
        }),
      )
      .min(1)
      .max(3),
  }),
  guide_category: guideDraftSchemas.category,
  guide_source: guideDraftSchemas.source,
  exam: z.object({
    title,
    level: z.enum(["n5", "n4", "n3", "n2", "n1"]),
    mode: z.enum(["quick", "section"]),
    source_bank_id: z.uuid(),
    question_ids: z.array(z.uuid()).max(100).default([]),
    duration_seconds: z.number().int().min(60).max(7200),
  }),
  program: z.object({
    title,
    slug,
    summary: z.string().max(2000).default(""),
    category: z.enum([
      "learn",
      "jlpt",
      "jft-basic",
      "ssw",
      "business",
      "life-in-japan",
      "ai-practice",
      "organizations",
    ]),
    ...extras,
  }),
  course: z.object({
    title,
    slug,
    program_id: optionalId,
    premium_feature: z
      .enum([
        "jlpt",
        "mock_exams",
        "flashcards",
        "ai_tutor",
        "business",
        "jft_ssw",
        "organizations",
      ])
      .nullable()
      .default(null),
    ...extras,
  }),
  module: z.object({
    title,
    course_id: z.uuid(),
    position: z.number().int().min(0).max(10000),
  }),
  lesson: z.object({
    title,
    slug,
    course_id: z.uuid(),
    module_id: optionalId,
    position: z.number().int().min(0).max(10000),
    subject: z.enum(["vocabulary", "kanji", "grammar", "reading", "listening"]),
    body: lessonBody,
    ...extras,
  }),
  block: z.object({
    lesson_id: z.uuid(),
    kind: z.enum(["text", "example", "flashcards", "quiz", "audio"]),
    position: z.number().int().min(0),
    content: z.record(z.string(), z.json()),
    deck_id: optionalId,
    question_bank_id: optionalId,
    audio_asset_id: optionalId,
  }),
  translation: z.object({
    target_kind: z.enum(["program", "course", "module", "lesson", "block"]),
    target_id: z.uuid(),
    locale: z.enum(["en", "ja", "ne", "hi"]),
    title,
    content: lessonBody,
  }),
  vocabulary: learningSchemas.vocabulary,
  deck: learningSchemas.deck,
  bank: learningSchemas.bank,
  kanji: z.object({
    title,
    course_id: z.uuid(),
    character: z.string().regex(/^[一-龯]$/),
    onyomi: z.string().max(500),
    kunyomi: z.string().max(500),
    meaning: z.string().min(1).max(1000),
    example_words: z.string().min(1).max(4000),
    lesson_id: optionalId,
  }),
};
export const cmsWorkspace = z.object({
  live_published: z.boolean().optional(),
  entity_kind: cmsKind,
  entity_id: z.uuid(),
  document: z.record(z.string(), z.json()),
  version: z.number().int(),
  state: z.enum(["draft", "in_review", "approved", "published", "archived"]),
  base_updated_at: z.string().nullable().optional(),
  review_notes: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
});
export type CmsWorkspace = z.infer<typeof cmsWorkspace>;
export const cmsRow = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  state: z.string(),
  updated_at: z.string(),
});
export type CmsRow = z.infer<typeof cmsRow>;
export const referenceSchema = z.object({
  categories: z.array(z.object({ id: z.uuid(), title: z.string() })).optional(),
  sources: z
    .array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        verified_at: z.string().nullable(),
        published: z.boolean(),
      }),
    )
    .optional(),
  banks: z
    .array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        course_id: z.uuid(),
        published: z.boolean(),
      }),
    )
    .optional(),
  courses: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      slug: z.string(),
      program_id: z.string().nullable(),
    }),
  ),
  modules: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      course_id: z.uuid(),
      position: z.number(),
    }),
  ),
  programs: z.array(
    z.object({ id: z.uuid(), title: z.string(), slug: z.string() }),
  ),
});
export type CmsReferences = z.infer<typeof referenceSchema>;
export function parseCmsDocument(kind: CmsKind, value: unknown) {
  return cmsSchemas[kind].safeParse(value);
}
