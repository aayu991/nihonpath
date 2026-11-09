import { getTranslations } from "next-intl/server";
export default async function Loading() {
  const t = await getTranslations("Tutor");
  return (
    <div className="container tutor-loading" role="status">
      {t("saving")}
    </div>
  );
}
