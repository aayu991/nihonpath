"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
export function VocabularyPeek() {
  const [show, setShow] = useState(false);
  const t = useTranslations("HomePractice");
  return (
    <div className="container vocabulary-peek">
      <span>{t("oneWord")}</span>
      <span lang="ja">
        <ruby>
          道<rp>（</rp>
          <rt>みち</rt>
          <rp>）</rp>
        </ruby>
      </span>
      <button
        type="button"
        aria-expanded={show}
        aria-controls="peek-meaning"
        onClick={() => setShow(!show)}
      >
        {t(show ? "hideMeaning" : "revealMeaning")}
      </button>
      <span id="peek-meaning" hidden={!show}>
        {t("pathMeaning")}
      </span>
    </div>
  );
}
