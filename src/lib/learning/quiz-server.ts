import "server-only";
import raw from "@/data/quiz-private.json";
import { contentId } from "./content";
import type { QuizKey } from "./types";
export const quizKeys: QuizKey[] = raw.map((question, i) => ({
  ...question,
  id: contentId(4, i),
  options: question.options.map((text, j) => ({
    id: contentId(5, i * 4 + j),
    text,
  })),
}));
export function getQuizPrompts() {
  return quizKeys.map(({ id, prompt, options }) => ({ id, prompt, options }));
}
