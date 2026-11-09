import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadGuides, guideUser } from "@/lib/guides/server";
import { relevantItems } from "@/lib/guides/schema";
export async function GuideDashboardProgress() {
  const [t, data, user] = await Promise.all([
    getTranslations("Guide"),
    loadGuides(),
    guideUser(),
  ]);
  const items = relevantItems(data.catalog, user.preferences),
    completed = items.filter((i) =>
      user.progress.some(
        (p) =>
          p.item_id === i.id && p.completed && p.item_version === i.version,
      ),
    ).length;
  return (
    <section className="guide-progress-panel">
      <h2>{t("checklist")}</h2>
      {!data.demo && !user.error && user.hasPlan ? (
        <>
          <p>
            {completed} / {items.length} {t("done")}
          </p>
          <progress
            aria-label={t("progress")}
            max={items.length || 1}
            value={completed}
          />
          <p className="guide-fine">{t("notCompliance")}</p>
        </>
      ) : (
        <p>{t(data.demo ? "sessionOnly" : "personalize")}</p>
      )}
      <Link className="text-link" href="/japan-guide/my-checklist">
        {t("checklist")} →
      </Link>
    </section>
  );
}
