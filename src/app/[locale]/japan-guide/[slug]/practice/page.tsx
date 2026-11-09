import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadGuides, guideLearning } from "@/lib/guides/server";
import { getCurrentUser } from "@/lib/auth/session";
import { QuizEngine } from "@/components/quiz/quiz-engine";
import { GuideNotice } from "@/components/guides/article";
export default async function Practice({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params,
    { catalog, demo } = await loadGuides(),
    article = catalog.articles.find((a) => a.slug === slug);
  if (!article || !article.bank_id) notFound();
  const [learning, user, t] = await Promise.all([
    guideLearning(article.id),
    getCurrentUser(),
    getTranslations("Guide"),
  ]);
  const title =
    catalog.translations.find(
      (a) => a.article_id === article.id && a.locale === locale,
    )?.title ?? article.title;
  return (
    <section className="container guide-learning-page">
      <nav aria-label="Breadcrumb">
        <Link href="/japan-guide">{t("back")}</Link> /{" "}
        <Link href={`/japan-guide/${slug}`}>{title}</Link>
      </nav>
      <h1>
        {title} · {t("quiz")}
      </h1>
      <GuideNotice demo={demo} />
      {learning.questions.length ? (
        <QuizEngine
          title={title}
          questions={learning.questions}
          bankId={article.bank_id}
          member={!!user && !demo}
          demo={demo}
        />
      ) : (
        <p>{t("empty")}</p>
      )}
    </section>
  );
}
