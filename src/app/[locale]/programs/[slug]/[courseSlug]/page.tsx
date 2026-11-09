import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { LessonModule } from "@/components/platform/lesson-module";
import { CourseProgress } from "@/components/platform/course-progress";
import { Link } from "@/i18n/navigation";
import { z } from "zod";
export default async function Course({
  params,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { slug, courseSlug } = await params;
  const t = await getTranslations("Platform");
  const locale = await getLocale();
  const client = await createClient();
  if (!client) notFound();
  const program = await client
    .from("learning_programs")
    .select("id,title")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!program.data) notFound();
  const course = await client
    .from("courses")
    .select("id,title")
    .eq("slug", courseSlug)
    .eq("program_id", program.data.id)
    .eq("published", true)
    .single();
  if (!course.data) notFound();
  const [modules, lessons, translation] = await Promise.all([
    client
      .from("course_modules")
      .select("id,title,position")
      .eq("course_id", course.data.id)
      .eq("published", true)
      .order("position"),
    client
      .from("lessons")
      .select("id,title,module_id,position")
      .eq("course_id", course.data.id)
      .eq("published", true)
      .order("position"),
    client
      .from("content_translations")
      .select("title")
      .eq("course_id", course.data.id)
      .eq("locale", locale)
      .eq("published", true)
      .maybeSingle(),
  ]);
  const moduleTranslations = await client
    .from("content_translations")
    .select("module_id,title")
    .in(
      "module_id",
      (modules.data ?? []).map((item) => item.id),
    )
    .eq("locale", locale)
    .eq("published", true);
  const user = await getCurrentUser();
  const progress = user
    ? await client.rpc("course_progress", { p_course: course.data.id })
    : null;
  const numbers = z
    .object({ total: z.number(), completed: z.number() })
    .safeParse(progress?.data);
  return (
    <section className="container platform-section">
      <Link href={`/programs/${slug}`} className="text-link">
        ← {program.data.title}
      </Link>
      <div className="page-hero">
        <p className="eyebrow">{t("course")}</p>
        <h1>{translation.data?.title ?? course.data.title}</h1>
      </div>
      {modules.error ||
      lessons.error ||
      translation.error ||
      moduleTranslations.error ? (
        <p role="alert" className="form-message error">
          {t("dbUnavailable")}
        </p>
      ) : (
        <>
          <div className="category-modules">
            {modules.data?.map((module, index) => (
              <LessonModule
                key={module.id}
                title={
                  moduleTranslations.data?.find(
                    (item) => item.module_id === module.id,
                  )?.title ?? module.title
                }
                index={index + 1}
                status={t("published")}
              >
                <ul className="lesson-link-list">
                  {lessons.data
                    .filter((lesson) => lesson.module_id === module.id)
                    .map((lesson) => (
                      <li key={lesson.id}>
                        <Link
                          className="text-link"
                          href={`/lessons/${lesson.id}`}
                        >
                          {lesson.title} →
                        </Link>
                      </li>
                    ))}
                </ul>
              </LessonModule>
            ))}
          </div>
          <ul className="lesson-link-list">
            {lessons.data
              ?.filter((lesson) => !lesson.module_id)
              .map((lesson) => (
                <li key={lesson.id}>
                  <Link className="text-link" href={`/lessons/${lesson.id}`}>
                    {lesson.title} →
                  </Link>
                </li>
              ))}
          </ul>
          {!lessons.data?.length && (
            <p className="empty-note">{t("moduleNote")}</p>
          )}
        </>
      )}
      {numbers.success && (
        <CourseProgress
          total={numbers.data.total}
          completed={numbers.data.completed}
        />
      )}
    </section>
  );
}
