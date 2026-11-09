import "server-only";
import raw from "@/data/study-curriculum.json";
import type { StudyLesson, StudyBank } from "./study-types";
import type { StudyCard, QuizKey } from "./types";
export const demoLessons = raw.lessons as StudyLesson[];
export const studyCards = raw.cards as StudyCard[];
export const studyDecks = raw.decks;
export const demoBanks: StudyBank[] = raw.banks.map(
  ({ id, title, subject, level }) => ({
    id,
    title,
    subject: subject as StudyBank["subject"],
    level,
    demo: true,
  }),
);
export function demoQuizKeys(bankId: string): QuizKey[] {
  return (raw.banks.find((b) => b.id === bankId)?.questions ?? []).map((q) => ({
    ...q,
    options: q.options.map((text, i) => ({ id: q.optionIds[i], text })),
  }));
}
