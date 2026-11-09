export type Level = "n5" | "n4" | "n3" | "n2" | "n1";
export type ReviewRating = "known" | "again";
export interface StudyCard {
  programLabel?: string;
  category?: string;
  id: string;
  level: Level | "workplace" | "jft-basic" | "japan-life";
  term: string;
  reading: string;
  translations: { en: string; ja: string };
  example: string;
  exampleTranslation: string;
}
export interface QuizOption {
  id: string;
  text: string;
}
export interface QuizPrompt {
  id: string;
  prompt: string;
  options: QuizOption[];
}
export interface QuizKey extends QuizPrompt {
  correctIndex: number;
  explanation: string;
  japaneseExplanation: string;
  translation: string;
}
export interface Answer {
  questionId: string;
  optionId: string;
}
export interface GradedAnswer {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  correct: boolean;
  explanation: string;
  japaneseExplanation: string;
  translation: string;
}
export interface QuizResult {
  attemptId: string;
  score: number;
  total: number;
  answers: GradedAnswer[];
  saved: boolean;
}
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };
