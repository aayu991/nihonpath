"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Plane,
  MapPin,
  FileText,
  House,
  Wallet,
  HeartPulse,
  TrainFront,
  BriefcaseBusiness,
  MessagesSquare,
  ShieldCheck,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GuidePreferencesForm } from "./preferences";
import {
  relevantArticles,
  type GuideCatalog,
  type GuidePreferences,
} from "@/lib/guides/schema";
const icons = {
  Plane,
  MapPin,
  FileText,
  House,
  Wallet,
  HeartPulse,
  TrainFront,
  BriefcaseBusiness,
  MessagesSquare,
  ShieldCheck,
};
export function GuideExplorer({
  catalog,
  demo,
  preferences,
  member,
}: {
  catalog: GuideCatalog;
  demo: boolean;
  preferences: GuidePreferences;
  member: boolean;
}) {
  const t = useTranslations("Guide"),
    locale = useLocale(),
    [prefs, setPrefs] = useState(preferences),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [recommended, setRecommended] = useState(false);
  const suggestions = relevantArticles(catalog, prefs);
  const title = (a: GuideCatalog["articles"][number]) =>
    locale === "ja"
      ? (catalog.translations.find(
          (v) => v.article_id === a.id && v.locale === "ja",
        )?.title ?? a.title)
      : a.title;
  const summary = (a: GuideCatalog["articles"][number]) =>
    locale === "ja"
      ? (catalog.translations.find(
          (v) => v.article_id === a.id && v.locale === "ja",
        )?.summary ?? a.summary)
      : a.summary;
  const filtered = catalog.articles.filter(
    (a) =>
      (category === "all" || a.category_id === category) &&
      (!recommended || suggestions.some((s) => s.id === a.id)) &&
      `${title(a)} ${summary(a)}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div className="container guide-explorer">
      <GuidePreferencesForm
        value={prefs}
        onChange={setPrefs}
        canSave={member && !demo}
      />
      <section className="guide-recommendations">
        <h2>{t("recommendations")}</h2>
        <div className="guide-recommendation-grid">
          {suggestions.slice(0, 3).map((a) => (
            <Link href={`/japan-guide/${a.slug}`} key={a.id}>
              <span>{t(`stages.${prefs.stage}`)}</span>
              <strong>{title(a)}</strong>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </section>
      <section className="guide-directory" id="guides">
        <h2>{t("browse")}</h2>
        <div className="guide-category-grid">
          {catalog.categories.map((c) => {
            const Icon = icons[c.icon as keyof typeof icons] ?? FileText;
            return (
              <button
                key={c.id}
                className={category === c.id ? "selected" : ""}
                aria-pressed={category === c.id}
                onClick={() => setCategory(category === c.id ? "all" : c.id)}
              >
                <Icon size={22} />
                <span>{locale === "ja" ? c.title_ja : c.title}</span>
              </button>
            );
          })}
        </div>
        <div className="guide-filters">
          <label>
            <span>{t("search")}</span>
            <div className="guide-search">
              <Search size={19} />
              <input
                type="search"
                value={query}
                placeholder={t("searchPlaceholder")}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </label>
          <label>
            {t("category")}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">{t("all")}</option>
              {catalog.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === "ja" ? c.title_ja : c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="guide-inline-check">
            <input
              type="checkbox"
              checked={recommended}
              onChange={(e) => setRecommended(e.target.checked)}
            />
            {t("recommendedOnly")}
          </label>
        </div>
        <p role="status" className="guide-fine">
          {filtered.length} {t("results")}
        </p>
        <div className="guide-article-grid">
          {filtered.map((a) => (
            <article key={a.id} className="guide-article-card">
              <span className="guide-rule">
                {t(`kinds.${a.content.sections[0].kind}`)}
              </span>
              <h3>
                <Link href={`/japan-guide/${a.slug}`}>{title(a)}</Link>
              </h3>
              <p>{summary(a)}</p>
              <div className="guide-card-bottom">
                <span>
                  {a.last_reviewed_at
                    ? a.last_reviewed_at.slice(0, 10)
                    : t("unreviewed")}
                </span>
                <Link
                  aria-label={`${title(a)} →`}
                  href={`/japan-guide/${a.slug}`}
                >
                  <ArrowUpRight size={22} />
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <p className="guide-empty">
            {catalog.articles.length ? t("noResults") : t("empty")}
          </p>
        )}
      </section>
    </div>
  );
}
