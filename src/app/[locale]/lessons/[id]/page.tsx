import { isLevel } from "@/lib/courses";
import { demoLessons, demoBanks } from "@/lib/learning/study-catalog";
import { getStudyCourse, studyBody } from "@/lib/learning/study-server";
import { StudyLessonViewer } from "@/components/learning/lesson-viewer";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { LessonModule } from "@/components/platform/lesson-module";
import { Japanese } from "@/components/learning/japanese";
import { Link } from "@/i18n/navigation";
import { bankId } from "@/lib/learning/content";
import type { Json } from "@/lib/supabase/database.types";
import { PublishedMedia } from "@/components/cms/published-media";
import { publishedCmsMetadata } from "@/lib/cms/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  if (!z.uuid().safeParse(id).success)
    return { robots: { index: false, follow: false } };
  const client = await createClient();
  const row = client
    ? await client
        .from("lessons")
        .select("title,slug,course_id")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle()
    : null;
  if (!row?.data)
    return {
      title: "Lesson unavailable",
      robots: { index: false, follow: false },
    };
  const course = await client
    ?.from("courses")
    .select("slug")
    .eq("id", row.data.course_id)
    .maybeSingle();
  return publishedCmsMetadata(
    "lesson",
    id,
    locale,
    course?.data
      ? `courses/${course.data.slug}/lessons/${row.data.slug}`
      : `lessons/${id}`,
    row.data.title,
  );
}
function textFrom(value: Json, key = "text") {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value[key] === "string"
    ? value[key]
    : "";
}
export default async function Lesson({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const t = await getTranslations("Platform");
  const locale = await getLocale();
  const client = await createClient();
  if (client) {
    const gate = await client.rpc("billing_resource_access", {
      p_table: "lessons",
      p_id: id,
    });
    if (!gate.error && gate.data === false) {
      const b = await getTranslations("Billing");
      return (
        <section className="container billing-page">
          <h1>{b("premium")}</h1>
          <p>{b("sign_in")}</p>
          <Link href="/pricing">{b("checkout")} →</Link>
        </section>
      );
    }
  }
  if (!client) {
    const demo = demoLessons.find((l) => l.id === id);
    if (!demo) notFound();
    const group = demoLessons.filter(
      (l) => l.level === demo.level && l.subject === demo.subject,
    );
    const index = group.findIndex((l) => l.id === id);
    return (
      <section className="container learning-page">
        <StudyLessonViewer
          lesson={{ ...demo, demo: true }}
          previous={group[index - 1]}
          next={group[index + 1]}
          member={false}
          bankId={
            demoBanks.find(
              (b) => b.level === demo.level && b.subject === demo.subject,
            )?.id
          }
        />
      </section>
    );
  }
  const lesson = await client
    .from("lessons")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .single();
  if (!lesson.data) {
    if (lesson.error && lesson.error.code !== "PGRST116") {
      const demo = demoLessons.find((l) => l.id === id);
      if (demo) {
        const group = demoLessons.filter(
          (l) => l.level === demo.level && l.subject === demo.subject,
        );
        const index = group.findIndex((l) => l.id === id);
        return (
          <section className="container learning-page">
            <StudyLessonViewer
              lesson={{ ...demo, demo: true }}
              previous={group[index - 1]}
              next={group[index + 1]}
              member={false}
              bankId={
                demoBanks.find(
                  (b) => b.level === demo.level && b.subject === demo.subject,
                )?.id
              }
            />
          </section>
        );
      }
    }
    notFound();
  }
  const course = await client
    .from("courses")
    .select("slug,program_id")
    .eq("id", lesson.data.course_id)
    .single();
  const program = course.data?.program_id
    ? await client
        .from("learning_programs")
        .select("slug")
        .eq("id", course.data.program_id)
        .eq("published", true)
        .maybeSingle()
    : null;
  const courseHref = program?.data
    ? `/programs/${program.data.slug}/${course.data?.slug}`
    : undefined;
  const studyCourse = await getStudyCourse(course.data?.slug ?? "n5");
  const group = studyCourse.lessons.filter(
    (l) => l.subject === lesson.data.subject,
  );
  const index = group.findIndex((l) => l.id === id);
  const [blocks, translation] = await Promise.all([
    client
      .from("lesson_blocks")
      .select("*")
      .eq("lesson_id", id)
      .eq("published", true)
      .order("position"),
    client
      .from("content_translations")
      .select("title,content")
      .eq("lesson_id", id)
      .eq("locale", locale)
      .eq("published", true)
      .maybeSingle(),
  ]);
  const blockTranslations = await client
    .from("content_translations")
    .select("block_id,title,content")
    .in(
      "block_id",
      (blocks.data ?? []).map((item) => item.id),
    )
    .eq("locale", locale)
    .eq("published", true);
  const deckRefs = (blocks.data ?? []).flatMap((b) =>
    b.deck_id ? [b.deck_id] : [],
  );
  const bankRefs = (blocks.data ?? []).flatMap((b) =>
    b.question_bank_id ? [b.question_bank_id] : [],
  );
  const [referencedDecks, referencedBanks, resourceCourses] = await Promise.all(
    [
      deckRefs.length
        ? client
            .from("flashcard_decks")
            .select("id,course_id")
            .in("id", deckRefs)
            .eq("published", true)
        : Promise.resolve({ data: [], error: null }),
      bankRefs.length
        ? client
            .from("question_banks")
            .select("id,course_id")
            .in("id", bankRefs)
            .eq("published", true)
        : Promise.resolve({ data: [], error: null }),
      deckRefs.length || bankRefs.length
        ? client.from("courses").select("id,slug").eq("published", true)
        : Promise.resolve({ data: [], error: null }),
    ],
  );
  const deckLevel = (deckId: string) =>
    resourceCourses.data?.find(
      (c) =>
        c.id === referencedDecks.data?.find((d) => d.id === deckId)?.course_id,
    )?.slug;
  const bankLevel = (id: string) =>
    resourceCourses.data?.find(
      (c) => c.id === referencedBanks.data?.find((b) => b.id === id)?.course_id,
    )?.slug;
  const user = await getCurrentUser();
  const progress = user
    ? await client
        .from("lesson_progress")
        .select("completed_at")
        .eq("user_id", user.id)
        .eq("lesson_id", id)
        .maybeSingle()
    : null;
  return (
    <section className="container published-lesson">
      <StudyLessonViewer
        courseHref={courseHref}
        lesson={{
          id,
          courseId: lesson.data.course_id,
          level: course.data?.slug ?? "n5",
          subject: lesson.data.subject,
          title: translation.data?.title ?? lesson.data.title,
          position: lesson.data.position,
          body: studyBody(translation.data?.content ?? lesson.data.body),
          completed: !!progress?.data?.completed_at,
        }}
        previous={group[index - 1]}
        next={group[index + 1]}
        member={!!user}
        bankId={
          studyCourse.banks.find((b) => b.subject === lesson.data.subject)?.id
        }
      >
        <PublishedMedia kind="lesson" id={id} />
        {blocks.error ||
        translation.error ||
        blockTranslations.error ||
        referencedDecks.error ||
        referencedBanks.error ||
        resourceCourses.error ? (
          <p role="alert" className="form-message error">
            {t("dbUnavailable")}
          </p>
        ) : (
          blocks.data?.map((block, index) => (
            <LessonModule
              key={block.id}
              index={index + 1}
              title={
                blockTranslations.data?.find(
                  (item) => item.block_id === block.id,
                )?.title ||
                textFrom(block.content, "title") ||
                block.kind
              }
              status={t("published")}
            >
              {block.kind === "text" ? (
                <p className="lesson-text">
                  {textFrom(
                    blockTranslations.data?.find(
                      (item) => item.block_id === block.id,
                    )?.content ?? block.content,
                  )}
                </p>
              ) : block.kind === "example" ? (
                <div className="example-sentence">
                  <Japanese
                    text={textFrom(
                      blockTranslations.data?.find(
                        (item) => item.block_id === block.id,
                      )?.content ?? block.content,
                    )}
                  />
                  <p className="lesson-block-translation">
                    {textFrom(
                      blockTranslations.data?.find(
                        (item) => item.block_id === block.id,
                      )?.content ?? block.content,
                      "translation",
                    )}
                  </p>
                </div>
              ) : block.kind === "flashcards" &&
                block.deck_id &&
                isLevel(deckLevel(block.deck_id) ?? "") ? (
                <Link
                  href={`/courses/${deckLevel(block.deck_id)}/flashcards?deck=${block.deck_id}`}
                  className="text-link"
                >
                  {t("deck")} →
                </Link>
              ) : block.kind === "quiz" &&
                block.question_bank_id &&
                isLevel(bankLevel(block.question_bank_id) ?? "") ? (
                <Link
                  href={
                    block.question_bank_id === bankId
                      ? "/courses/n4/grammar-practice"
                      : `/courses/${bankLevel(block.question_bank_id)}/practice/${block.question_bank_id}`
                  }
                  className="text-link"
                >
                  {t("fullPractice")} →
                </Link>
              ) : (
                <p>{t("comingSoon")}</p>
              )}
            </LessonModule>
          ))
        )}
      </StudyLessonViewer>
    </section>
  );
}
