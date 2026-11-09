"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export function QuizNavigation({
  index,
  total,
  disabled,
  onMove,
}: {
  index: number;
  total: number;
  disabled: boolean;
  onMove: (index: number) => void;
}) {
  const t = useTranslations("Study");
  return (
    <div className="study-navigation">
      <Button
        variant="outline"
        disabled={index === 0 || disabled}
        onClick={() => onMove(index - 1)}
      >
        ← {t("previous")}
      </Button>
      <span>
        {index + 1} / {total}
      </span>
      <Button
        variant="outline"
        disabled={index === total - 1 || disabled}
        onClick={() => onMove(index + 1)}
      >
        {t("next")} →
      </Button>
    </div>
  );
}
