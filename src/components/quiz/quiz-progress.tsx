"use client";
import { useTranslations } from "next-intl";
export function QuizProgress({
  count,
  total,
}: {
  count: number;
  total: number;
}) {
  const t = useTranslations("Study");
  return (
    <div className="study-progress">
      <div>
        <span>{t("answered", { count, total })}</span>
        <span>{Math.round((count / total) * 100)}%</span>
      </div>
      <progress
        aria-label={t("answered", { count, total })}
        value={count}
        max={total}
      />
    </div>
  );
}
