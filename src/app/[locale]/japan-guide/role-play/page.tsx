import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadGuides } from "@/lib/guides/server";
import { GuideNotice } from "@/components/guides/article";
export default async function RolePlays({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    { catalog, demo } = await loadGuides(),
    t = await getTranslations("Guide");
  return (
    <section className="container guide-page-heading">
      <Link className="text-link" href="/japan-guide">
        {t("back")} →
      </Link>
      <h1>{t("roleplays")}</h1>
      <GuideNotice demo={demo} />
      <div className="guide-article-grid">
        {catalog.articles
          .flatMap((a) => a.content.roleplays)
          .map((s) => (
            <article key={s.slug} className="guide-article-card">
              <span className="guide-rule">{t("scripted")}</span>
              <h2>
                <Link href={`/japan-guide/role-play/${s.slug}`}>
                  {locale === "ja" ? s.title_ja : s.title} →
                </Link>
              </h2>
            </article>
          ))}
      </div>
    </section>
  );
}
