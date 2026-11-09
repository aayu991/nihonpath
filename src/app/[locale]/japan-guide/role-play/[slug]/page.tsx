import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadGuides } from "@/lib/guides/server";
import { GuideNotice } from "@/components/guides/article";
import { GuideRolePlay } from "@/components/guides/role-play";
import { aiConfig } from "@/lib/ai/config";
import { loadScenarios } from "@/lib/ai/server";
export default async function RolePlay({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params,
    { catalog, demo } = await loadGuides(),
    article = catalog.articles.find((a) =>
      a.content.roleplays.some((s) => s.slug === slug),
    ),
    script = article?.content.roleplays.find((s) => s.slug === slug);
  if (!article || !script) notFound();
  const [t, ai] = await Promise.all([
    getTranslations("Guide"),
    loadScenarios(),
  ]);
  return (
    <section className="container guide-roleplay-page">
      <nav aria-label="Breadcrumb">
        <Link href="/japan-guide">{t("back")}</Link> /{" "}
        <Link href={`/japan-guide/${article.slug}`}>
          {locale === "ja"
            ? (catalog.translations.find(
                (v) => v.article_id === article.id && v.locale === "ja",
              )?.title ?? article.title)
            : article.title}
        </Link>
      </nav>
      <h1>{locale === "ja" ? script.title_ja : script.title}</h1>
      <GuideNotice demo={demo} />
      <GuideRolePlay
        script={script}
        demo={demo}
        live={
          !demo &&
          aiConfig().live &&
          ai.database &&
          ai.scenarios.some((s) => s.id === script.scenario_id)
        }
      />
    </section>
  );
}
