import { getTranslations } from "next-intl/server";
export default async function Loading() {
  const t = await getTranslations("Common");
  return (
    <div role="status" className="container loading-shell">
      <p>{t("loading")}</p>
      <div className="loading-cards" aria-hidden="true">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
}
