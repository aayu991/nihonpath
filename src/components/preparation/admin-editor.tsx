"use client";
import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Japanese } from "@/components/learning/japanese";
import {
  savePreparation,
  reviewPreparation,
  uploadPreparationAudio,
  verifyPreparationAudio,
} from "@/actions/preparation-admin";
import { prepKinds } from "@/lib/preparation/schema";
import type { Json } from "@/lib/supabase/database.types";
export type PrepAdminRow = {
  id: string;
  updated_at: string;
  review_status: string;
  published: boolean;
  [key: string]: Json | undefined;
};
const templates = {
  sector: {
    slug: "new-industry",
    title: "Industry title",
    title_ja: "業界名",
    summary: "Describe the language learning track.",
    summary_ja: "この業界の日本語を学びます。",
    course_id: "",
  },
  scenario: {
    sector_id: "",
    lesson_id: "",
    bank_id: "",
    title: "Confirm instructions",
    situation: "Ask a supervisor for clarification.",
    situation_ja: "上司に指示を確認します。",
    dialogue: [
      { speaker: "上司", ja: "確認してください。", en: "Please check." },
      {
        speaker: "作業員",
        ja: "もう一度お願いします。",
        en: "Could you repeat that?",
      },
    ],
  },
  interview: {
    sector_id: null,
    lesson_id: "",
    topic: "Introduction",
    prompt: "自己紹介をお願いします。",
    suggested_answer:
      "はじめまして。〇〇と申します。よろしくお願いいたします。",
    translation: "My name is __. Thank you for meeting with me.",
    explanation: "Personalize this example using truthful information.",
    explanation_ja: "自分の本当の情報に合わせて答えます。",
  },
  resource: {
    sector_id: null,
    category: "ssw",
    title: "Official sector guidance",
    url: "https://www.ssw.go.jp/en/",
    summary: "Verify the latest requirements with the official authority.",
    summary_ja: "最新の要件を公式機関で確認してください。",
    reviewed_at: "2026-10-24",
  },
};
export function PreparationEditor({
  library,
  audits,
}: {
  library: Record<string, PrepAdminRow[]>;
  audits: Record<string, Json>;
}) {
  const router = useRouter(),
    [kind, setKind] = useState<(typeof prepKinds)[number]>("sector"),
    [id, setId] = useState<string | null>(null),
    [document, setDocument] = useState(
      JSON.stringify(templates.sector, null, 2),
    ),
    [initial, setInitial] = useState(document),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [pending, startTransition] = useTransition();
  const rows = library[kind] ?? [],
    selected = rows.find((r) => r.id === id),
    dirty = document !== initial;
  function choose(kind: (typeof prepKinds)[number], row?: PrepAdminRow) {
    setKind(kind);
    setId(row?.id ?? null);
    const next = JSON.stringify(row ?? templates[kind], null, 2);
    setDocument(next);
    setInitial(next);
    setPreview(false);
    setError("");
  }
  function run(action: string) {
    startTransition(async () => {
      setError("");
      try {
        const result =
          action === "save"
            ? await savePreparation({
                kind,
                id,
                version: selected?.updated_at ?? null,
                document,
              })
            : await reviewPreparation({
                kind,
                id,
                version: selected?.updated_at,
                action,
              });
        if (result.error) setError(result.error);
        else {
          if ("id" in result && result.id) setId(result.id);
          setInitial(document);
          router.refresh();
        }
      } catch {
        setError("Request failed. Keep this draft and retry.");
      }
    });
  }
  let content: Record<string, Json> = {};
  try {
    const parsed: unknown = JSON.parse(document);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      content = parsed as Record<string, Json>;
  } catch {
    /* Invalid JSON is reported by Save. */
  }
  return (
    <>
      <nav className="prep-controls" aria-label="Preparation content kind">
        {prepKinds.map((k) => (
          <Button
            key={k}
            variant={kind === k ? "default" : "outline"}
            disabled={pending}
            onClick={() => choose(k)}
          >
            {k}
          </Button>
        ))}
      </nav>
      <div className="exam-center-grid">
        <aside className="prep-card">
          <h2>Content library</h2>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => choose(kind)}
          >
            New draft
          </Button>
          <ul className="prep-history">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  disabled={pending}
                  className="text-link text-left"
                  onClick={() => choose(kind, r)}
                >
                  {String(r.title ?? r.topic ?? r.prompt)}
                  <small className="block">
                    {r.review_status} ·{" "}
                    {r.published ? "Published" : "Unpublished"}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="prep-card">
          <h2>{id ? "Edit content" : "Create draft"}</h2>
          <p>
            Use existing courses, lessons, decks and question banks. Publishing
            requires reviewed content and matching published parents. A save
            resets review; stale versions are rejected.
          </p>
          <label htmlFor="prep-admin-document">Content document (JSON)</label>
          <textarea
            id="prep-admin-document"
            rows={22}
            value={document}
            disabled={pending}
            onChange={(e) => setDocument(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 font-mono text-base"
            spellCheck={false}
          />
          <div className="prep-controls">
            <Button disabled={pending} onClick={() => run("save")}>
              {pending ? "Saving…" : "Save draft"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreview(!preview)}
              aria-expanded={preview}
            >
              Preview text
            </Button>
            {selected &&
              !dirty &&
              (["review", "approve", "publish", "unpublish"] as const)
                .filter((a) =>
                  a === "unpublish"
                    ? selected.published
                    : a === "review"
                      ? selected.review_status === "draft"
                      : a === "approve"
                        ? selected.review_status === "in_review"
                        : selected.review_status === "approved" &&
                          !selected.published,
                )
                .map((a) => (
                  <Button
                    disabled={pending}
                    variant="outline"
                    key={a}
                    onClick={() => run(a)}
                  >
                    {a}
                  </Button>
                ))}
          </div>
          {dirty && <p>Save before requesting a review.</p>}
          {error && <p role="alert">{error}</p>}
          {preview && (
            <div className="prep-suggestion">
              {Object.entries(content)
                .filter(
                  ([key, v]) =>
                    typeof v === "string" &&
                    !["id", "updated_at", "created_at"].includes(key),
                )
                .map(([key, value]) => (
                  <p key={key}>
                    <strong>{key}: </strong>
                    <Japanese text={String(value)} />
                  </p>
                ))}
            </div>
          )}
          <details>
            <summary>Review and change audit</summary>
            <pre className="overflow-auto text-sm">
              {JSON.stringify(id ? (audits[id] ?? []) : [], null, 2)}
            </pre>
          </details>
        </div>
      </div>
      <div className="prep-controls">
        <Link className="text-link" href="/admin/content/program">
          Programs →
        </Link>
        <Link className="text-link" href="/admin/content/course">
          Courses →
        </Link>
        <Link className="text-link" href="/admin/content/lesson">
          Lessons →
        </Link>
        <Link className="text-link" href="/admin/learning/bank">
          Questions & private keys →
        </Link>
        <Link className="text-link" href="/admin/learning/vocabulary">
          Vocabulary →
        </Link>
        <Link className="text-link" href="/admin/learning/deck">
          Decks →
        </Link>
      </div>
    </>
  );
}
export type AudioPreview = {
  id: string;
  title: string;
  url: string | null;
  verifiedAt: string | null;
};
function AudioVerification({ asset }: { asset: AudioPreview }) {
  const [duration, setDuration] = useState(0),
    [played, setPlayed] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(""),
    [pending, startTransition] = useTransition(),
    router = useRouter();
  return (
    <article className="prep-card">
      <h3>{asset.title}</h3>
      {asset.url ? (
        <audio
          controls
          preload="metadata"
          src={asset.url}
          onLoadedMetadata={(e) => {
            const n = e.currentTarget.duration;
            setDuration(Number.isFinite(n) ? Math.ceil(n) : 0);
          }}
          onEnded={() => setPlayed(true)}
          onError={() =>
            setError("Playback failed. Do not approve this asset.")
          }
        />
      ) : (
        <p>Preview link unavailable; refresh your administrator session.</p>
      )}
      <p>
        {asset.verifiedAt
          ? `Playback verified: ${asset.verifiedAt}`
          : "Awaiting actual playback and human review."}
      </p>
      <label className="block">
        <input
          type="checkbox"
          disabled={!played}
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{" "}
        I listened to the complete clip and checked intelligibility, content and
        usage rights.
      </label>
      <Button
        disabled={pending || !confirmed || duration < 1 || !!error}
        onClick={() =>
          startTransition(async () => {
            try {
              const r = await verifyPreparationAudio(
                asset.id,
                duration,
                confirmed,
              );
              if (r.error) setError(r.error);
              else router.refresh();
            } catch {
              setError("Verification failed. Please retry.");
            }
          })
        }
      >
        Record playback verification
      </Button>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
export function PreparationAudio({ assets }: { assets: AudioPreview[] }) {
  const [pending, startTransition] = useTransition(),
    [error, setError] = useState(""),
    router = useRouter();
  return (
    <section className="prep-section">
      <h2>Listening asset review</h2>
      <p>
        Upload an original or licensed MP3, WAV or OGG clip up to 750 KB.
        Storage remains private. File signature checks do not replace actual
        playback and human content review. Verification does not automatically
        publish a listening test.
      </p>
      <form
        action={(form) =>
          startTransition(async () => {
            try {
              const r = await uploadPreparationAudio(form);
              if (r.error) setError(r.error);
              else {
                setError("");
                router.refresh();
              }
            } catch {
              setError("Upload failed. Try again.");
            }
          })
        }
        className="prep-upload-form"
      >
        <label>
          Title
          <input name="title" required minLength={3} maxLength={180} />
        </label>
        <label>
          Usage rights / source statement
          <input name="license" required minLength={10} maxLength={2000} />
        </label>
        <label>
          Audio clip
          <input
            type="file"
            name="audio"
            accept="audio/mpeg,audio/wav,audio/ogg"
            required
          />
        </label>
        <Button disabled={pending}>
          {pending ? "Uploading…" : "Upload private clip"}
        </Button>
        {error && <p role="alert">{error}</p>}
      </form>
      <div className="prep-resource-grid">
        {assets.map((a) => (
          <AudioVerification key={a.id} asset={a} />
        ))}
      </div>
    </section>
  );
}
