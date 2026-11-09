"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { QuizQuestion } from "@/components/quiz/quiz-question";
import type { QuizPrompt } from "@/lib/learning/types";
import { Link } from "@/i18n/navigation";
export function MockTestPreview({ question }: { question: QuizPrompt }) {
  const t = useTranslations("Platform");
  const [selected, setSelected] = useState<string>();
  return (
    <article className="learning-preview">
      <p className="eyebrow">{t("preview")}</p>
      <h2>{t("mockPreview")}</h2>
      <QuizQuestion
        question={question}
        selected={selected}
        onSelect={setSelected}
        disabled={false}
      />
      <p className="field-hint">{t("mockNote")}</p>
      <Link className="text-link" href="/courses/n4/grammar-practice">
        {t("fullPractice")} →
      </Link>
    </article>
  );
}
