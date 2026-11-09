"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
export default function ExamError({ reset }: { reset: () => void }) {
  const t = useTranslations("Exams");
  return (
    <section className="container exam-page">
      <h1>{t("title")}</h1>
      <p role="alert">{t("loadError")}</p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={reset}>{t("retry")}</Button>
        <Link className="text-link" href="/exams">
          {t("history")} →
        </Link>
      </div>
    </section>
  );
}
