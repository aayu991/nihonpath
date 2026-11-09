"use client";
import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { guideKinds, type GuideBody } from "@/lib/guides/schema";
import {
  saveGuideContent,
  transitionGuideContent,
} from "@/actions/guide-admin";
import type { Json } from "@/lib/supabase/database.types";
type Kind = (typeof guideKinds)[number];
export type GuideAdminRow = {
  id: string;
  updated_at: string;
  [key: string]: Json | undefined;
};
const body: GuideBody = {
  sections: [
    {
      id: "overview",
      title: "Overview",
      text: "Describe who should confirm this procedure with the responsible authority.",
      kind: "suggestion",
    },
  ],
  steps: [
    "Ask the responsible office which steps apply to your circumstances.",
  ],
  documents: [],
  deadline: null,
  phrases: [],
  dialogue: [],
  roleplays: [],
};
const templates: Record<Kind, object> = {
  category: {
    slug: "new-category",
    title: "Category",
    title_ja: "カテゴリー",
    icon: "FileText",
    position: 10,
  },
  article: {
    slug: "new-guide",
    category_id: "",
    title: "New guide",
    summary: "Describe the scope and who should seek official confirmation.",
    content: body,
    format: "guide",
    audiences: ["resident"],
    stages: ["arriving"],
    risk: "administrative",
    deck_id: null,
    bank_id: null,
    lesson_ids: [],
    ai_scenario_id: null,
    source_ids: [],
  },
  translation: {
    article_id: "",
    locale: "ja",
    title: "日本語のガイド",
    summary: "対象と確認先を説明します。",
    content: {
      ...body,
      sections: [
        {
          id: "overview",
          title: "概要",
          text: "対象と担当の公式機関を確認してください。",
          kind: "suggestion",
        },
      ],
      steps: ["担当窓口に、自分に該当する手続きを確認します。"],
    },
  },
  source: {
    title: "Official authority reference",
    url: "https://www.moj.go.jp/isa/support/",
    summary: "Describe the exact guidance to verify on this official page.",
    summary_ja: "この公式ページで確認する情報を説明します。",
    jurisdiction: "Japan · specify authority and scope",
    publication_date: null,
    verified_at: null,
  },
  template: {
    title: "Preparation plan",
    title_ja: "準備の計画",
    guide_category_id: "",
    audiences: ["resident"],
    stages: ["arriving"],
    source_id: "",
  },
  item: {
    template_id: "",
    title: "Confirm the applicable arrangements",
    title_ja: "該当する取り扱いを確認する",
    note: "A personal planning reminder, not proof of compliance.",
    note_ja: "個人の準備メモであり、法令の遵守を証明するものではありません。",
    kind: "suggestion",
    circumstance: "all",
    audiences: ["resident"],
    position: 0,
    guide_id: null,
  },
};
export function GuideAdminEditor({
  library,
  revisions,
  reviews,
  feedback,
}: {
  library: Record<Kind, GuideAdminRow[]>;
  revisions: GuideAdminRow[];
  reviews: GuideAdminRow[];
  feedback: GuideAdminRow[];
}) {
  const router = useRouter(),
    [kind, setKind] = useState<Kind>("article"),
    [id, setId] = useState<string | null>(null),
    [document, setDocument] = useState(
      JSON.stringify(templates.article, null, 2),
    ),
    [initial, setInitial] = useState(document),
    [notes, setNotes] = useState(""),
    [attested, setAttested] = useState(false),
    [error, setError] = useState(""),
    [pending, start] = useTransition(),
    [preview, setPreview] = useState(false);
  const row = library[kind].find((r) => r.id === id),
    dirty = document !== initial;
  function choose(k: Kind, r?: GuideAdminRow) {
    if (dirty && !window.confirm("Discard this unsaved draft?")) return;
    setKind(k);
    setId(r?.id ?? null);
    const next = JSON.stringify(r ?? templates[k], null, 2);
    setDocument(next);
    setInitial(next);
    setNotes("");
    setAttested(false);
    setError("");
    setPreview(false);
  }
  function run(action: string) {
    start(async () => {
      setError("");
      try {
        const result =
          action === "save"
            ? await saveGuideContent({
                kind,
                id,
                version: row?.updated_at ?? null,
                document,
              })
            : await transitionGuideContent({
                kind,
                id,
                version: row?.updated_at,
                action,
                notes,
                attested,
              });
        if (result.error) setError(result.error);
        else {
          if ("id" in result && typeof result.id === "string") setId(result.id);
          setInitial(document);
          setAttested(false);
          router.refresh();
        }
      } catch {
        setError("Request failed. Your draft is still here.");
      }
    });
  }
  let parsed: Record<string, Json> = {};
  try {
    const v: unknown = JSON.parse(document);
    if (v && typeof v === "object" && !Array.isArray(v))
      parsed = v as Record<string, Json>;
  } catch {
    /* Save reports validation errors. */
  }
  return (
    <>
      <nav className="prep-controls" aria-label="Guide content type">
        {guideKinds.map((k) => (
          <Button
            key={k}
            variant={k === kind ? "default" : "outline"}
            disabled={pending}
            onClick={() => choose(k)}
          >
            {k}
          </Button>
        ))}
      </nav>
      <div className="guide-admin-layout">
        <aside className="prep-card">
          <h2>Draft library</h2>
          <Button
            disabled={pending}
            variant="outline"
            onClick={() => choose(kind)}
          >
            New {kind}
          </Button>
          <ul className="guide-admin-list">
            {library[kind].map((r) => (
              <li key={r.id}>
                <button
                  disabled={pending}
                  className="text-link text-left"
                  onClick={() => choose(kind, r)}
                >
                  {String(r.title ?? r.title_ja ?? r.id)}
                  <small>
                    {String(r.review_status ?? "parent reviewed")}{" "}
                    {r.published ? "· published" : ""}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          <Link className="text-link" href="/admin">
            Programs, lessons, vocabulary & banks →
          </Link>
        </aside>
        <section className="prep-card">
          <h2>
            {id ? "Edit" : "Create"} {kind}
          </h2>
          <p>
            Structured English content and separately reviewed translations.
            Source verification dates must reflect an actual check. No review is
            implied by importing drafts.
          </p>
          <label htmlFor="guide-json">Content JSON</label>
          <textarea
            id="guide-json"
            className="guide-json-editor"
            spellCheck={false}
            value={document}
            disabled={pending}
            onChange={(e) => {
              setDocument(e.target.value);
              setAttested(false);
            }}
          />
          <div className="prep-controls">
            <Button disabled={pending} onClick={() => run("save")}>
              Save draft
            </Button>
            <Button variant="outline" onClick={() => setPreview((p) => !p)}>
              {preview ? "Hide preview" : "Preview content"}
            </Button>
          </div>
          {preview && (
            <article className="guide-admin-preview">
              <h3>{String(parsed.title ?? "Draft")}</h3>
              <p>{String(parsed.summary ?? parsed.note ?? "")}</p>
              <pre>{JSON.stringify(parsed.content ?? parsed, null, 2)}</pre>
            </article>
          )}
          {error && (
            <p role="alert" className="form-message error">
              {error}
            </p>
          )}
          {dirty && (
            <p role="status">Unsaved changes. Save before reviewing.</p>
          )}
          {row && kind !== "item" && (
            <>
              <h3>Human review & publication</h3>
              <label htmlFor="guide-review-notes">
                Review notes (at least 10 characters)
              </label>
              <textarea
                id="guide-review-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
              />
              <label className="guide-inline-check">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                />
                I actually checked the current sources, applicability and
                content for this review action.
              </label>
              <div className="prep-controls">
                {(
                  [
                    "request_review",
                    "review_sources",
                    "approve",
                    "publish",
                    "unpublish",
                    "outdated",
                  ] as const
                )
                  .filter(
                    (a) =>
                      (kind === "article" ||
                        !["review_sources", "outdated"].includes(a)) &&
                      (kind !== "translation" ||
                        !["publish", "unpublish"].includes(a)),
                  )
                  .map((a) => (
                    <Button
                      key={a}
                      variant="outline"
                      disabled={
                        pending ||
                        dirty ||
                        (["approve", "review_sources", "outdated"].includes(
                          a,
                        ) &&
                          (!attested || notes.trim().length < 10))
                      }
                      onClick={() => run(a)}
                    >
                      {a.replaceAll("_", " ")}
                    </Button>
                  ))}
              </div>
              <p className="guide-fine">
                Articles: request review → review sources → approve → publish.
                Legal, administrative and safety content needs a source review
                for the current version. Reviewed Japanese, published parents
                and learning links are checked in the database.
              </p>
            </>
          )}
        </section>
      </div>
      <section className="guide-admin-audit">
        <h2>Revision and review history</h2>
        <p>
          Most recent 100 entries. Previous snapshots remain read-only; copying
          an older snapshot into the editor creates a new draft and requires
          review again.
        </p>
        {id && (
          <>
            {revisions
              .filter((r) => r.article_id === id || r.entity_id === id)
              .map((r) => (
                <details key={r.id}>
                  <summary>
                    {String(r.entity_kind)} · {String(r.created_at)}
                  </summary>
                  <pre>{JSON.stringify(r.snapshot, null, 2)}</pre>
                </details>
              ))}
            {reviews
              .filter((r) => r.article_id === id)
              .map((r) => (
                <p key={r.id}>
                  {String(r.kind)} · version {String(r.article_version)} ·{" "}
                  {String(r.created_at)} · reviewer {String(r.reviewer_id)}
                  <br />
                  {String(r.notes)}
                </p>
              ))}
          </>
        )}
        <h2>Learner feedback</h2>
        {feedback.map((f) => (
          <p key={f.id}>
            {String(f.kind)} · article {String(f.article_id)} ·{" "}
            {String(f.created_at)}
            <br />
            {String(f.notes)}
          </p>
        ))}
      </section>
    </>
  );
}
