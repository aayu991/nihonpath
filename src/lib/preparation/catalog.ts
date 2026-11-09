import "server-only";
import raw from "@/data/preparation-content.json";
import type { StudyCard, QuizKey } from "@/lib/learning/types";
import {
  sectorSchema,
  scenarioSchema,
  interviewSchema,
  resourceSchema,
} from "./schema";
export const previewSectors = raw.sectors.map((s) => sectorSchema.parse(s));
export const previewScenarios = raw.scenarios.map((s) =>
  scenarioSchema.parse(s),
);
export const previewInterviews = raw.interviews.map((s) =>
  interviewSchema.parse(s),
);
export const referenceResources = raw.resources.map((r) =>
  resourceSchema.parse(r),
);
export const prepBanks = raw.banks.map(
  ({ id, title, category, mode, courseId, subject }) => ({
    id,
    title,
    category,
    mode,
    courseId,
    subject,
  }),
);
export function preparationKeys(id: string): QuizKey[] {
  return (raw.banks.find((b) => b.id === id)?.questions ?? []).map((q) => ({
    ...q,
    options: q.options.map((text, i) => ({ id: q.optionIds[i], text })),
  }));
}
export function previewCards(slug: string): StudyCard[] {
  return (raw.sectors.find((s) => s.slug === slug)?.cards ?? []) as StudyCard[];
}
