import "server-only";
import raw from "@/data/guide-content.json";
import { guideCatalogSchema } from "./schema";
import type { StudyCard, QuizKey } from "@/lib/learning/types";
export const guidePreview = guideCatalogSchema.parse(raw.catalog);
export const guideRoleplays = raw.roleplays;
export function guideCards(deckId: string): StudyCard[] {
  return raw.cards.filter((c) => c.deckId === deckId) as StudyCard[];
}
export function guideQuizKeys(bankId: string): QuizKey[] {
  return (raw.banks.find((b) => b.id === bankId)?.questions ?? []).map((q) => ({
    ...q,
    options: q.options.map((text, i) => ({ id: q.optionIds[i], text })),
  }));
}
