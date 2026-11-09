import { z } from "zod";
export const supportSchema = z
  .object({
    id: z.uuid(),
    category: z.enum([
      "account",
      "courses",
      "exams",
      "ai",
      "billing",
      "tutors",
      "organizations",
    ]),
    subject: z.string().trim().min(6).max(160),
    body: z.string().trim().min(20).max(3000),
    website: z.literal(""),
    consent: z.literal(true),
  })
  .strict();
export const analyticsSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("event"),
      event: z.enum(["homepage_visit", "course_exploration", "lesson_start"]),
      locale: z.enum(["en", "ja", "ne", "hi"]),
      consent: z.literal(true),
    })
    .strict(),
  z
    .object({
      type: z.literal("vital"),
      metric: z.enum(["LCP", "INP", "CLS"]),
      value: z.number().finite().nonnegative().max(60000),
      consent: z.literal(true),
    })
    .strict(),
]);
export function vitalBucket(metric: string, value: number) {
  const good = metric === "LCP" ? 2500 : metric === "INP" ? 200 : 0.1,
    poor = metric === "LCP" ? 4000 : metric === "INP" ? 500 : 0.25;
  return value <= good ? "good" : value <= poor ? "needs_improvement" : "poor";
}
