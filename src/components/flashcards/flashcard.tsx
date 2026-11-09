"use client";
import { useTranslations, useLocale } from "next-intl";
import { RotateCw } from "lucide-react";
import type { StudyCard } from "@/lib/learning/types";
import { Japanese } from "@/components/learning/japanese";
export function Flashcard({
  card,
  flipped,
  onFlip,
  onPrevious,
  onNext,
}: {
  card: StudyCard;
  flipped: boolean;
  onFlip: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("Study");
  const locale = useLocale();
  return (
    <button
      type="button"
      className={`study-flashcard ${flipped ? "is-flipped" : ""}`}
      aria-pressed={flipped}
      onClick={onFlip}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onPrevious();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNext();
        }
      }}
    >
      <span className="flip-inner">
        <span
          className="flash-face flash-front"
          id={`${card.id}-front`}
          aria-hidden={flipped}
        >
          <span className="card-level">
            {card.programLabel ?? `JLPT ${card.level.toUpperCase()}`}
          </span>
          {card.category && (
            <span className="flash-category">{card.category}</span>
          )}
          <span className="flash-term" lang="ja">
            <ruby>
              {card.term}
              <rp>（</rp>
              <rt>{card.reading}</rt>
              <rp>）</rp>
            </ruby>
          </span>
          <span className="flash-hint">
            <RotateCw size={16} />
            {t("flip")}
          </span>
        </span>
        <span
          className="flash-face flash-back"
          id={`${card.id}-back`}
          aria-hidden={!flipped}
        >
          <span className="card-level">
            {card.programLabel ?? `JLPT ${card.level.toUpperCase()}`}
          </span>
          <span className="flash-reading" lang="ja">
            <ruby>
              {card.term}
              <rp>（</rp>
              <rt>{card.reading}</rt>
              <rp>）</rp>
            </ruby>
          </span>
          <strong>{card.translations[locale === "ja" ? "ja" : "en"]}</strong>
          <span className="flash-example">
            <Japanese text={card.example} />
          </span>
          <span className="flash-translation">{card.exampleTranslation}</span>
          <span className="flash-hint">
            <RotateCw size={16} />
            {t("front")}
          </span>
        </span>
      </span>
    </button>
  );
}
