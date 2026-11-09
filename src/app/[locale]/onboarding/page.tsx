import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { GoalSelector } from "@/components/platform/goal-selector";
import { goalKeys, type LearningGoal } from "@/lib/platform/catalog";
export default async function Onboarding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("Platform");
  const client = await createClient();
  const result = client
    ? await client
        .from("user_learning_goals")
        .select("goal")
        .eq("user_id", user.id)
    : null;
  const initial = (result?.data ?? [])
    .map((row) => row.goal)
    .filter((goal): goal is LearningGoal =>
      goalKeys.some((key) => key === goal),
    );
  return (
    <section className="container onboarding-page">
      <p className="eyebrow">NIHONPATH · YOUR JOURNEY</p>
      <h1>{t("onboarding")}</h1>
      {(!result || result.error) && (
        <p role="alert" className="form-message error">
          {t("dbUnavailable")}
        </p>
      )}
      <GoalSelector initial={initial} disabled={!result || !!result.error} />
    </section>
  );
}
