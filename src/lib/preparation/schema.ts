import { z } from "zod";
export const prepKinds = [
  "sector",
  "scenario",
  "interview",
  "resource",
] as const;
export const sectorSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  titleJa: z.string(),
  summary: z.string(),
  summaryJa: z.string(),
  courseId: z.uuid(),
  deckId: z.uuid().optional(),
  bankId: z.uuid().optional(),
});
export const dialogueSchema = z
  .array(z.object({ speaker: z.string(), ja: z.string(), en: z.string() }))
  .min(2);
export const scenarioSchema = z.object({
  id: z.uuid(),
  sectorId: z.uuid(),
  lessonId: z.uuid(),
  bankId: z.uuid(),
  title: z.string(),
  situation: z.string(),
  situationJa: z.string(),
  dialogue: dialogueSchema,
});
export const interviewSchema = z.object({
  id: z.uuid(),
  lessonId: z.uuid(),
  sectorId: z.uuid().nullable(),
  topic: z.string(),
  prompt: z.string(),
  answer: z.string(),
  translation: z.string(),
  explanation: z.string(),
  explanationJa: z.string(),
});
export const resourceSchema = z.object({
  sectorId: z.uuid().nullable().optional(),
  id: z.uuid(),
  category: z.enum(["jft", "ssw"]),
  title: z.string(),
  url: z
    .url()
    .refine((s) =>
      /^https:\/\/(www\.)?(jpf\.go\.jp|ssw\.go\.jp|prometric-jp\.com|moj\.go\.jp|mhlw\.go\.jp|mofa\.go\.jp)\//.test(
        s,
      ),
    ),
  summary: z.string(),
  summaryJa: z.string(),
  reviewedAt: z.string(),
});
export type Sector = z.infer<typeof sectorSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Interview = z.infer<typeof interviewSchema>;
export type OfficialResource = z.infer<typeof resourceSchema>;
const title = z.string().trim().min(2).max(300),
  text = z.string().trim().min(5).max(10000);
export const prepDraftSchemas = {
  sector: z.object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    title,
    title_ja: title,
    summary: text,
    summary_ja: text,
    course_id: z.uuid(),
  }),
  scenario: z.object({
    sector_id: z.uuid(),
    lesson_id: z.uuid(),
    bank_id: z.uuid(),
    title,
    situation: text,
    situation_ja: text,
    dialogue: dialogueSchema,
  }),
  interview: z.object({
    sector_id: z.uuid().nullable(),
    lesson_id: z.uuid(),
    topic: title,
    prompt: text,
    suggested_answer: text,
    translation: text,
    explanation: text,
    explanation_ja: text,
  }),
  resource: z.object({
    sector_id: z.uuid().nullable(),
    category: z.enum(["jft", "ssw"]),
    title,
    url: resourceSchema.shape.url,
    summary: text,
    summary_ja: text,
    reviewed_at: z.iso.date(),
  }),
};
export const prepDashboardSchema = z.object({
  courses: z.array(
    z.object({
      id: z.uuid(),
      slug: z.string(),
      title: z.string(),
      completed: z.number(),
      reviews: z.number(),
      known: z.number(),
      due: z.number(),
    }),
  ),
  attempts: z.array(
    z.object({
      id: z.uuid(),
      score: z.number(),
      total: z.number(),
      created_at: z.string(),
      title: z.string(),
      prep_category: z.string().nullable(),
      slug: z.string(),
    }),
  ),
  weak: z.array(
    z.object({ category: z.string(), correct: z.number(), total: z.number() }),
  ),
  exams: z.number(),
});
export function prepCourseHref(slug: string) {
  if (slug === "japan-life-language") return "/japan-guide";
  return slug === "jft-basic-foundation"
    ? "/jft-basic"
    : slug === "workplace-interviews"
      ? "/interview-preparation"
      : slug.startsWith("ssw-")
        ? `/ssw/${slug.slice(4)}`
        : `/courses/${slug}`;
}
