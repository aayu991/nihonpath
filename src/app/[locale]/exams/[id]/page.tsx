import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { loadExam } from "@/actions/exams";
import { ExamEngine } from "@/components/exams/exam-engine";
import { Link } from "@/i18n/navigation";
export default async function Attempt({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireUser(locale);
  const exam = await loadExam(id);
  if (!exam) notFound();
  const t = await getTranslations("Exams");
  return (
    <section className="container exam-page">
      <Link className="text-link" href="/exams">
        ← {t("title")}
      </Link>
      <ExamEngine initial={exam} />
    </section>
  );
}
