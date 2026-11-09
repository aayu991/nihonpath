import { getTranslations } from "next-intl/server";
import { allWorkplaceScenarios, prepQuiz } from "@/lib/preparation/server";
import { getCurrentUser } from "@/lib/auth/session";
import { WorkplaceScenarios } from "@/components/preparation/scenarios";
import {
  PreparationNotice,
  PrepBreadcrumb,
} from "@/components/preparation/shared";
export default async function Workplace() {
  const t = await getTranslations("Preparation"),
    user = await getCurrentUser(),
    catalog = await allWorkplaceScenarios();
  const scenes = catalog.scenarios;
  const scenarios = (
    await Promise.all(
      scenes.map(async (s) => {
        const q = await prepQuiz(s.bankId);
        return q ? { ...s, questions: q.questions } : null;
      }),
    )
  ).filter((s) => s !== null);
  return (
    <section className="container prep-page prep-study">
      <PrepBreadcrumb ssw />
      <h1>{t("workplaceTitle")}</h1>
      <p>{t("workplaceIntro")}</p>
      <PreparationNotice demo={catalog.demo} />
      {catalog.error && <p role="alert">{t("loadError")}</p>}
      <WorkplaceScenarios
        scenarios={scenarios}
        member={!!user && !catalog.demo}
      />
    </section>
  );
}
