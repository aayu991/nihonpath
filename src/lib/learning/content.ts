import cards from "@/data/flashcards.json";
import type { StudyCard, Level } from "./types";
export function contentId(prefix: number, index: number) {
  return `${prefix}0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}
export const flashcards: StudyCard[] = cards.map((card, i) => ({
  ...card,
  level: card.level as Level,
  id: contentId(1, i),
}));
export const deckIds = { n5: contentId(2, 0), n4: contentId(2, 1) };
export const bankId = contentId(3, 0);
