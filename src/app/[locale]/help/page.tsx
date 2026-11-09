import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
import { BreadcrumbMetadata } from "@/components/launch/breadcrumbs";
export const generateMetadata = pageMetadata("help");
export default async function Help() {
  const t = await getTranslations("Launch"),
    locale = await getLocale();
  return (
    <section className="container launch-page">
      <p className="eyebrow">NIHONPATH / SUPPORT</p>
      <h1>{t("help")}</h1>
      <p className="launch-intro">{t("intro")}</p>
      <div className="launch-grid">
        {(t.raw("categories") as string[]).map((category, i) => (
          <Link
            className="launch-card"
            href={`/help/faq#topic-${i}`}
            key={category}
          >
            <h2>{category}</h2>
            <p>{t("faq")} →</p>
          </Link>
        ))}
      </div>
      <nav className="launch-actions">
        <Link href="/contact">{t("contact")} →</Link>
        <Link href="/legal/privacy">{t("privacy")} →</Link>
      </nav>
      <BreadcrumbMetadata
        path="help"
        locale={locale as "en" | "ja" | "ne" | "hi"}
      />
    </section>
  );
}
