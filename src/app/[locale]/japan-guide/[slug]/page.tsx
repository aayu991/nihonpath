import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadGuides, guideLearning } from "@/lib/guides/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  GuideHeader,
  GuideTableOfContents,
  GuideContent,
  OfficialSourceLinks,
  RelatedJapaneseVocabulary,
  RelatedLessons,
  RelatedRolePlay,
  GuideNotice,
} from "@/components/guides/article";
import { ArticleFeedback } from "@/components/guides/feedback";
import { metadataFor } from "@/lib/seo/metadata";
import type { SeoLocale } from "@/lib/seo/catalog";
import { PublishedMedia } from "@/components/cms/published-media";
import { applyCmsSeo } from "@/lib/cms/seo";
import { createClient } from "@/lib/supabase/server";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params,
    data = await loadGuides(),
    a = data.catalog.articles.find((x) => x.slug === slug);
  if (!a) return { robots: { index: false, follow: false } };
  const tr = data.catalog.translations.find(
      (x) => x.article_id === a.id && x.locale === locale,
    ),
    translated = [
      "en",
      ...data.catalog.translations
        .filter((x) => x.article_id === a.id)
        .map((x) => x.locale),
    ] as SeoLocale[];
  const metadata = metadataFor(`japan-guide/${slug}`, locale, {
    title: tr?.title ?? a.title,
    description: tr?.summary ?? a.summary,
    translated: [...new Set(translated)],
    indexable: !data.demo,
  });
  const client = !data.demo ? await createClient() : null;
  const seo = client
    ? await client.rpc("cms_public_metadata", {
        p_kind: "guide_article",
        p_id: a.id,
      })
    : null;
  return applyCmsSeo(metadata, seo?.data);
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params,
    [data, t, user] = await Promise.all([
      loadGuides(),
      getTranslations("Guide"),
      getCurrentUser(),
    ]),
    article = data.catalog.articles.find((a) => a.slug === slug);
  if (!article) notFound();
  const translated = data.catalog.translations.find(
      (a) => a.article_id === article.id && a.locale === locale,
    ),
    content = translated?.content ?? article.content,
    learning = await guideLearning(article.id);
  return (
    <>
      <div className="container">
        <GuideHeader
          article={article}
          title={translated?.title ?? article.title}
          summary={translated?.summary ?? article.summary}
        />
      </div>
      <GuideNotice demo={data.demo} />
      <div className="container guide-article-layout">
        <GuideTableOfContents />
        <article className="guide-article-body">
          <GuideContent body={content} />
          <PublishedMedia kind="guide_article" id={article.id} />
          <RelatedJapaneseVocabulary cards={learning.cards} slug={slug} />
          {learning.questions.length > 0 && (
            <Link
              className="guide-quiz-link"
              href={`/japan-guide/${slug}/practice`}
            >
              {t("quiz")} →
            </Link>
          )}
          <RelatedLessons lessons={learning.lessons} />
          <RelatedRolePlay scripts={content.roleplays} locale={locale} />
          <OfficialSourceLinks
            sources={data.catalog.sources.filter((s) =>
              article.source_ids.includes(s.id),
            )}
          />
          <Link className="text-link" href="/japan-guide/my-checklist">
            {t("checklist")} →
          </Link>
          <ArticleFeedback
            articleId={article.id}
            enabled={!!user && !data.demo}
          />
        </article>
      </div>
    </>
  );
}
