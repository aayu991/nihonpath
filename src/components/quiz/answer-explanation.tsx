"use client";
import { useTranslations } from "next-intl";
import { Japanese } from "@/components/learning/japanese";
import type { GradedAnswer, QuizPrompt } from "@/lib/learning/types";
export function AnswerExplanation({
  question,
  answer,
  index,
}: {
  question: QuizPrompt;
  answer: GradedAnswer;
  index: number;
}) {
  const t = useTranslations("Study");
  return (
    <article className="answer-review">
      <div className="answer-review-top">
        <span>#{String(index + 1).padStart(2, "0")}</span>
        <span
          className={answer.correct ? "answer-correct" : "answer-incorrect"}
        >
          {t(answer.correct ? "correct" : "incorrect")}
        </span>
      </div>
      <h3>
        <Japanese text={question.prompt} />
      </h3>
      <div className="answer-options">
        {question.options.map((option) => (
          <div
            className={
              option.id === answer.correctOptionId
                ? "correct-option"
                : option.id === answer.selectedOptionId
                  ? "wrong-option"
                  : ""
            }
            key={option.id}
          >
            <Japanese text={option.text} />
            {option.id === answer.correctOptionId && (
              <small>{t("correctAnswer")}</small>
            )}
            {option.id === answer.selectedOptionId && (
              <small>{t("yourAnswer")}</small>
            )}
          </div>
        ))}
      </div>
      <h4>{t("explanation")}</h4>
      <p>{answer.explanation}</p>
      <p className="explanation-japanese">
        <Japanese text={answer.japaneseExplanation} />
      </p>
      <h4>{t("translation")}</h4>
      <p>{answer.translation}</p>
    </article>
  );
}
