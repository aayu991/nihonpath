"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flashcard } from "@/components/flashcards/flashcard";
import { flashcards } from "@/lib/learning/content";
import { Link } from "@/i18n/navigation";
export function FlashcardPreview() {
  const t = useTranslations("Platform");
  const [flipped, setFlipped] = useState(false);
  return (
    <article className="learning-preview">
      <p className="eyebrow">{t("preview")}</p>
      <h2>{t("flashPreview")}</h2>
      <Flashcard
        card={flashcards[0]}
        flipped={flipped}
        onFlip={() => setFlipped(!flipped)}
        onPrevious={() => setFlipped(false)}
        onNext={() => setFlipped(false)}
      />
      <Link className="text-link" href="/courses/n5/flashcards">
        {t("deck")} →
      </Link>
    </article>
  );
}
