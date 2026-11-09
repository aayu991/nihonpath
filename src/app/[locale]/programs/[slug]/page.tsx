import { contentText } from "@/lib/platform/localized-content";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { LearningCard } from "@/components/platform/learning-card";
export default async function Program({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("Platform");
  const locale = await getLocale();
  const client = await createClient();
  if (!client)
    return (
      <section className="container preview-page">
        <h1>{t("catalogTitle")}</h1>
        <p role="alert">{t("dbUnavailable")}</p>
      </section>
    );
  const { data: program, error } = await client
    .from("learning_programs")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (error || !program) notFound();
  const [courses, translation] = await Promise.all([
    client
      .from("courses")
      .select("id,slug,title")
      .eq("program_id", program.id)
      .eq("published", true)
      .order("title"),
    client
      .from("content_translations")
      .select("title,content")
      .eq("program_id", program.id)
      .eq("locale", locale)
      .eq("published", true)
      .maybeSingle(),
  ]);
  if (courses.error || translation.error)
    return (
      <section className="container preview-page">
        <h1>{program.title}</h1>
        <p role="alert">{t("dbUnavailable")}</p>
      </section>
    );
  return (
    <section className="container platform-section">
      <div className="page-hero">
        <p className="eyebrow">NIHONPATH · {t("published")}</p>
        <h1>{translation.data?.title ?? program.title}</h1>
        <p>
          {contentText(translation.data?.content, "summary") || program.summary}
        </p>
      </div>
      <div className="path-card-grid">
        {courses.data?.length ? (
          courses.data.map((course) => (
            <LearningCard
              key={course.id}
              title={course.title}
              description={t("continue")}
              href={`/programs/${slug}/${course.slug}`}
              status={t("available")}
            />
          ))
        ) : (
          <p className="empty-note">{t("catalogEmpty")}</p>
        )}
      </div>
    </section>
  );
}
