import { metadataFor } from "@/lib/seo/metadata";
import { seoText, type SeoLocale } from "@/lib/seo/catalog";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLevel } from "@/lib/courses";
import { getStudyCourse } from "@/lib/learning/study-server";
import { getCurrentUser } from "@/lib/auth/session";
import { CourseDashboard } from "@/components/learning/course-dashboard";
import { CourseEnrollment } from "@/components/learning/course-enrollment";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { publishedCmsMetadata } from "@/lib/cms/seo";
import { PublishedMedia } from "@/components/cms/published-media";
export default async function Course({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  if (!isLevel(level)) notFound();
  const c = await getTranslations("Courses");
  const t = await getTranslations("Learning");
  const data = await getStudyCourse(level);
  const user = await getCurrentUser();
  const client = await createClient();
  const managed = client
    ? await client.rpc("cms_public_course", { p_slug: level })
    : null;
  const info = z
    .object({
      id: z.uuid(),
      title: z.string(),
      description: z.string().nullable(),
    })
    .safeParse(managed?.data);
  return (
    <section className="container learning-page course-dashboard">
      <Link href="/courses" className="text-link">
        ← {t("allCourses")}
      </Link>
      <p className="eyebrow">JLPT {level.toUpperCase()}</p>
      <h1>{info.success ? info.data.title : c(`${level}Title`)}</h1>
      <p>
        {info.success && info.data.description
          ? info.data.description
          : c(`${level}Desc`)}
      </p>
      {info.success && <PublishedMedia kind="course" id={info.data.id} />}
      <Link href="/exams" className="text-link">
        {(await getTranslations("Exams"))("title")} →
      </Link>
      {data.demo && (
        <p role="status" className="learning-notice">
          {t("demoNotice")}
        </p>
      )}
      {data.error && (
        <p role="alert" className="learning-notice">
          {t("databaseError")}
        </p>
      )}
      {user && data.courseId && !data.demo && (
        <CourseEnrollment courseId={data.courseId} enrolled={data.enrolled} />
      )}
      <CourseDashboard
        level={level}
        lessons={data.lessons}
        banks={data.banks}
        demo={data.demo}
        trackProgress={!!user && !data.demo && !data.error}
      />
      <Link href="/dashboard" className="text-link">
        {t("dashboard")} →
      </Link>
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; level: string }>;
}) {
  const { locale, level } = await params;
  if (!isLevel(level)) return { robots: { index: false, follow: false } };
  const client = await createClient();
  const managed = client
    ? await client.rpc("cms_public_course", { p_slug: level })
    : null;
  const info = z
    .object({ id: z.uuid(), title: z.string() })
    .safeParse(managed?.data);
  if (info.success)
    return publishedCmsMetadata(
      "course",
      info.data.id,
      locale,
      `courses/${level}`,
      info.data.title,
    );
  const text = seoText("courses", locale as SeoLocale);
  return metadataFor("courses/" + level, locale, {
    ...text,
    title: "JLPT " + level.toUpperCase() + " — " + text.title,
    description: "JLPT " + level.toUpperCase() + " — " + text.description,
  });
}
