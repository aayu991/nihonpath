import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Japanese } from "@/components/learning/japanese";
import type { GuideArticle, GuideBody, GuideSource } from "@/lib/guides/schema";
import type { StudyCard } from "@/lib/learning/types";
export async function GuideNotice({ demo }: { demo: boolean }) {
  const t = await getTranslations("Guide");
  return demo ? (
    <p className="container guide-draft-notice" role="note">
      {t("draft")}
    </p>
  ) : null;
}
export async function GuideHeader({
  article,
  title,
  summary,
}: {
  article: GuideArticle;
  title: string;
  summary: string;
}) {
  const t = await getTranslations("Guide");
  return (
    <header className="guide-article-header">
      <nav aria-label="Breadcrumb">
        <Link href="/japan-guide">{t("back")}</Link>
        <span aria-hidden="true"> / </span>
        <span>{title}</span>
      </nav>
      <p className="eyebrow">NIHONPATH / LIFE IN JAPAN</p>
      <h1>{title}</h1>
      <p className="guide-lead">{summary}</p>
      <div className="guide-audience-tags">
        {article.audiences.map((a) => (
          <span key={a}>{t(`audiences.${a}`)}</span>
        ))}
      </div>
      <LastReviewedDate date={article.last_reviewed_at} />
    </header>
  );
}
export async function LastReviewedDate({ date }: { date: string | null }) {
  const t = await getTranslations("Guide");
  return (
    <p className="guide-fine">
      {t("reviewed")}:{" "}
      {date ? (
        <time dateTime={date}>{date.slice(0, 10)}</time>
      ) : (
        t("unreviewed")
      )}
    </p>
  );
}
export async function GuideTableOfContents() {
  const t = await getTranslations("Guide");
  return (
    <nav className="guide-toc no-print" aria-label={t("toc")}>
      <h2>{t("toc")}</h2>
      {(["overview", "steps", "documents", "phrases", "sources"] as const).map(
        (key) => (
          <a key={key} href={`#guide-${key}`}>
            {t(key)}
          </a>
        ),
      )}
    </nav>
  );
}
export async function GuideContent({ body }: { body: GuideBody }) {
  const t = await getTranslations("Guide");
  return (
    <>
      {body.sections.map((s, i) => (
        <section
          className="guide-content-section"
          id={i === 0 ? "guide-overview" : `guide-section-${s.id}`}
          key={s.id}
        >
          <span className="guide-rule">{t(`kinds.${s.kind}`)}</span>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      <ProcedureSteps steps={body.steps} />
      <DocumentChecklist documents={body.documents} />
      <section className="guide-content-section">
        <h2>{t("deadline")}</h2>
        <p>{body.deadline ?? t("deadlineNone")}</p>
      </section>
      <section id="guide-phrases" className="guide-content-section">
        <h2>{t("phrases")}</h2>
        {body.phrases.map((p) => (
          <div className="guide-expression" key={p.ja}>
            <Japanese text={p.ja} />
            <p>{p.en}</p>
          </div>
        ))}
      </section>
    </>
  );
}
export async function ProcedureSteps({ steps }: { steps: string[] }) {
  const t = await getTranslations("Guide");
  return (
    <section id="guide-steps" className="guide-content-section">
      <h2>{t("steps")}</h2>
      <ol className="guide-procedure-steps">
        {steps.map((s, i) => (
          <li key={i}>
            <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <p>{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
export async function DocumentChecklist({
  documents,
}: {
  documents: GuideBody["documents"];
}) {
  const t = await getTranslations("Guide");
  return (
    <section id="guide-documents" className="guide-content-section">
      <h2>{t("documents")}</h2>
      <p className="guide-fine">{t("documentsNotice")}</p>
      <ul>
        {documents.map((d, i) => (
          <li key={i}>
            <strong>{d.name}</strong>
            <p>{d.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
export async function OfficialSourceLinks({
  sources,
}: {
  sources: GuideSource[];
}) {
  const t = await getTranslations("Guide");
  return (
    <section id="guide-sources" className="guide-content-section">
      <h2>{t("sources")}</h2>
      <div className="guide-source-list">
        {sources.map((s) => (
          <article key={s.id}>
            <h3>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title} ↗
              </a>
            </h3>
            <p>
              {t("jurisdiction")}: {s.jurisdiction}
            </p>
            <p>
              {t("verified")}: {s.verified_at ?? t("notVerified")}
            </p>
            <p>
              {t("publication")}: {s.publication_date ?? t("notProvided")}
            </p>
            <p>
              {s.review_status === "approved" ? t("reviewed") : t("unreviewed")}
            </p>
          </article>
        ))}
      </div>
      <p className="guide-fine">{t("reviewerNotice")}</p>
    </section>
  );
}
export async function RelatedJapaneseVocabulary({
  cards,
  slug,
}: {
  cards: StudyCard[];
  slug: string;
}) {
  const t = await getTranslations("Guide");
  if (!cards.length) return null;
  return (
    <section className="guide-content-section">
      <h2>{t("vocabulary")}</h2>
      <div className="guide-words">
        {cards.map((c) => (
          <article key={c.id}>
            <Japanese text={`{${c.term}|${c.reading}}`} />
            <p>{c.translations.en}</p>
          </article>
        ))}
      </div>
      <Link className="text-link" href={`/japan-guide/${slug}/vocabulary`}>
        {t("flashcards")} →
      </Link>
    </section>
  );
}
export async function RelatedLessons({
  lessons,
}: {
  lessons: { id: string; title: string }[];
}) {
  const t = await getTranslations("Guide");
  if (!lessons.length) return null;
  return (
    <section className="guide-content-section">
      <h2>{t("lessons")}</h2>
      <ul>
        {lessons.map((l) => (
          <li key={l.id}>
            <Link href={`/lessons/${l.id}`} className="text-link">
              {l.title} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
export async function RelatedRolePlay({
  scripts,
  locale,
}: {
  scripts: GuideBody["roleplays"];
  locale: string;
}) {
  const t = await getTranslations("Guide");
  if (!scripts.length) return null;
  return (
    <section className="guide-content-section">
      <h2>{t("roleplay")}</h2>
      <div className="guide-related-links">
        {scripts.map((s) => (
          <Link key={s.slug} href={`/japan-guide/role-play/${s.slug}`}>
            {locale === "ja" ? s.title_ja : s.title} →
          </Link>
        ))}
      </div>
    </section>
  );
}
