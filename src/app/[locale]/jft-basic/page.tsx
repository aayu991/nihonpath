import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("jft-basic");
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Clock3, Layers, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { jftBanks, prepResources } from "@/lib/preparation/server";
import {
  PreparationNotice,
  PreparationSources,
} from "@/components/preparation/shared";
import { JftPracticeSelector } from "@/components/preparation/practice-selector";
import { PreparationProgress } from "@/components/preparation/progress";
export default async function Jft() {
  const t = await getTranslations("Preparation");
  const [data, resources] = await Promise.all([
    jftBanks(),
    prepResources("jft"),
  ]);
  return (
    <div className="prep-page">
      <section className="prep-hero">
        <div className="container prep-hero-grid">
          <div>
            <p className="eyebrow">NIHONPATH / JFT-BASIC</p>
            <h1>{t("jftTitle")}</h1>
            <p>{t("jftIntro")}</p>
            <div className="prep-controls">
              <Button asChild>
                <a href="#practice">
                  {t("explorePractice")}
                  <ArrowUpRight />
                </a>
              </Button>
              <Link className="text-link" href="/dashboard/goals">
                {t("setGoal")} →
              </Link>
            </div>
          </div>
          <aside className="prep-hero-note">
            <span className="prep-kanji" aria-hidden="true">
              暮らす
            </span>
            <h2>{t("everydayTitle")}</h2>
            <p>{t("everydayDesc")}</p>
            <div className="prep-facts">
              <span>
                <Layers />4 {t("sections")}
              </span>
              <span>
                <Clock3 />
                60 {t("minutes")}
              </span>
              <span>
                <MessageCircle />
                ~50 {t("questions")}
              </span>
            </div>
            <a
              className="text-link"
              href="https://www.jpf.go.jp/jft-basic/e/about/index.html"
              target="_blank"
              rel="noreferrer"
            >
              {t("officialSources")} ↗
            </a>
            <small className="block mt-3">{t("reviewed")} 2026-10-24</small>
          </aside>
        </div>
      </section>
      <div className="container">
        <PreparationNotice demo={data.demo} />
        {data.error && <p role="alert">{t("loadError")}</p>}
        <JftPracticeSelector banks={data.banks} />
        <section className="prep-section prep-learning-path">
          <h2>{t("recommended")}</h2>
          <Link href="/courses/n5" className="prep-card">
            <h3>{t("foundation")}</h3>
            <p>{t("foundationDesc")}</p>
            <span className="text-link">{t("openLessons")} →</span>
          </Link>
          <Link href="/ssw" className="prep-card">
            <h3>{t("workplaceBridge")}</h3>
            <p>{t("workplaceBridgeDesc")}</p>
            <span className="text-link">{t("exploreTracks")} →</span>
          </Link>
        </section>
        <PreparationProgress scope="jft" />
        <PreparationSources resources={resources} />
      </div>
    </div>
  );
}
