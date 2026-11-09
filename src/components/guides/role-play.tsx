"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Japanese } from "@/components/learning/japanese";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { GuideBody } from "@/lib/guides/schema";
export function GuideRolePlay({
  script,
  demo,
  live,
}: {
  script: GuideBody["roleplays"][number];
  demo: boolean;
  live: boolean;
}) {
  const t = useTranslations("Guide"),
    [count, setCount] = useState(1),
    [translation, setTranslation] = useState(true);
  return (
    <section className="guide-script">
      <p className="guide-rule">{t("scripted")}</p>
      <p>{demo ? t("scriptNote") : t("notCompliance")}</p>
      <label className="guide-inline-check">
        <input
          type="checkbox"
          checked={translation}
          onChange={(e) => setTranslation(e.target.checked)}
        />
        {t("translation")}
      </label>
      <div className="guide-script-lines" aria-live="polite">
        {script.dialogue.slice(0, count).map((line, i) => (
          <article key={i} className={i % 2 ? "guide-script-user" : ""}>
            <strong lang="ja">{line.speaker}</strong>
            <p>
              <Japanese text={line.ja} />
            </p>
            {translation && <p>{line.en}</p>}
          </article>
        ))}
      </div>
      <div className="prep-controls">
        <Button
          disabled={count === script.dialogue.length}
          onClick={() => setCount((c) => c + 1)}
        >
          {t("next")}
        </Button>
        <Button variant="outline" onClick={() => setCount(1)}>
          {t("restart")}
        </Button>
      </div>
      {live && (
        <>
          <Link
            className="text-link"
            href={`/ai-practice?scenario=${script.scenario_id}`}
          >
            {t("liveAi")} →
          </Link>
          <p className="guide-fine">{t("liveNote")}</p>
        </>
      )}
    </section>
  );
}
