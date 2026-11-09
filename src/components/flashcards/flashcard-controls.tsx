"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
export function FlashcardControls({
  index,
  total,
  flipped,
  pending,
  reviewed,
  onPrevious,
  onNext,
  onRate,
}: {
  index: number;
  total: number;
  flipped: boolean;
  pending: boolean;
  reviewed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onRate: (rating: "known" | "again") => void;
}) {
  const t = useTranslations("Study");
  return (
    <>
      <div className="review-actions">
        <Button
          variant="outline"
          disabled={!flipped || pending || reviewed}
          onClick={() => onRate("again")}
        >
          <RotateCcw />
          {t("again")}
        </Button>
        <Button
          disabled={!flipped || pending || reviewed}
          onClick={() => onRate("known")}
        >
          <Check />
          {pending ? t("saving") : t("known")}
        </Button>
      </div>
      <div className="study-navigation">
        <Button
          variant="ghost"
          disabled={index === 0 || pending}
          onClick={onPrevious}
        >
          <ArrowLeft />
          {t("previous")}
        </Button>
        <span>
          {index + 1} / {total}
        </span>
        <Button
          variant="ghost"
          disabled={index === total - 1 || pending}
          onClick={onNext}
        >
          {t("next")}
          <ArrowRight />
        </Button>
      </div>
    </>
  );
}
