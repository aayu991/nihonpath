import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { isLevel } from "@/lib/courses";
import { getStudyQuiz } from "@/lib/learning/study-server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { QuizEngine } from "@/components/quiz/quiz-engine";
import { Link } from "@/i18n/navigation";
export default async function Practice({
  params,
}: {
  params: Promise<{ level: string; bankId: string }>;
}) {
  const { level, bankId } = await params;
  if (!isLevel(level) || !z.uuid().safeParse(bankId).success) notFound();
  const data = await getStudyQuiz(level, bankId);
  if (!data) notFound();
  const t = await getTranslations("Learning");
  const user = await getCurrentUser();
  const client = await createClient();
  const history =
    user && !data.demo
      ? await client
          ?.from("quiz_attempts")
          .select("id,score,total,created_at")
          .eq("user_id", user.id)
          .eq("bank_id", bankId)
          .order("created_at", { ascending: false })
          .limit(10)
      : null;
  return (
    <section className="container learning-page">
      <Link href={`/courses/${level}`} className="text-link">
        ← {t("backCourse")}
      </Link>
      <div className="learning-heading">
        <p className="eyebrow">
          JLPT {level.toUpperCase()} · {t(`subjects.${data.bank.subject}`)}
        </p>
        <h1>{data.bank.title}</h1>
        <p>
          {t(data.demo ? "demoNotice" : user ? "quizSaved" : "guestCompletion")}
        </p>
      </div>
      <QuizEngine
        questions={data.questions}
        bankId={bankId}
        title={data.bank.title}
        member={!!user && !data.demo}
      />
      {history?.error ? (
        <p role="alert">{t("databaseError")}</p>
      ) : (
        history?.data && (
          <section className="attempt-history">
            <h2>{t("history")}</h2>
            {history.data.length ? (
              <ul>
                {history.data.map((a) => (
                  <li key={a.id}>
                    <time dateTime={a.created_at}>
                      {a.created_at.slice(0, 10)}
                    </time>{" "}
                    · {a.score}/{a.total}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("noAttempts")}</p>
            )}
          </section>
        )
      )}
      <nav className="study-resource-links">
        <Link href={`/courses/${level}/flashcards`} className="text-link">
          {t("flashcards")} →
        </Link>
        <Link href="/dashboard" className="text-link">
          {t("dashboard")} →
        </Link>
      </nav>
    </section>
  );
}
