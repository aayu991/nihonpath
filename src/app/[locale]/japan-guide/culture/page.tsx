import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadGuides } from "@/lib/guides/server";
import { GuideNotice } from "@/components/guides/article";
export default async function Culture({
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
      <h1>{t("culture")}</h1>
      <GuideNotice demo={demo} />
      <div className="guide-article-grid">
        {catalog.articles
          .filter((a) => a.format === "lesson")
          .map((a) => (
            <article key={a.id} className="guide-article-card">
              <span className="guide-rule">
                {t(`kinds.${a.content.sections[0].kind}`)}
              </span>
              <h2>
                <Link href={`/japan-guide/${a.slug}`}>
                  {locale === "ja"
                    ? (catalog.translations.find(
                        (v) => v.article_id === a.id && v.locale === "ja",
                      )?.title ?? a.title)
                    : a.title}
                </Link>
              </h2>
              <Link
                className="text-link"
                href={`/japan-guide/${a.slug}/practice`}
              >
                {t("quiz")} →
              </Link>
            </article>
          ))}
      </div>
    </section>
  );
}
