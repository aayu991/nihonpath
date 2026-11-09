"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
const paths = {
  learn: ["/courses/n5", "/vocabulary", "/grammar"],
  study: ["/courses/n4", "/jlpt", "/life-in-japan"],
  work: ["/jft-basic", "/ssw", "/business"],
  jlpt: ["/courses", "/courses/n4/grammar-practice", "/flashcards"],
  travel: ["/courses/n5", "/life-in-japan", "/vocabulary"],
  business: ["/business", "/courses/n3", "/ai-practice"],
} as const;
type Goal = keyof typeof paths;
export function GoalPathways() {
  const t = useTranslations("HomePractice");
  const [goal, setGoal] = useState<Goal>("learn");
  return (
    <section
      className="section container goal-pathways"
      aria-labelledby="goal-title"
    >
      <p className="eyebrow">{t("pathEyebrow")}</p>
      <h2 id="goal-title">{t("goalTitle")}</h2>
      <p>{t("goalIntro")}</p>
      <div className="goal-options" role="group" aria-label={t("goalTitle")}>
        {(Object.keys(paths) as Goal[]).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={goal === key}
            onClick={() => setGoal(key)}
          >
            {t(`goals.${key}`)}
          </button>
        ))}
      </div>
      <div className="pathway-results" aria-live="polite">
        <h3>
          {t("recommended")} · {t(`goals.${goal}`)}
        </h3>
        <div className="pathway-grid">
          {paths[goal].map((href, i) => (
            <Link href={href} className="pathway-card" key={href}>
              <span className="eyebrow">0{i + 1}</span>
              <strong>{t(`resources.${goal}${i}`)}</strong>
              <span>
                {t(["/business"].includes(href) ? "comingSoon" : "explore")} →
              </span>
            </Link>
          ))}
        </div>
      </div>
      <p className="practice-note">
        {t("goalSession")}{" "}
        <Link href="/dashboard/goals" className="text-link">
          {t("saveGoals")}
        </Link>
      </p>
    </section>
  );
}
