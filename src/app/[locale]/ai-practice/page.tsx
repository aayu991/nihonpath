import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { loadScenarios, snapshot, recommendedLessons } from "@/lib/ai/server";
import { aiConfig } from "@/lib/ai/config";
import { ConversationTutor } from "@/components/ai/tutor";
import { z } from "zod";
export default async function AiPractice({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; scenario?: string }>;
}) {
  const [t, user, catalog, lessons] = await Promise.all([
    getTranslations("Ai"),
    getCurrentUser(),
    loadScenarios(),
    recommendedLessons(),
  ]);
  const { session, scenario } = await searchParams;
  let initial = null;
  if (user && session && z.uuid().safeParse(session).success) {
    try {
      initial = await snapshot(session);
    } catch {
      /* History UI reports unavailable storage. */
    }
  }
  return (
    <>
      <section className="ai-hero">
        <div className="container">
          <p className="eyebrow">{t("eyebrow")}</p>
          <span className="ai-text-pill">{t("textMode")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
          <div className="ai-hero-japanese" lang="ja">
            話すたび、<span>一歩前へ。</span>
          </div>
        </div>
      </section>
      <ConversationTutor
        preselectedScenarioId={
          catalog.scenarios.some((s) => s.id === scenario)
            ? scenario
            : undefined
        }
        lessons={lessons}
        scenarios={catalog.scenarios}
        live={aiConfig().live && catalog.database}
        member={!!user}
        initial={initial}
      />
    </>
  );
}
