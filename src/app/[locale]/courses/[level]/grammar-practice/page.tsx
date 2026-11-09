import { redirect } from "next/navigation";
import { getStudyCourse } from "@/lib/learning/study-server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getQuizPrompts } from "@/lib/learning/quiz-server";
import { getCurrentUser } from "@/lib/auth/session";
import { QuizEngine } from "@/components/quiz/quiz-engine";
import { Link } from "@/i18n/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ level: string; locale: string }>;
}) {
  const { level, locale } = await params;
  if (level === "n5") {
    const course = await getStudyCourse(level);
    const bank = course.banks.find((b) => b.subject === "grammar");
    if (bank) redirect(`/${locale}/courses/${level}/practice/${bank.id}`);
  }
  if (level !== "n4") notFound();
  const t = await getTranslations("Study");
  const user = await getCurrentUser();
  return (
    <section className="container learning-page">
      <div className="learning-heading">
        <Link className="text-link" href="/courses/n4">
          ← {t("back")}
        </Link>
        <p className="eyebrow">JLPT N4 · GRAMMAR</p>
        <h1>{t("grammar")}</h1>
        <p>{t(user ? "member" : "demo")}</p>
      </div>
      <QuizEngine questions={getQuizPrompts()} member={!!user} />
    </section>
  );
}
