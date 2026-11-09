import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { prepDashboardSchema, prepCourseHref } from "@/lib/preparation/schema";
import { Link } from "@/i18n/navigation";
export async function PreparationProgress({
  scope = "all",
}: {
  scope?: "all" | "jft" | string;
}) {
  const t = await getTranslations("Preparation"),
    user = await getCurrentUser();
  if (!user)
    return (
      <section className="prep-section">
        <h2>{t("yourProgress")}</h2>
        <p>{t("guestProgress")}</p>
        <Link className="text-link" href="/login">
          {t("signIn")} →
        </Link>
      </section>
    );
  const client = await createClient();
  const result = await client?.rpc("prep_dashboard"),
    data = prepDashboardSchema.safeParse(result?.data);
  if (result?.error || !data.success)
    return (
      <p role="status" className="prep-notice">
        {t("progressUnavailable")}
      </p>
    );
  const courses = data.data.courses.filter(
      (c) =>
        scope === "all" ||
        (scope === "jft"
          ? c.slug === "jft-basic-foundation"
          : c.slug === "ssw-" + scope),
    ),
    attempts = data.data.attempts.filter(
      (a) =>
        scope === "all" ||
        (scope === "jft"
          ? a.slug === "jft-basic-foundation"
          : a.slug === "ssw-" + scope),
    );
  return (
    <section className="prep-section">
      <h2>{t("yourProgress")}</h2>
      {courses.length ? (
        <div className="prep-track-progress">
          {courses.map((c) => (
            <article className="prep-card" key={c.id}>
              <Link className="text-link" href={prepCourseHref(c.slug)}>
                {c.title} →
              </Link>
              <dl>
                <div>
                  <dt>{t("lessonsCompleted")}</dt>
                  <dd>{c.completed}</dd>
                </div>
                <div>
                  <dt>{t("reviewEvents")}</dt>
                  <dd>{c.reviews}</dd>
                </div>
                <div>
                  <dt>{t("knownCards")}</dt>
                  <dd>{c.known}</dd>
                </div>
                <div>
                  <dt>{t("dueCards")}</dt>
                  <dd>{c.due}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p>{t("noProgress")}</p>
      )}
      <h3>{t("previousAttempts")}</h3>
      {attempts.length ? (
        <ul className="prep-history">
          {attempts.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong>
              <span>
                {a.score}/{a.total} · {Math.round((a.score / a.total) * 100)}%
              </span>
              <time dateTime={a.created_at}>{a.created_at.slice(0, 10)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("noAttempts")}</p>
      )}
      {scope === "all" && (
        <>
          <h3>{t("weakAreas")}</h3>
          {data.data.weak.length ? (
            <ul>
              {data.data.weak.map((w) => (
                <li key={w.category}>
                  {w.category.replaceAll("-", " ")}: {w.correct}/{w.total} ·{" "}
                  {Math.round((w.correct / w.total) * 100)}%
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("noAttempts")}</p>
          )}
          <Link className="text-link" href="/exams">
            {t("jlptHistory")}: {data.data.exams} →
          </Link>
        </>
      )}
      <p className="prep-muted">{t("statsNote")}</p>
    </section>
  );
}
