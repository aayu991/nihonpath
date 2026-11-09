"use client";
import { useTranslations } from "next-intl";
export function FlashcardProgress({
  reviewed,
  total,
}: {
  reviewed: number;
  total: number;
}) {
  const t = useTranslations("Study");
  return (
    <div className="study-progress">
      <div>
        <span>{t("reviewed", { count: reviewed })}</span>
        <span>{t("remaining", { count: total - reviewed })}</span>
      </div>
      <progress aria-label={t("reviews")} value={reviewed} max={total} />
    </div>
  );
}
