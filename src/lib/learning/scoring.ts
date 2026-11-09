import type { Answer, QuizKey, QuizResult } from "./types";
export function gradeQuiz(
  keys: QuizKey[],
  answers: Answer[],
  attemptId: string,
): QuizResult {
  if (
    answers.length !== keys.length ||
    new Set(answers.map((a) => a.questionId)).size !== keys.length
  )
    throw new Error("Answer every question exactly once.");
  const graded = keys.map((q) => {
    const selected = answers.find((a) => a.questionId === q.id);
    if (!selected || !q.options.some((o) => o.id === selected.optionId))
      throw new Error("Invalid answer.");
    const correctOptionId = q.options[q.correctIndex].id;
    return {
      questionId: q.id,
      selectedOptionId: selected.optionId,
      correctOptionId,
      correct: selected.optionId === correctOptionId,
      explanation: q.explanation,
      japaneseExplanation: q.japaneseExplanation,
      translation: q.translation,
    };
  });
  return {
    attemptId,
    score: graded.filter((a) => a.correct).length,
    total: keys.length,
    answers: graded,
    saved: false,
  };
}
