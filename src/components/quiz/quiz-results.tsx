"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { QuizResult, QuizPrompt } from "@/lib/learning/types";
import { AnswerExplanation } from "./answer-explanation";
export function QuizResults({
  result,
  questions,
  onRetry,
}: {
  result: QuizResult;
  questions: QuizPrompt[];
  onRetry: () => void;
}) {
  const t = useTranslations("Study");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <div className="quiz-results">
      <div className="results-header">
        <p className="eyebrow">NIHONPATH · PRACTICE</p>
        <h2 ref={heading} tabIndex={-1}>
          {t("results")}
        </h2>
        <p className="result-score">
          {Math.round((result.score / result.total) * 100)}
          <span>%</span>
        </p>
        <p>{t("score", { score: result.score, total: result.total })}</p>
        <p className="field-hint">{t(result.saved ? "saved" : "unsaved")}</p>
        <Button onClick={onRetry}>{t("newAttempt")}</Button>
        <p className="field-hint">{t("notOfficial")}</p>
      </div>
      <h2 className="answers-heading">{t("reviewAnswers")}</h2>
      {questions.map((question, i) => {
        const answer = result.answers.find((a) => a.questionId === question.id);
        return answer ? (
          <AnswerExplanation
            question={question}
            answer={answer}
            index={i}
            key={question.id}
          />
        ) : null;
      })}
    </div>
  );
}
