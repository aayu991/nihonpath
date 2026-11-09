import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prepQuiz } from "@/lib/preparation/server";
import { getCurrentUser } from "@/lib/auth/session";
import { QuizEngine } from "@/components/quiz/quiz-engine";
import {
  PreparationNotice,
  PrepBreadcrumb,
} from "@/components/preparation/shared";
export default async function Practice({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await prepQuiz(id);
  if (!data || !["quick", "section"].includes(data.bank.mode)) notFound();
  const t = await getTranslations("Preparation"),
    user = await getCurrentUser();
  const categories=['word-meaning','word-usage','kanji-reading','grammar-expression','situational-conversation','signs-notices','messages-schedules'] as const;
  const category=categories.find(c=>c===data.bank.category);
  const title=category?`${t(category)} · ${t(data.bank.mode==='quick'?'quick':'section')}`:data.bank.title;
  return (
    <section className="container prep-page prep-study">
      <PrepBreadcrumb />
      <p className="eyebrow">JFT-BASIC / {data.bank.mode.toUpperCase()}</p>
      <h1>{title}</h1>
      <p>{t("practiceNote")}</p>
      <PreparationNotice demo={data.demo} />
      <QuizEngine
        questions={data.questions}
        bankId={data.bank.id}
        title={title}
        member={!!user && !data.demo}
      />
    </section>
  );
}
