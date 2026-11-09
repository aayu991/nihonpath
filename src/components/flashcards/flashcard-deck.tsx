"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { saveReview } from "@/actions/learning";
import type { StudyCard, ReviewRating } from "@/lib/learning/types";
import { Flashcard } from "./flashcard";
import { FlashcardControls } from "./flashcard-controls";
import { FlashcardProgress } from "./flashcard-progress";
import { FlashcardResults } from "./flashcard-results";
import { Button } from "@/components/ui/button";
export function FlashcardDeck({
  cards,
  member,
}: {
  cards: StudyCard[];
  member: boolean;
}) {
  const t = useTranslations("Study");
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<string, ReviewRating>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [finished, setFinished] = useState(false);
  const busy = useRef(false);
  const events = useRef<Record<string, { id: string; rating: ReviewRating }>>(
    {},
  );
  const card = order[index];
  if (!card) return <p>{t("future")}</p>;
  const count = Object.keys(ratings).length;
  function move(next: number) {
    if (busy.current) return;
    setIndex(Math.min(cards.length - 1, Math.max(0, next)));
    setFlipped(false);
    setError(undefined);
  }
  async function rate(rating: ReviewRating) {
    if (busy.current || ratings[card.id] || !flipped) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    const event = events.current[card.id] ?? {
      id: crypto.randomUUID(),
      rating,
    };
    events.current[card.id] = event;
    try {
      if (member) {
        const result = await saveReview({
          id: event.id,
          cardId: card.id,
          rating: event.rating,
        });
        if (!result.ok) {
          setError(
            t(result.error === "session" ? "sessionError" : "networkError"),
          );
          return;
        }
      }
      setRatings((previous) => ({ ...previous, [card.id]: event.rating }));
    } catch {
      setError(t("networkError"));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (finished)
    return (
      <FlashcardResults
        total={count}
        known={Object.values(ratings).filter((r) => r === "known").length}
        member={member}
        onRetry={() => {
          events.current = {};
          setRatings({});
          setIndex(0);
          setFlipped(false);
          setFinished(false);
        }}
      />
    );
  return (
    <div className="deck-shell">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          const next = [...order];
          for (let i = next.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [next[i], next[j]] = [next[j], next[i]];
          }
          setOrder(next);
          setIndex(0);
          setFlipped(false);
        }}
      >
        {t("shuffle")}
      </Button>
      <FlashcardProgress reviewed={count} total={cards.length} />
      <p className="study-position" aria-live="polite">
        {t("card", { current: index + 1, total: cards.length })}
      </p>
      <Flashcard
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped(!flipped)}
        onPrevious={() => move(index - 1)}
        onNext={() => move(index + 1)}
      />
      <FlashcardControls
        index={index}
        total={cards.length}
        flipped={flipped}
        pending={pending}
        reviewed={!!ratings[card.id]}
        onPrevious={() => move(index - 1)}
        onNext={() => move(index + 1)}
        onRate={rate}
      />
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
      {ratings[card.id] && (
        <p role="status" className="field-hint">
          {t(member ? "saved" : "unsaved")}
        </p>
      )}
      {count === cards.length && (
        <Button className="finish-button" onClick={() => setFinished(true)}>
          {t("finish")}
        </Button>
      )}
      <p className="field-hint keyboard-hint">{t("keyboard")}</p>
    </div>
  );
}
