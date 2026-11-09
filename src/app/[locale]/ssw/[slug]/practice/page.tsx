import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { sectorContent, prepQuiz } from "@/lib/preparation/server";
import { getCurrentUser } from "@/lib/auth/session";
import { QuizEngine } from "@/components/quiz/quiz-engine";
import {
  PreparationNotice,
  PrepBreadcrumb,
} from "@/components/preparation/shared";
export default async function Practice({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    data = await sectorContent(slug);
  if (!data?.sector.bankId) notFound();
  const quiz = await prepQuiz(data.sector.bankId);
  if (!quiz) notFound();
  const t = await getTranslations("Preparation"),
    user = await getCurrentUser();
  return (
    <section className="container prep-page prep-study">
      <PrepBreadcrumb ssw />
      <h1>
        {data.sector.title} · {t("industryQuiz")}
      </h1>
      <PreparationNotice demo={quiz.demo} />
      <QuizEngine
        questions={quiz.questions}
        bankId={quiz.bank.id}
        member={!!user && !quiz.demo}
        title={quiz.bank.title}
      />
    </section>
  );
}
