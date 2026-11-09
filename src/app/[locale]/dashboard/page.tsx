import { LearningDashboard } from "@/components/learning/learning-dashboard";
import { OrganizationDashboardLink } from "@/components/organizations/dashboard-link";
import { PreparationProgress } from "@/components/preparation/progress";
import { GuideDashboardProgress } from "@/components/guides/dashboard-progress";
import { Recommendations } from "@/components/platform/recommendations";
import { CourseProgress } from "@/components/platform/course-progress";
import { goalKeys, type LearningGoal } from "@/lib/platform/catalog";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { StudyLinks } from "@/components/learning/study-links";
import {
  BarChart3,
  Layers,
  Target,
  ClipboardCheck,
  ArrowUpRight,
} from "lucide-react";
const summarySchema = z.object({
  reviews: z.number(),
  attempts: z.number(),
  accuracy: z.number().nullable(),
  lessons: z.number(),
  completed: z.number(),
});
export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const client = await createClient();
  const t = await getTranslations("Study");
  if (!client)
    return (
      <div className="container preview-page">
        <h1>{t("dashboard")}</h1>
        <p role="alert">{t("unavailable")}</p>
      </div>
    );
  const [profile, summary, recent, attempts, lessons] = await Promise.all([
    client.from("profiles").select("*").eq("id", user.id).single(),
    client.rpc("dashboard_summary"),
    client
      .from("lesson_progress")
      .select("lesson_id,completed_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    client
      .from("quiz_attempts")
      .select("id,score,total,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    client
      .from("lessons")
      .select(
        "id,title,course_id,slug,published,position,body,created_at,updated_at",
      )
      .eq("published", true),
  ]);
  const parsed = summarySchema.safeParse(summary.data);
  if (
    profile.error ||
    summary.error ||
    recent.error ||
    attempts.error ||
    lessons.error ||
    !parsed.success
  )
    return (
      <div className="container preview-page">
        <h1>{t("dashboard")}</h1>
        <p role="alert" className="form-message error">
          {t("dbError")}
        </p>
        <Link href="/dashboard" className="text-link">
          {t("dashboard")} ↻
        </Link>
      </div>
    );
  const data = parsed.data;
  const p = profile.data;
  const { notice } = await searchParams;
  const pt = await getTranslations("Platform");
  const goalsResult = await client
    .from("user_learning_goals")
    .select("goal")
    .eq("user_id", user.id);
  const goals = (goalsResult.data ?? [])
    .map((row) => row.goal)
    .filter((goal): goal is LearningGoal =>
      goalKeys.some((key) => key === goal),
    );
  const metrics = [
    { icon: Layers, label: t("reviews"), value: data.reviews },
    { icon: ClipboardCheck, label: t("attempts"), value: data.attempts },
    {
      icon: BarChart3,
      label: t("average"),
      value: data.accuracy === null ? "—" : `${data.accuracy}%`,
    },
    {
      icon: Target,
      label: t("courseProgress"),
      value: data.lessons ? `${data.completed} / ${data.lessons}` : "—",
    },
  ];
  return (
    <section className="container dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">NIHONPATH · {t("dashboard")}</p>
          <h1>{t("welcome", { name: p.display_name })}</h1>
          <p>
            {t(`goals.${p.learning_goal}`)} · JLPT {p.jlpt_target.toUpperCase()}
          </p>
        </div>
        <Link href="/dashboard/profile" className="text-link">
          {t("profile")}
          <ArrowUpRight size={17} />
        </Link>
      </div>
      {notice === "logout-error" && (
        <p role="alert" className="form-message error">
          {t("logoutError")}
        </p>
      )}
      <LearningDashboard />
      <Link className="text-link" href="/dashboard/notifications">
        {(await getTranslations("Launch"))("preferences")} →
      </Link>
      <Link className="text-link" href="/billing">
        {(await getTranslations("Billing"))("billing")} →
      </Link>
      <Link className="text-link" href="/dashboard/lessons">
        {(await getTranslations("Tutor"))("myLessons")} →
      </Link>
      <OrganizationDashboardLink />
      <div className="metric-grid">
        {metrics.map(({ icon: Icon, label, value }) => (
          <article key={label}>
            <Icon size={20} />
            <h2>{label}</h2>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      {data.attempts === 0 && data.reviews === 0 && (
        <p className="empty-note">{t("empty")}</p>
      )}
      <div className="dashboard-columns">
        <article className="dashboard-panel">
          <h2>{t("recent")}</h2>
          {recent.data.length ? (
            <ul className="history-list">
              {recent.data.map((row) => (
                <li key={row.lesson_id}>
                  <Link
                    href={`/lessons/${row.lesson_id}`}
                    className="text-link"
                  >
                    {lessons.data.find((l) => l.id === row.lesson_id)?.title ??
                      row.lesson_id}
                  </Link>
                  <time dateTime={row.updated_at}>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(row.updated_at))}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("noLessons")}</p>
          )}
          <h3>{t("courseProgress")}</h3>
          {data.lessons ? (
            <progress
              aria-label={t("courseProgress")}
              value={data.completed}
              max={data.lessons}
            />
          ) : (
            <p>{t("noContent")}</p>
          )}
        </article>
        <article className="dashboard-panel">
          <h2>{t("attempts")}</h2>
          {attempts.data.length ? (
            <ul className="history-list">
              {attempts.data.map((row) => (
                <li key={row.id}>
                  <strong>
                    {row.score} / {row.total} ·{" "}
                    {Math.round((row.score / row.total) * 100)}%
                  </strong>
                  <time dateTime={row.created_at}>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(row.created_at))}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("noAttempts")}</p>
          )}
          {data.reviews === 0 && <p>{t("noReviews")}</p>}
        </article>
      </div>
      <CourseProgress completed={data.completed} total={data.lessons} />
      <PreparationProgress />
      <GuideDashboardProgress />
      {goalsResult.error ? (
        <p role="alert" className="form-message error">
          {pt("dbUnavailable")}
        </p>
      ) : (
        <Recommendations goals={goals} />
      )}
      <Link href="/dashboard/goals" className="text-link">
        {pt("editGoals")} →
      </Link>
      <h2 className="dashboard-next">{t("suggested")}</h2>
      <Link href="/exams" className="text-link">
        {(await getTranslations("Exams"))("title")} →
      </Link>
      <StudyLinks
        level={["n5", "n4"].includes(p.jlpt_target) ? p.jlpt_target : undefined}
      />
    </section>
  );
}
