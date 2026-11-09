import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
export default async function NotFound() {
  const t = await getTranslations("Preview");
  const c = await getTranslations("Common");
  return (
    <section className="container preview-page">
      <p className="eyebrow">404</p>
      <h1>{t("notFound")}</h1>
      <p>{t("notFoundDesc")}</p>
      <Link className="text-link" href="/">
        {c("back")}
      </Link>
    </section>
  );
}
