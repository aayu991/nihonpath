import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLevel } from "@/lib/courses";
import { getStudyCards, getStudyCourse } from "@/lib/learning/study-server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FlashcardDeck } from "@/components/flashcards/flashcard-deck";
import { Link } from "@/i18n/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ review?: string; deck?: string }>;
}) {
  const { level } = await params;
  if (!isLevel(level)) notFound();
  const t = await getTranslations("Learning");
  const user = await getCurrentUser();
  const { review, deck } = await searchParams;
  const data = await getStudyCards(level, deck);
  const course = await getStudyCourse(level);
  const quiz = course.banks.find((bank) => bank.subject === "grammar");
  let cards = data.cards;
  let dueError = false;
  if (review === "due" && user && !data.demo) {
    const client = await createClient();
    const due = await client
      ?.from("flashcard_schedule")
      .select("flashcard_id")
      .eq("user_id", user.id)
      .lte("due_at", new Date().toISOString());
    cards = cards.filter((c) =>
      due?.data?.some((d) => d.flashcard_id === c.id),
    );
    dueError = !client || !!due?.error;
  }
  return (
    <section className="container learning-page">
      <Link className="text-link" href={`/courses/${level}`}>
        ← {t("backCourse")}
      </Link>
      <div className="learning-heading">
        <p className="eyebrow">JLPT {level.toUpperCase()}</p>
        <h1>{t("flashcards")}</h1>
        <p>
          {t(
            data.demo
              ? "demoNotice"
              : user
                ? "signedInReviews"
                : "guestCompletion",
          )}
        </p>
        <p>{t("scheduleRule")}</p>
      </div>
      {(data.error || dueError) && <p role="alert">{t("databaseError")}</p>}
      {cards.length ? (
        <FlashcardDeck cards={cards} member={!!user && !data.demo} />
      ) : (
        <p className="empty-note">
          {!dueError && t(review === "due" ? "noDue" : "noCards")}
        </p>
      )}
      <nav className="study-resource-links">
        {quiz && (
          <Link
            href={`/courses/${level}/practice/${quiz.id}`}
            className="text-link"
          >
            {t("takeQuiz")} →
          </Link>
        )}
        <Link href={`/courses/${level}`} className="text-link">
          {t("selectSubject")} →
        </Link>
        <Link href="/dashboard" className="text-link">
          {t("dashboard")} →
        </Link>
      </nav>
    </section>
  );
}
