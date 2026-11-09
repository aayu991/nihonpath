import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("ssw");
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, BriefcaseBusiness, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { prepCatalog, prepResources } from "@/lib/preparation/server";
import {
  PreparationNotice,
  PreparationSources,
} from "@/components/preparation/shared";
import { PreparationProgress } from "@/components/preparation/progress";
export default async function Ssw() {
  const t = await getTranslations("Preparation"),
    locale = await getLocale();
  const [data, resources] = await Promise.all([
    prepCatalog(),
    prepResources("ssw"),
  ]);
  return (
    <div className="prep-page">
      <section className="prep-hero">
        <div className="container prep-hero-grid">
          <div>
            <p className="eyebrow">NIHONPATH / SSW & WORKPLACE</p>
            <h1>{t("sswTitle")}</h1>
            <p>{t("sswIntro")}</p>
            <div className="prep-controls">
              <Button asChild>
                <a href="#industries">
                  {t("chooseIndustry")}
                  <ArrowUpRight />
                </a>
              </Button>
              <Link className="text-link" href="/workplace-japanese">
                {t("scenarioTitle")} →
              </Link>
            </div>
          </div>
          <aside className="prep-hero-note">
            <BriefcaseBusiness size={48} />
            <h2>{t("communicationFirst")}</h2>
            <p>{t("communicationDesc")}</p>
            <Link className="text-link" href="/interview-preparation">
              {t("interviewTitle")} →
            </Link>
          </aside>
        </div>
      </section>
      <div className="container">
        <PreparationNotice demo={data.demo} />
        {data.error && <p role="alert">{t("loadError")}</p>}
        <section id="industries" className="prep-section">
          <p className="eyebrow">01 / YOUR INDUSTRY</p>
          <h2>{t("industryTracks")}</h2>
          <p>{t("taxonomyNote")}</p>
          <div className="prep-industry-grid">
            {data.sectors.map((s, i) => (
              <Link
                className="prep-card prep-industry-card"
                key={s.id}
                href={`/ssw/${s.slug}`}
              >
                <span className="prep-track-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{locale === "ja" ? s.titleJa : s.title}</h3>
                <p>{locale === "ja" ? s.summaryJa : s.summary}</p>
                <span className="text-link">
                  {t("openTrack")}
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            ))}
          </div>
          {!data.sectors.length && <p>{t("noTracks")}</p>}
        </section>
        <section className="prep-requirements">
          <ShieldCheck size={32} />
          <div>
            <h2>{t("requirements")}</h2>
            <p>{t("requirementsInfo")}</p>
            <p>{t("careRequirement")}</p>
            <a
              className="text-link"
              href="https://www.ssw.go.jp/en/about/visa/"
              target="_blank"
              rel="noreferrer"
            >
              {t("currentRequirements")} ↗
            </a>
            <small>{t("reviewed")} 2026-10-24</small>
          </div>
        </section>
        <PreparationProgress />
        <PreparationSources resources={resources.filter((r) => !r.sectorId)} />
      </div>
    </div>
  );
}
