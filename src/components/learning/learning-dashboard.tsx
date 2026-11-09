import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { prepCourseHref } from "@/lib/preparation/schema";
const schema = z.object({
  enrollments: z.array(
    z.object({ id: z.uuid(), title: z.string(), level: z.string() }),
  ),
  due: z.array(z.object({ level: z.string(), count: z.number() })),
  accuracy: z.array(
    z.object({
      subject: z.string(),
      correct: z.number(),
      total: z.number(),
      percent: z.number(),
    }),
  ),
  continueLesson: z
    .object({ id: z.uuid(), title: z.string(), level: z.string() })
    .nullable(),
});
export async function LearningDashboard() {
  const t = await getTranslations("Learning");
  const guide = await getTranslations("Guide");
  const client = await createClient();
  const response = await client?.rpc("learning_dashboard");
  const parsed = schema.safeParse(response?.data);
  if (!parsed.success || response?.error)
    return (
      <p className="learning-notice" role="alert">
        {t("databaseError")}
      </p>
    );
  const data = parsed.data;
  return (
    <section className="learning-dashboard">
      <h2>{t("yourLearning")}</h2>
      {data.continueLesson ? (
        <Link href={`/lessons/${data.continueLesson.id}`} className="text-link">
          {t("continueLearning")}: {data.continueLesson.title} →
        </Link>
      ) : (
        <Link href="/courses" className="text-link">
          {t("chooseCourse")} →
        </Link>
      )}
      <div className="dashboard-columns">
        <article className="dashboard-panel">
          <h3>{t("enrolledCourses")}</h3>
          {data.enrollments.length ? (
            <ul>
              {data.enrollments.map((c) => (
                <li key={c.id}>
                  <Link href={prepCourseHref(c.level)} className="text-link">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("noEnrollments")}</p>
          )}
          <h3>{t("reviewQueue")}</h3>
          {data.due.length ? (
            <ul>
              {data.due.map((d) => (
                <li key={d.level}>
                  <Link
                    href={
                      d.level === "japan-life-language"
                        ? "/japan-guide"
                        : d.level.startsWith("ssw-")
                          ? `/ssw/${d.level.slice(4)}/flashcards`
                          : d.level === "jft-basic-foundation"
                            ? "/jft-basic"
                            : `/courses/${d.level}/flashcards?review=due`
                    }
                    className="text-link"
                  >
                    {d.level === "japan-life-language"
                      ? guide("back")
                      : d.level.toUpperCase()}{" "}
                    · {t("dueCount", { count: d.count })} →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("noDue")}</p>
          )}
          <p>{t("scheduleRule")}</p>
        </article>
        <article className="dashboard-panel">
          <h3>{t("subjectAccuracy")}</h3>
          {data.accuracy.length ? (
            <ul>
              {data.accuracy.map((a) => (
                <li key={a.subject}>
                  {t(`subjects.${a.subject as "grammar"}`)}: {a.percent}% (
                  {a.correct}/{a.total})
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("noAttempts")}</p>
          )}
        </article>
      </div>
    </section>
  );
}
