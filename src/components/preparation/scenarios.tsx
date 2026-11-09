"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Japanese } from "@/components/learning/japanese";
import { QuizEngine } from "@/components/quiz/quiz-engine";
import { Button } from "@/components/ui/button";
import type { Scenario } from "@/lib/preparation/schema";
import type { QuizPrompt } from "@/lib/learning/types";
export function WorkplaceScenarios({
  scenarios,
  member,
}: {
  scenarios: (Scenario & { questions: QuizPrompt[] })[];
  member: boolean;
}) {
  const t = useTranslations("Preparation"),
    locale = useLocale();
  const [index, setIndex] = useState(0),
    [translation, setTranslation] = useState(true),
    [furigana, setFurigana] = useState(true);
  const scene = scenarios[index];
  if (!scene) return <p>{t("noScenarios")}</p>;
  return (
    <section
      id="scenarios"
      className="prep-section prep-dialogue"
      data-furigana={furigana}
    >
      <p className="eyebrow">
        WORKPLACE / {index + 1} / {scenarios.length}
      </p>
      <h2>{t("scenarioTitle")}</h2>
      <div className="prep-controls">
        <label>
          <input
            type="checkbox"
            checked={furigana}
            onChange={(e) => setFurigana(e.target.checked)}
          />
          {t("furigana")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={translation}
            onChange={(e) => setTranslation(e.target.checked)}
          />
          {t("translation")}
        </label>
      </div>
      <article className="prep-card">
        <h3>{scene.title}</h3>
        <p>{locale === "ja" ? scene.situationJa : scene.situation}</p>
        <div className="prep-dialogue-lines">
          {scene.dialogue.map((line, i) => (
            <div className="prep-dialogue-line" key={i}>
              <strong lang="ja">{line.speaker}</strong>
              <p>
                <Japanese text={line.ja} />
              </p>
              {translation && (
                <p className="prep-dialogue-translation">{line.en}</p>
              )}
            </div>
          ))}
        </div>
        <QuizEngine
          key={`${scene.id}-${index}`}
          questions={scene.questions}
          bankId={scene.bankId}
          member={member}
          title={scene.title}
        />
      </article>
      <div className="prep-controls">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          {t("previousScenario")}
        </Button>
        <Button
          disabled={index === scenarios.length - 1}
          onClick={() => setIndex((i) => i + 1)}
        >
          {t("nextScenario")}
        </Button>
      </div>
      <p className="prep-disclaimer">{t("safetyNote")}</p>
    </section>
  );
}
