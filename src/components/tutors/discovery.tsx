"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { loadTutorSlots } from "@/actions/tutors";
import {
  specialties,
  levels,
  money,
  tutorRating,
  compatibleHours,
  type Tutor,
} from "@/lib/tutors/schema";
import { TutorTimezone, useViewerTimezone, useTutorText } from "./shared";
export function TutorDiscovery({
  tutors,
  unavailable,
}: {
  tutors: Tutor[];
  unavailable: boolean;
}) {
  const t = useTutorText(),
    locale = useLocale(),
    detected = useViewerTimezone();
  const [query, setQuery] = useState(""),
    [level, setLevel] = useState("all"),
    [specialty, setSpecialty] = useState("all"),
    [language, setLanguage] = useState("all"),
    [currency, setCurrency] = useState("all"),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [years, setYears] = useState(0),
    [verified, setVerified] = useState(false),
    [sort, setSort] = useState("nameSort"),
    [page, setPage] = useState(0);
  const [zone, setZone] = useState<string | null>(null),
    [day, setDay] = useState(""),
    [earliest, setEarliest] = useState(7),
    [latest, setLatest] = useState(22),
    [availability, setAvailability] = useState<Record<string, boolean> | null>(
      null,
    ),
    [pending, start] = useTransition(),
    [error, setError] = useState("");
  const tz = zone ?? detected,
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: detected,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    selectedDay = day || today;
  const types = (p: Tutor) =>
    p.lesson_types.filter(
      (l) =>
        currency === "all" ||
        (l.currency === currency &&
          (min === "" ||
            l.price_minor / (l.currency === "JPY" ? 1 : 100) >= Number(min)) &&
          (max === "" ||
            l.price_minor / (l.currency === "JPY" ? 1 : 100) <= Number(max))),
    );
  const candidates = tutors.filter(
    (p) =>
      (p.display_name + " " + p.biography)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      (level === "all" || p.levels.includes(level)) &&
      (specialty === "all" || p.specialties.includes(specialty)) &&
      (language === "all" || p.languages.includes(language)) &&
      p.experience_years >= years &&
      (!verified || p.qualifications_verified) &&
      (currency === "all" || types(p).length > 0),
  );
  candidates.sort((a, b) =>
    sort === "experienceSort"
      ? b.experience_years - a.experience_years
      : sort === "ratingSort"
        ? (tutorRating(b) ?? -1) - (tutorRating(a) ?? -1)
        : sort === "priceSort" && currency !== "all"
          ? Math.min(...types(a).map((l) => l.price_minor)) -
            Math.min(...types(b).map((l) => l.price_minor))
          : a.display_name.localeCompare(b.display_name, locale),
  );
  const results = candidates,
    visible = results
      .slice(page * 12, page * 12 + 12)
      .filter((p) => !availability || availability[p.user_id]);
  function reset() {
    setPage(0);
    setAvailability(null);
  }
  return (
    <section className="container tutor-market">
      <div className="tutor-market-heading">
        <div>
          <p className="eyebrow">NIHONPATH / HUMAN TUTORS</p>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
        <Link className="text-link" href="/become-a-tutor">
          {t("become")} →
        </Link>
      </div>
      <p className="tutor-notice">{t("paidUnavailable")}</p>
      {unavailable && (
        <p role="status" className="tutor-notice">
          {t("unavailable")}
        </p>
      )}
      <form
        className="tutor-search"
        onSubmit={(e) => {
          e.preventDefault();
          reset();
        }}
        onChange={reset}
      >
        <label>
          {t("search")}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          {t("levels")}
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">{t("all")}</option>
            {levels.map((l) => (
              <option value={l} key={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("specialties")}
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="all">{t("all")}</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("languages")}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="all">{t("all")}</option>
            {[...new Set(tutors.flatMap((t) => t.languages))].map((l) => (
              <option key={l} value={l}>
                {new Intl.DisplayNames(locale, { type: "language" }).of(l)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("currency")}
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              if (e.target.value === "all" && sort === "priceSort")
                setSort("nameSort");
            }}
          >
            <option value="all">{t("all")}</option>
            {["JPY", "USD", "NPR", "INR"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          {t("minPrice")}
          <input
            type="number"
            min={0}
            step="0.01"
            disabled={currency === "all"}
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
        <label>
          {t("maxPrice")}
          <input
            type="number"
            min={0}
            step="0.01"
            disabled={currency === "all"}
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </label>
        <label>
          {t("experience")}
          <input
            type="number"
            min={0}
            max={80}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </label>
        <label>
          {t("sort")}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {["nameSort", "experienceSort", "ratingSort", "priceSort"].map(
              (s) => (
                <option
                  key={s}
                  value={s}
                  disabled={s === "priceSort" && currency === "all"}
                >
                  {t(s)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="tutor-checkbox">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          {t("verified")}
        </label>
      </form>
      <p className="tutor-fine">{t("priceHint")}</p>
      <details className="tutor-panel">
        <summary>{t("availableTimes")}</summary>
        <p>{t("availabilityPage")}</p>
        <div className="tutor-search">
          <TutorTimezone
            value={tz}
            onChange={(v) => {
              setZone(v);
              reset();
            }}
          />
          <label>
            {t("weekOf")}
            <input
              type="date"
              min={today}
              value={selectedDay}
              onChange={(e) => {
                setDay(e.target.value);
                reset();
              }}
            />
          </label>
          <label>
            {t("startHour")}
            <input
              type="number"
              min={0}
              max={23}
              value={earliest}
              onChange={(e) => {
                setEarliest(Number(e.target.value));
                reset();
              }}
            />
          </label>
          <label>
            {t("endHour")}
            <input
              type="number"
              min={1}
              max={24}
              value={latest}
              onChange={(e) => {
                setLatest(Number(e.target.value));
                reset();
              }}
            />
          </label>
        </div>
        <Button
          disabled={pending || !candidates.length || unavailable}
          onClick={() =>
            start(async () => {
              setError("");
              try {
                const matches: Record<string, boolean> = {};
                for (const p of candidates.slice(page * 12, page * 12 + 12)) {
                  matches[p.user_id] = false;
                  for (const type of types(p)) {
                    const r = await loadTutorSlots({
                      tutor: p.user_id,
                      type: type.id,
                      day: selectedDay,
                      timezone: tz,
                    });
                    if (r.error) {
                      setError(t(r.error));
                      return;
                    }
                    if (
                      r.slots?.some((s) =>
                        compatibleHours(
                          s.starts_at,
                          s.ends_at,
                          tz,
                          earliest,
                          latest,
                        ),
                      )
                    ) {
                      matches[p.user_id] = true;
                      break;
                    }
                  }
                }
                setAvailability(matches);
              } catch {
                setError(t("saveError"));
              }
            })
          }
        >
          {t(pending ? "saving" : "checkAvailability")}
        </Button>
        {error && <p role="alert">{error}</p>}
      </details>
      <div className="tutor-card-grid">
        {visible.map((p) => (
          <article className="tutor-card" key={p.user_id}>
            <div className="tutor-card-person">
              {p.photo_url ? (
                <Image
                  src={p.photo_url}
                  width={72}
                  height={72}
                  alt={p.display_name}
                  unoptimized
                />
              ) : (
                <span className="tutor-avatar" aria-hidden="true">
                  {p.display_name.slice(0, 1)}
                </span>
              )}
              <div>
                <h2>
                  <Link href={`/tutors/${p.slug}`}>{p.display_name}</Link>
                </h2>
                <p>
                  {p.country} · {p.timezone}
                </p>
              </div>
            </div>
            <p className="tutor-badge">
              {t(p.qualifications_verified ? "verified" : "unverified")}
            </p>
            <p>
              {p.biography.slice(0, 170)}
              {p.biography.length > 170 ? "…" : ""}
            </p>
            <div className="tutor-tags">
              {p.specialties.map((s) => (
                <span key={s}>{t(s)}</span>
              ))}
            </div>
            <p>
              {p.languages
                .map((l) =>
                  new Intl.DisplayNames(locale, { type: "language" }).of(l),
                )
                .join(" · ")}{" "}
              · {p.levels.map((l) => l.toUpperCase()).join(" / ")}
            </p>
            <p>
              {t("experience")}: {p.experience_years}
            </p>
            <p>
              {types(p)
                .map(
                  (l) =>
                    `${l.duration_minutes} · ${l.price_minor === 0 ? t("free") : money(l.price_minor, l.currency, locale)}`,
                )
                .join(" / ")}
            </p>
            <p>
              {tutorRating(p) === null
                ? t("noReviews")
                : `★ ${tutorRating(p)!.toFixed(1)} · ${p.reviews.length} ${t("reviews")}`}
            </p>
            <p className="tutor-fine">
              {t(
                availability?.[p.user_id]
                  ? "availableTimes"
                  : "availabilityUnchecked",
              )}
            </p>
            <Link className="tutor-card-link" href={`/tutors/${p.slug}`}>
              {t("profile")} →
            </Link>
          </article>
        ))}
      </div>
      {!visible.length && !unavailable && (
        <div className="tutor-empty">
          <h2>{t("empty")}</h2>
          <Link href="/become-a-tutor" className="text-link">
            {t("become")} →
          </Link>
        </div>
      )}
      <div className="tutor-controls">
        <Button
          variant="outline"
          disabled={page === 0}
          onClick={() => {
            setAvailability(null);
            setPage((p) => p - 1);
          }}
        >
          {t("previous")}
        </Button>
        <Button
          variant="outline"
          disabled={(page + 1) * 12 >= results.length}
          onClick={() => {
            setAvailability(null);
            setPage((p) => p + 1);
          }}
        >
          {t("more")}
        </Button>
      </div>
    </section>
  );
}
