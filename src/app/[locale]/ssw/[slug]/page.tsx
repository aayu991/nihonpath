import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { sectorContent, prepQuiz,prepResources } from "@/lib/preparation/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  PreparationNotice,
  PrepBreadcrumb,
  PreparationSources,
} from "@/components/preparation/shared";
import { WorkplaceScenarios } from "@/components/preparation/scenarios";
import { PreparationProgress } from "@/components/preparation/progress";
import { CourseEnrollment } from "@/components/learning/course-enrollment";
import { Link } from "@/i18n/navigation";
export default async function Industry({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    data = await sectorContent(slug);
  if (!data) notFound();
  const t = await getTranslations("Preparation"),
    locale = await getLocale(),
    user = await getCurrentUser(),
    client = await createClient();
  const enrolled =
    user && !data.demo
      ? await client
          ?.from("course_enrollments")
          .select("course_id")
          .eq("course_id", data.sector.courseId)
          .maybeSingle()
      : null;
  const scenarios = (
    await Promise.all(
      data.scenarios.map(async (s) => {
        const q = await prepQuiz(s.bankId);
        return q ? { ...s, questions: q.questions } : null;
      }),
    )
  ).filter((s) => s !== null);
  return (
    <section className="container prep-page prep-study">
      <PrepBreadcrumb ssw />
      <p className="eyebrow">SSW / WORKPLACE JAPANESE</p>
      <h1>{locale === "ja" ? data.sector.titleJa : data.sector.title}</h1>
      <p>{locale === "ja" ? data.sector.summaryJa : data.sector.summary}</p>
      <PreparationNotice demo={data.demo} />
      {data.error && <p role="alert">{t("loadError")}</p>}
      {user && !data.demo && (
        <CourseEnrollment
          courseId={data.sector.courseId}
          enrolled={!!enrolled?.data}
        />
      )}
      <div className="prep-resource-grid">
        <Link className="prep-card" href={`/ssw/${slug}/flashcards`}>
          <h2>{t("vocabularyTitle")}</h2>
          <p>{t("vocabularyDesc")}</p>
          <span className="text-link">{t("studyDeck")} →</span>
        </Link>
        {data.sector.bankId && (
          <Link className="prep-card" href={`/ssw/${slug}/practice`}>
            <h2>{t("industryQuiz")}</h2>
            <p>{t("industryQuizDesc")}</p>
            <span className="text-link">{t("startPractice")} →</span>
          </Link>
        )}
        <Link className="prep-card" href="/interview-preparation">
          <h2>{t("interviewTitle")}</h2>
          <p>{t("interviewCardDesc")}</p>
          <span className="text-link">{t("startPractice")} →</span>
        </Link>
      </div>
      <WorkplaceScenarios scenarios={scenarios} member={!!user && !data.demo} />
      <PreparationProgress scope={slug} />
      <PreparationSources resources={(await prepResources('ssw')).filter(r=>!r.sectorId||r.sectorId===data.sector.id)}/>
    </section>
  );
}
