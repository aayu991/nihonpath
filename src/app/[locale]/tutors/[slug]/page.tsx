import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { tutorCatalog } from "@/lib/tutors/server";
import { tutorMessageKey } from "@/lib/tutors/messages";
import { money, tutorRating } from "@/lib/tutors/schema";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TutorReport } from "@/components/tutors/report";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    { tutors } = await tutorCatalog(),
    p = tutors.find((t) => t.slug === slug);
  if (!p) notFound();
  const translate = await getTranslations("Tutor"),
    t = (key: string) => translate(tutorMessageKey(key)),
    locale = await getLocale();
  return (
    <article className="container tutor-entry">
      <nav aria-label={t("title")}>
        <Link className="text-link" href="/tutors">
          {t("title")} /
        </Link>
      </nav>
      <header className="tutor-profile-header">
        {p.photo_url ? (
          <Image
            src={p.photo_url}
            width={120}
            height={120}
            alt={p.display_name}
            unoptimized
          />
        ) : (
          <span className="tutor-avatar" aria-hidden="true">
            {p.display_name.slice(0, 1)}
          </span>
        )}
        <div>
          <p className="eyebrow">NIHONPATH / TUTOR</p>
          <h1>{p.display_name}</h1>
          <p>
            {p.country} · {p.timezone}
          </p>
          <p className="tutor-badge">
            {t(p.qualifications_verified ? "verified" : "unverified")}
          </p>
        </div>
      </header>
      <div className="tutor-profile-grid">
        <div>
          <section className="tutor-panel">
            <h2>{t("about")}</h2>
            <p className="tutor-preserve">{p.biography}</p>
            <p>
              {t("experience")}: {p.experience_years}
            </p>
            <p>
              {t("languages")}:{" "}
              {p.languages
                .map((l) =>
                  new Intl.DisplayNames(locale, { type: "language" }).of(l),
                )
                .join(" · ")}
            </p>
            <p>
              {t("levels")}: {p.levels.map((l) => l.toUpperCase()).join(" / ")}
            </p>
            <div className="tutor-tags">
              {p.specialties.map((s) => (
                <span key={s}>{t(s)}</span>
              ))}
            </div>
            {p.video_url && (
              <a
                className="text-link"
                href={p.video_url}
                target="_blank"
                rel="noreferrer"
              >
                {t("watchVideo")} ↗
              </a>
            )}
            {p.qualifications_verified && (
              <>
                <h3>{t("qualificationSummary")}</h3>
                <p>{p.qualification_summary}</p>
              </>
            )}
          </section>
          <section className="tutor-panel">
            <h2>
              {t("reviews")}{" "}
              {tutorRating(p) !== null && `· ★ ${tutorRating(p)!.toFixed(1)}`}
            </h2>
            {!p.reviews.length && <p>{t("noReviews")}</p>}
            {p.reviews.map((r) => (
              <article className="tutor-review" key={r.id}>
                <p>
                  ★ {r.rating} ·{" "}
                  <time dateTime={r.created_at}>
                    {r.created_at.slice(0, 10)}
                  </time>
                </p>
                <p>{r.body}</p>
                {r.response && <blockquote>{r.response}</blockquote>}
                <TutorReport kind="review" target={r.id} />
              </article>
            ))}
          </section>
          <TutorReport kind="profile" target={p.user_id} />
        </div>
        <aside className="tutor-panel">
          <h2>{t("lessonTypes")}</h2>
          {p.lesson_types.map((l) => (
            <div className="tutor-item" key={l.id}>
              <h3>{l.title}</h3>
              <p>
                {l.duration_minutes} · {t("duration")}
              </p>
              <p>
                {l.price_minor === 0
                  ? t("free")
                  : money(l.price_minor, l.currency, locale)}
              </p>
            </div>
          ))}
          <p>{t("availabilityUnchecked")}</p>
          {!!p.lesson_types.length && (
            <Button asChild>
              <Link href={`/tutors/${p.slug}/book`}>{t("book")} →</Link>
            </Button>
          )}
          <p className="tutor-fine">{t("paidUnavailable")}</p>
        </aside>
      </div>
    </article>
  );
}
