"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  MessagesSquare,
  Headphones,
  FileText,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";
type Bank = { id: string; title: string; category: string; mode: string };
const sections = [
  {
    key: "script",
    icon: BookOpen,
    categories: ["word-meaning", "word-usage", "kanji-reading"],
  },
  {
    key: "conversation",
    icon: MessagesSquare,
    categories: ["grammar-expression", "situational-conversation"],
  },
  { key: "listening", icon: Headphones, categories: [] },
  {
    key: "reading",
    icon: FileText,
    categories: ["signs-notices", "messages-schedules"],
  },
] as const;
export function JftPracticeSelector({ banks }: { banks: Bank[] }) {
  const t = useTranslations("Preparation"),
    [mode, setMode] = useState("quick");
  return (
    <section id="practice" className="prep-section">
      <div className="prep-section-heading">
        <div>
          <p className="eyebrow">01 / PRACTICE</p>
          <h2>{t("fourSections")}</h2>
        </div>
        <div className="prep-toggle" role="group" aria-label={t("format")}>
          {(["quick", "section"] as const).map((m) => (
            <button
              aria-pressed={mode === m}
              key={m}
              onClick={() => setMode(m)}
            >
              {t(m)}
            </button>
          ))}
        </div>
      </div>
      <div className="prep-section-grid">
        {sections.map(({ key, icon: Icon, categories }, i) => (
          <article className="prep-card" key={key}>
            <div className="prep-card-top">
              <Icon aria-hidden="true" />
              <span>0{i + 1}</span>
            </div>
            <h3>{t(key)}</h3>
            <p>{t(`${key}Desc`)}</p>
            <div className="prep-practice-links">
              {categories.map((category) => {
                const b = banks.find(
                  (b) => b.category === category && b.mode === mode,
                );
                return b ? (
                  <Link
                    className="text-link"
                    key={category}
                    href={`/jft-basic/practice/${b.id}`}
                  >
                    {t(category)}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <p className="prep-muted" key={category}>
                    {t(category)} · {t("comingSoon")}
                  </p>
                );
              })}
            </div>
            {key === "listening" && (
              <p className="prep-muted">
                <LockKeyhole size={16} aria-hidden="true" />
                {t("audioPending")}
              </p>
            )}
          </article>
        ))}
      </div>
      <article className="prep-simulation">
        <div>
          <p className="eyebrow">JFT-BASIC / SIMULATION</p>
          <h3>{t("simulation")}</h3>
          <p>{t("simulationInfo")}</p>
          <p>{t("simulationRules")}</p>
        </div>
        <Button disabled>{t("simulationPending")}</Button>
      </article>
    </section>
  );
}
