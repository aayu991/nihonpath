"use client";
import { useTranslations } from "next-intl";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function QuizStart({
  onStart,
  count = 20,
  title,
}: {
  onStart: () => void;
  count?: number;
  title?: string;
}) {
  const t = useTranslations("Study");
  return (
    <div className="quiz-start">
      <div className="study-icon">
        <BookOpen size={30} />
      </div>
      <h2>{title ?? t("grammar")}</h2>
      <p>{t("quizIntro")}</p>
      <ul>
        <li>
          <CheckCircle2 size={16} />
          {count} · {t("questions")}
        </li>
        <li>
          <CheckCircle2 size={16} />
          {t("reviewAnswers")}
        </li>
        <li>
          <CheckCircle2 size={16} />
          {t("explanation")} · 日本語 / English
        </li>
      </ul>
      <Button onClick={onStart}>{t("startQuiz")}</Button>
      <p className="field-hint">{t("notOfficial")}</p>
    </div>
  );
}
