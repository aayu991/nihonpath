import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { examResultSchema } from "@/lib/exams/schema";
import { AnswerReview } from "@/components/exams/exam-engine";
import { Link } from "@/i18n/navigation";
export default async function Mistakes({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const t = await getTranslations("Exams"),
    client = await createClient();
  const data = client
    ? await client
        .from("exam_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
    : null;
  const answers = (data?.data ?? [])
    .flatMap((r) => examResultSchema.safeParse(r.result).data?.answers ?? [])
    .filter((a) => !a.correct);
  return (
    <section className="container exam-page">
      <Link className="text-link" href="/exams">
        ← {t("title")}
      </Link>
      <h1>{t("mistakes")}</h1>
      <p>{t("mistakesNote")}</p>
      {data?.error ? (
        <p role="alert">{t("historyError")}</p>
      ) : answers.length ? (
        <AnswerReview answers={answers} />
      ) : (
        <p>{t("noMistakes")}</p>
      )}
    </section>
  );
}
