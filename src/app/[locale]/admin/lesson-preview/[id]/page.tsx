import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { StudyLessonViewer } from "@/components/learning/lesson-viewer";
import { studyBody } from "@/lib/learning/study-server";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
export default async function Preview({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireUser(locale);
  const t = await getTranslations("Learning");
  const admin = await getAdminContext();
  if (!admin)
    return (
      <section className="container learning-page">
        <p role="alert">{t("accessDenied")}</p>
      </section>
    );
  if (!z.uuid().safeParse(id).success) notFound();
  const lesson = await admin.client
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single();
  if (!lesson.data) notFound();
  const course = await admin.client
    .from("courses")
    .select("slug")
    .eq("id", lesson.data.course_id)
    .single();
  return (
    <section className="container learning-page">
      <Link href={`/admin/content/lesson?id=${id}`} className="text-link">
        ← {t("learningStudio")}
      </Link>
      <StudyLessonViewer
        preview
        member={false}
        lesson={{
          id,
          courseId: lesson.data.course_id,
          level: course.data?.slug ?? "n5",
          subject: lesson.data.subject,
          title: lesson.data.title,
          position: lesson.data.position,
          body: studyBody(lesson.data.body),
        }}
      />
    </section>
  );
}
