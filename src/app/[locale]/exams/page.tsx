import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("exams");
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { templateSchema } from "@/lib/exams/schema";
import { ExamConfiguration } from "@/components/exams/exam-center";
import { Link } from "@/i18n/navigation";
export default async function Exams() {
  const t = await getTranslations("Exams"),
    client = await createClient(),
    user = await getCurrentUser();
  const catalog = client ? await client.rpc("exam_catalog") : null;
  const attempts =
    user && client
      ? await client
          .from("exam_attempts")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(20)
      : null;
  const templates = z.array(templateSchema).safeParse(catalog?.data).data ?? [];
  return (
    <section className="container exam-page">
      <div className="exam-heading">
        <p className="eyebrow">NIHONPATH / JLPT</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </div>
      {catalog?.error && (
        <p role="status" className="exam-notice">
          {t("setup")}
        </p>
      )}
      <ExamConfiguration templates={templates} member={!!user} />
      <section className="exam-panel">
        <div className="exam-history-heading">
          <h2>{t("history")}</h2>
          <Link className="text-link" href="/exams/mistakes">
            {t("mistakes")} →
          </Link>
        </div>
        {!user ? (
          <p>{t("historySignIn")}</p>
        ) : attempts?.error ? (
          <p role="alert">{t("historyError")}</p>
        ) : !attempts?.data?.length ? (
          <p>{t("emptyHistory")}</p>
        ) : (
          <ul className="exam-history">
            {attempts.data.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{a.title}</strong>
                  <p>
                    {new Date(a.started_at).toISOString().slice(0, 10)} ·{" "}
                    {a.level.toUpperCase()} ·{" "}
                    {t(a.status === "active" ? "active" : "submitted")}
                  </p>
                </div>
                <Link className="text-link" href={`/exams/${a.id}`}>
                  {t(a.status === "active" ? "resume" : "results")} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
