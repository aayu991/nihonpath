import { z } from "zod";
import { categoryKeys, goalKeys } from "./catalog";
import { subjects } from "@/lib/learning/study-types";
export const goalsSchema = z
  .array(z.enum(goalKeys))
  .min(1)
  .max(goalKeys.length)
  .refine(
    (items) => new Set(items).size === items.length,
    "Choose each goal once.",
  );
const text = z.string().trim().min(1).max(180);
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .transform((value) => value || null);
const jsonObject = z
  .string()
  .max(50000)
  .transform((value, ctx) => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        ctx.addIssue({ code: "custom", message: "Use a JSON object." });
        return z.NEVER;
      }
      return parsed as Record<string, unknown>;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JSON." });
      return z.NEVER;
    }
  });
export const contentKinds = [
  "program",
  "course",
  "module",
  "lesson",
  "block",
  "translation",
] as const;
export type ContentKind = (typeof contentKinds)[number];
export const contentKindSchema = z.enum(contentKinds);
export const contentSchemas = {
  program: z.object({
    slug,
    title: text,
    summary: z.string().trim().max(2000),
    category: z.enum(categoryKeys),
  }),
  course: z.object({ slug, title: text, program_id: optionalUuid }),
  module: z.object({
    title: text,
    course_id: z.uuid(),
    position: z.coerce.number().int().min(0).max(10000),
  }),
  lesson: z.object({
    subject: z.enum(subjects).default("vocabulary"),
    slug,
    title: text,
    course_id: z.uuid(),
    module_id: optionalUuid,
    position: z.coerce.number().int().min(0).max(10000),
    body: jsonObject,
  }),
  block: z
    .object({
      lesson_id: z.uuid(),
      kind: z.enum(["text", "example", "flashcards", "quiz", "audio"]),
      position: z.coerce.number().int().min(0).max(10000),
      content: jsonObject,
      deck_id: optionalUuid,
      question_bank_id: optionalUuid,
      audio_asset_id: optionalUuid,
    })
    .superRefine((value, ctx) => {
      if (value.kind === "flashcards" && !value.deck_id)
        ctx.addIssue({ code: "custom", message: "Choose a deck." });
      if (value.kind === "quiz" && !value.question_bank_id)
        ctx.addIssue({ code: "custom", message: "Choose a question bank." });
      if (value.kind === "audio" && !value.audio_asset_id)
        ctx.addIssue({ code: "custom", message: "Choose a real audio asset." });
    }),
  translation: z.object({
    target_kind: z.enum(["program", "course", "module", "lesson", "block"]),
    target_id: z.uuid(),
    locale: z.enum(["en", "ja", "ne", "hi"]),
    title: text,
    content: jsonObject,
  }),
};
export const contentActionSchema = z.enum([
  "request_review",
  "approve",
  "publish",
  "unpublish",
]);
