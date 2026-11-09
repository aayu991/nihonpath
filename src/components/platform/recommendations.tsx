import { getTranslations } from "next-intl/server";
import { recommendCategories, type LearningGoal } from "@/lib/platform/catalog";
import { LearningCard } from "./learning-card";
export async function Recommendations({ goals }: { goals: LearningGoal[] }) {
  const t = await getTranslations("Platform");
  const keys = recommendCategories(goals);
  return (
    <section className="recommendations">
      <div className="platform-section-heading">
        <p className="eyebrow">NIHONPATH · YOUR PATH</p>
        <h2>{t("recommendations")}</h2>
        <p>{t("recommendationIntro")}</p>
      </div>
      {keys.length ? (
        <div className="path-card-grid">
          {keys.map((key) => (
            <LearningCard
              key={key}
              title={t(`categories.${key}.label`)}
              description={t(`categories.${key}.description`)}
              href={`/${key}`}
              planned={
                ![
                  "learn",
                  "jlpt",
                  "jft-basic",
                  "ssw",
                  "ai-practice",
                  "life-in-japan",
                  "organizations",
                ].includes(key)
              }
              status={t(
                [
                  "learn",
                  "jlpt",
                  "jft-basic",
                  "ssw",
                  "ai-practice",
                  "life-in-japan",
                  "organizations",
                ].includes(key)
                  ? "available"
                  : "comingSoon",
              )}
            />
          ))}
        </div>
      ) : (
        <p className="empty-note">{t("onboardingCta")}</p>
      )}
    </section>
  );
}
