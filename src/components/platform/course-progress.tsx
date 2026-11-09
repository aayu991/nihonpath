import { getTranslations } from "next-intl/server";
export async function CourseProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const t = await getTranslations("Platform");
  return (
    <div className="course-progress-widget">
      <h3>{t("progress")}</h3>
      {total > 0 ? (
        <>
          <p>{t("progressValue", { completed, total })}</p>
          <progress
            value={Math.min(completed, total)}
            max={total}
            aria-label={t("progress")}
          />
        </>
      ) : (
        <p>{t("progressEmpty")}</p>
      )}
    </div>
  );
}
