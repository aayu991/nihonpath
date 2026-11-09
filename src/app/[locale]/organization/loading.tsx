import { getTranslations } from "next-intl/server";
export default async function Loading() {
  const t = await getTranslations("Organization");
  return (
    <div role="status" aria-label={t("saving")} className="org-loading">
      <span className="loading-dot" />
    </div>
  );
}
