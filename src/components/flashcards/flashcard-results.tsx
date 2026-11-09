"use client";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function FlashcardResults({
  total,
  known,
  member,
  onRetry,
}: {
  total: number;
  known: number;
  member: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("Study");
  return (
    <div className="study-result-panel" role="status">
      <CheckCircle2 size={42} />
      <h2>{t("reviewComplete")}</h2>
      <p>{t("reviewSummary", { total, known, again: total - known })}</p>
      <p>{t(member ? "saved" : "unsaved")}</p>
      <Button onClick={onRetry}>{t("retry")}</Button>
    </div>
  );
}
