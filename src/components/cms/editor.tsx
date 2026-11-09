"use client";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { z } from "zod";
import {
  saveCms,
  transitionCms,
  restoreCms,
  type CmsResult,
} from "@/actions/cms";
import {
  lessonBody,
  seoSchema,
  type CmsKind,
  type CmsWorkspace,
  type CmsReferences,
} from "@/lib/cms/schema";
import { RichText, type RichBlock } from "./rich-text";
import { Japanese } from "@/components/learning/japanese";
import { QuestionEditor } from "./question-editor";
import type { Json } from "@/lib/supabase/database.types";
type Doc = Record<string, Json | undefined>;
type Permissions = {
  edit: boolean;
  review: boolean;
  publish: boolean;
  users: boolean;
  read: boolean;
};
function initial(kind: CmsKind, refs: CmsReferences): Doc {
  const common = {
    title: "",
    slug: "",
    seo: { title: "", description: "", canonical: "", image: "", index: false },
  };
  const course = refs.courses[0]?.id ?? "";
  switch (kind) {
    case "guide_article":
      return {
        title: "",
        slug: "",
        category_id: "",
        summary: "",
        content: {
          sections: [],
          steps: [],
          documents: [],
          deadline: null,
          phrases: [],
          dialogue: [],
          roleplays: [],
        },
        format: "guide",
        audiences: ["resident"],
        stages: ["settling"],
        risk: "general",
        deck_id: null,
        bank_id: null,
        lesson_ids: [],
        ai_scenario_id: null,
        source_ids: [],
        translations: [],
      };
    case "guide_category":
      return {
        title: "",
        slug: "",
        title_ja: "",
        icon: "BookOpen",
        position: 0,
      };
    case "guide_source":
      return {
        title: "",
        url: "",
        summary: "",
        summary_ja: "",
        jurisdiction: "",
        publication_date: null,
        verified_at: null,
      };
    case "exam":
      return {
        title: "",
        level: "n5",
        mode: "quick",
        source_bank_id: "",
        question_ids: [],
        duration_seconds: 600,
      };
    case "kanji":
      return {
        title: "",
        course_id: course,
        character: "",
        onyomi: "",
        kunyomi: "",
        meaning: "",
        example_words: "",
        lesson_id: null,
      };
    case "program":
      return { ...common, summary: "", category: "jlpt" };
    case "course":
      return { ...common, program_id: null };
    case "module":
      return { title: "", course_id: course, position: 0 };
    case "lesson":
      return {
        ...common,
        course_id: course,
        module_id: null,
        position: 0,
        subject: "grammar",
        description: "",
        minutes: 15,
        difficulty: "beginner",
        body: {
          text: "",
          explanationEn: "",
          explanationJa: "",
          examples: [],
          richText: [],
        },
      };
    case "translation":
      return {
        target_kind: "lesson",
        target_id: "",
        locale: "ja",
        title: "",
        content: {
          text: "",
          explanationEn: "",
          explanationJa: "",
          examples: [],
          richText: [],
        },
      };
    case "vocabulary":
      return {
        course_id: course,
        term: "",
        reading: "",
        meaning_en: "",
        meaning_ja: "",
        example: "",
        example_translation: "",
        category: "General",
      };
    case "deck":
      return { course_id: course, title: "", cards: [] };
    case "bank":
      return {
        course_id: course,
        title: "",
        subject: "grammar",
        questions: [],
      };
    case "block":
      return {
        lesson_id: "",
        kind: "text",
        position: 0,
        content: { text: "" },
        deck_id: null,
        question_bank_id: null,
        audio_asset_id: null,
      };
  }
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function CmsEditor({
  kind,
  workspace,
  references,
  permissions,
  history,
  preset,
}: {
  kind: CmsKind;
  workspace: CmsWorkspace | null;
  references: CmsReferences;
  permissions: Permissions;
  history: Json;
  preset?: Doc;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<Doc>(
    () => workspace?.document ?? { ...initial(kind, references), ...preset },
  );
  const [dirty, setDirty] = useState(false),
    [invalidJson, setInvalidJson] = useState(false),
    [sourceReviewed, setSourceReviewed] = useState(false),
    [preview, setPreview] = useState(false),
    [message, setMessage] = useState<CmsResult | null>(null),
    [notes, setNotes] = useState(""),
    [when, setWhen] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [mediaText, setMediaText] = useState(() =>
    Array.isArray(workspace?.document.media_ids)
      ? workspace.document.media_ids.join(", ")
      : "",
  );
  useEffect(() => {
    if (!dirty) return;
    const fn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  const str = (k: string) =>
    typeof doc[k] === "string" ? (doc[k] as string) : "";
  const put = (k: string, value: Json) => {
    setDoc((d) => ({ ...d, [k]: value }));
    setDirty(true);
    setMessage(null);
  };
  const bodyKey = kind === "translation" ? "content" : "body";
  const parsedBody = lessonBody.safeParse(doc[bodyKey]);
  const body = parsedBody.success
    ? parsedBody.data
    : {
        text: "",
        explanationEn: "",
        explanationJa: "",
        examples: [],
        richText: [],
      };
  const setBody = (value: Partial<typeof body>) =>
    put(bodyKey, JSON.parse(JSON.stringify({ ...body, ...value })) as Json);
  const seoParsed = seoSchema.safeParse(doc.seo ?? {});
  const seo = seoParsed.success
    ? seoParsed.data
    : { title: "", description: "", canonical: "", image: "", index: false };
  const input = (key: string, label: string, type = "text") => (
    <Field label={label}>
      <input
        type={type}
        value={
          type === "number"
            ? doc[key] === undefined
              ? ""
              : Number(doc[key])
            : str(key)
        }
        onChange={(e) =>
          put(
            key,
            type === "number"
              ? Number(e.target.value)
              : key.endsWith("_id") && !e.target.value
                ? null
                : e.target.value,
          )
        }
      />
    </Field>
  );
  const textarea = (key: string, label: string) => (
    <Field label={label}>
      <textarea
        rows={4}
        value={str(key)}
        onChange={(e) => put(key, e.target.value)}
      />
    </Field>
  );
  const select = (key: string, label: string, options: readonly string[]) => (
    <Field label={label}>
      <select value={str(key)} onChange={(e) => put(key, e.target.value)}>
        {options.map((v) => (
          <option value={v} key={v}>
            {v.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </Field>
  );
  const act = (task: () => Promise<CmsResult>, navigate = true) =>
    start(async () => {
      setMessage(null);
      try {
        const r = await task();
        setMessage(r);
        if (r.ok) {
          setDirty(false);
          if (navigate && r.id)
            router.replace(`/admin/editor/${kind}?id=${r.id}`);
          router.refresh();
        }
      } catch {
        setMessage({
          ok: false,
          error:
            "Request failed. Your text remains in the editor. Check your connection and try again.",
        });
      }
    });
  const save = (duplicate = false) => {
    if (invalidJson) {
      setMessage({
        ok: false,
        error: "Complete the invalid JSON before saving.",
      });
      return;
    }
    const copy = { ...doc };
    if (duplicate) {
      if (typeof copy.title === "string") copy.title += " (copy)";
      if (typeof copy.slug === "string")
        copy.slug += "-copy-" + Date.now().toString(36);
      if (typeof copy.position === "number") copy.position += 1;
    }
    act(() =>
      saveCms({
        kind,
        id: duplicate ? null : (workspace?.entity_id ?? null),
        version: duplicate ? 0 : (workspace?.version ?? 0),
        base: duplicate ? null : (workspace?.base_updated_at ?? null),
        document: JSON.stringify(copy),
      }),
    );
  };
  const transition = (action: string) => {
    if (!workspace || workspace.version === 0) return;
    act(async () => {
      const result = await transitionCms({
        kind,
        id: workspace.entity_id,
        version: workspace.version,
        action,
        notes:
          kind === "guide_article" && sourceReviewed
            ? `[sources-reviewed] ${notes}`
            : notes,
        when:
          action === "schedule" && when ? new Date(when).toISOString() : null,
      });
      if (result.ok && action === "delete")
        router.push(`/admin/editor/${kind}`);
      return result;
    }, action !== "delete");
  };
  const historyResult = z
    .array(
      z.object({
        id: z.number(),
        version: z.number(),
        created_at: z.string(),
        document: z.record(z.string(), z.json()),
      }),
    )
    .safeParse(history);
  const courseSelect = (
    <Field label="Course">
      <select
        value={str("course_id")}
        onChange={(e) => {
          put("course_id", e.target.value);
          if (kind === "lesson") put("module_id", null);
        }}
      >
        <option value="">Choose a published course</option>
        {references.courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title} · {c.slug}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <div className="cms-editor">
      <div className="cms-editor-status">
        <span className={`cms-badge cms-${workspace?.state ?? "draft"}`}>
          {workspace?.state?.replaceAll("_", " ") ?? "New draft"}
        </span>
        <span>
          {dirty
            ? "Unsaved changes"
            : workspace
              ? `Revision ${workspace.version}`
              : "Not saved"}
        </span>
        <button type="button" onClick={() => setPreview(!preview)}>
          {preview ? "Edit content" : "Preview content"}
        </button>
        {workspace && kind === "lesson" && workspace.live_published && (
          <Link href={`/lessons/${workspace.entity_id}`}>
            View public lesson →
          </Link>
        )}
      </div>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`form-message ${message.ok ? "success" : "error"}`}
        >
          {message.ok ? "Changes saved successfully." : message.error}
        </p>
      )}
      {preview ? (
        <section className="cms-panel cms-preview">
          <p className="cms-muted">
            Private editorial preview · unsaved text may be shown
          </p>
          <h2>{str("title") || str("term") || "Untitled draft"}</h2>
          {kind === "lesson" || kind === "translation" ? (
            <>
              <Japanese text={body.explanationJa ?? ""} />
              <p>{body.explanationEn ?? body.text}</p>
              <RichText blocks={body.richText} />
              {body.examples.map((e, i) => (
                <div className="lesson-example" key={i}>
                  <Japanese text={e.japanese} />
                  <p>{e.english}</p>
                </div>
              ))}
            </>
          ) : kind === "vocabulary" ? (
            <>
              <ruby>
                {str("term")}
                <rt>{str("reading")}</rt>
              </ruby>
              <p>{str("meaning_en")}</p>
              <Japanese text={str("example")} />
            </>
          ) : (
            <pre>{JSON.stringify(doc, null, 2)}</pre>
          )}
        </section>
      ) : (
        <fieldset
          disabled={!permissions.edit || pending}
          className="cms-editor-fields"
        >
          <legend className="sr-only">Content fields</legend>
          <section className="cms-panel">
            <h2>Content details</h2>
            <div className="cms-form-grid">
              {!["block", "vocabulary"].includes(kind) &&
                input("title", "Title")}
              {["program", "course", "lesson"].includes(kind) &&
                input("slug", "URL slug")}
              {[
                "module",
                "lesson",
                "vocabulary",
                "deck",
                "bank",
                "kanji",
              ].includes(kind) && courseSelect}
              {kind === "course" && (
                <Field label="Learning program">
                  <select
                    value={str("program_id")}
                    onChange={(e) => put("program_id", e.target.value || null)}
                  >
                    <option value="">Independent course</option>
                    {references.programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {kind === "course" && (
                <Field label="Access requirement">
                  <select
                    value={str("premium_feature")}
                    onChange={(e) =>
                      put("premium_feature", e.target.value || null)
                    }
                  >
                    <option value="">Free access</option>
                    {[
                      "jlpt",
                      "mock_exams",
                      "flashcards",
                      "ai_tutor",
                      "business",
                      "jft_ssw",
                      "organizations",
                    ].map((f) => (
                      <option key={f} value={f}>
                        Premium: {f}
                      </option>
                    ))}
                  </select>
                  <span className="cms-muted">
                    Requires an existing entitlement; this does not activate
                    payments.
                  </span>
                </Field>
              )}
              {kind === "kanji" && (
                <>
                  {input("character", "Kanji character")}
                  {input("onyomi", "On’yomi")}
                  {input("kunyomi", "Kun’yomi")}
                  {textarea("meaning", "Meaning")}
                  {textarea("example_words", "Example words")}
                  {input("lesson_id", "Related lesson UUID (optional)")}
                </>
              )}
              {kind === "program" && (
                <>
                  {select("category", "Category", [
                    "learn",
                    "jlpt",
                    "jft-basic",
                    "ssw",
                    "business",
                    "life-in-japan",
                    "ai-practice",
                    "organizations",
                  ])}
                  {textarea("summary", "Summary")}
                </>
              )}
              {["lesson", "module", "block"].includes(kind) &&
                input("position", "Order (unique within parent)", "number")}
              {kind === "lesson" && (
                <>
                  {select("subject", "Subject", [
                    "vocabulary",
                    "kanji",
                    "grammar",
                    "reading",
                    "listening",
                  ])}
                  <Field label="Module">
                    <select
                      value={str("module_id")}
                      onChange={(e) => put("module_id", e.target.value || null)}
                    >
                      <option value="">No module</option>
                      {references.modules
                        .filter((m) => m.course_id === str("course_id"))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                    </select>
                  </Field>
                  {select("difficulty", "Difficulty", [
                    "beginner",
                    "intermediate",
                    "advanced",
                  ])}
                  {input("minutes", "Estimated study time (minutes)", "number")}
                  {textarea("description", "Description")}
                </>
              )}
              {kind === "translation" && (
                <>
                  {select("target_kind", "Content type", [
                    "program",
                    "course",
                    "module",
                    "lesson",
                    "block",
                  ])}
                  {input("target_id", "Content UUID")}
                  {select("locale", "Translation language", [
                    "en",
                    "ja",
                    "ne",
                    "hi",
                  ])}
                  <p>
                    Only reviewed, published translations appear publicly. Keep
                    a separate revision for each language.
                  </p>
                </>
              )}
              {kind === "vocabulary" && (
                <>
                  {input("term", "Japanese spelling")}
                  {input("reading", "Furigana reading")}
                  {input("meaning_en", "English meaning")}
                  {input("meaning_ja", "Japanese meaning")}
                  {input("category", "Category / part of speech")}
                  {textarea("example", "Japanese example · {漢字|かんじ}")}
                  {textarea("example_translation", "Example translation")}
                </>
              )}
              {kind === "bank" &&
                select("subject", "Subject", [
                  "vocabulary",
                  "kanji",
                  "grammar",
                  "reading",
                ])}
            </div>
          </section>
          {(kind === "lesson" || kind === "translation") && (
            <>
              <section className="cms-panel">
                <h2>Japanese and explanations</h2>
                <p>
                  Use {"{漢字|かんじ}"} for ruby annotations. Grammar
                  publication requires at least two meaningful bilingual
                  examples.
                </p>
                <Field label="Japanese explanation">
                  <textarea
                    lang="ja"
                    rows={5}
                    value={body.explanationJa ?? ""}
                    onChange={(e) => setBody({ explanationJa: e.target.value })}
                  />
                </Field>
                <Field label="English explanation">
                  <textarea
                    rows={5}
                    value={body.explanationEn ?? ""}
                    onChange={(e) =>
                      setBody({
                        explanationEn: e.target.value,
                        text: e.target.value,
                      })
                    }
                  />
                </Field>
              </section>
              <section className="cms-panel">
                <h2>Rich lesson content</h2>
                <p>
                  Structured headings, paragraphs and lists. HTML is treated as
                  text; executable markup is rejected.
                </p>
                {body.richText.map((b, i) => (
                  <div className="cms-rich-block" key={i}>
                    <label>
                      <span className="sr-only">Block {i + 1} type</span>
                      <select
                        value={b.type}
                        onChange={(e) =>
                          setBody({
                            richText: body.richText.map((x, j) =>
                              i === j
                                ? {
                                    ...x,
                                    type: e.target.value as RichBlock["type"],
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        <option value="paragraph">Paragraph</option>
                        <option value="heading">Heading</option>
                        <option value="bullet">Bullet</option>
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Block {i + 1} text</span>
                      <textarea
                        value={b.text}
                        onChange={(e) =>
                          setBody({
                            richText: body.richText.map((x, j) =>
                              i === j ? { ...x, text: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setBody({
                          richText: body.richText.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove block {i + 1}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setBody({
                      richText: [
                        ...body.richText,
                        { type: "paragraph", text: "" },
                      ],
                    })
                  }
                >
                  + Add content block
                </button>
              </section>
              <section className="cms-panel">
                <h2>Example sentences</h2>
                {body.examples.map((e, i) => (
                  <div className="cms-example-editor" key={i}>
                    <Field label={`Example ${i + 1} · Japanese`}>
                      <textarea
                        lang="ja"
                        value={e.japanese}
                        onChange={(ev) =>
                          setBody({
                            examples: body.examples.map((x, j) =>
                              j === i ? { ...x, japanese: ev.target.value } : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label={`Example ${i + 1} · English`}>
                      <textarea
                        value={e.english}
                        onChange={(ev) =>
                          setBody({
                            examples: body.examples.map((x, j) =>
                              j === i ? { ...x, english: ev.target.value } : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() =>
                        setBody({
                          examples: body.examples.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove example {i + 1}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setBody({
                      examples: [
                        ...body.examples,
                        { japanese: "", english: "" },
                      ],
                    })
                  }
                >
                  + Add example
                </button>
              </section>
            </>
          )}
          {["guide_article", "guide_category", "guide_source", "exam"].includes(
            kind,
          ) && (
            <section className="cms-panel">
              <h2>Editorial document</h2>
              <p>
                Use the existing guide content structure. Guide publication
                requires a published category, verified official sources and a
                reviewed Japanese translation. Examination assembly supports
                quick/section practice from a published approved vocabulary,
                grammar or kanji bank.
              </p>
              <JsonField
                value={doc}
                onChange={(v) => {
                  setDoc(v as Doc);
                  setDirty(true);
                }}
                onInvalid={(v) => {
                  setInvalidJson(v);
                  setDirty(true);
                }}
              />
            </section>
          )}
          {["bank", "deck", "block"].includes(kind) && (
            <section className="cms-panel">
              <h2>
                {kind === "bank"
                  ? "Questions and private answer keys"
                  : kind === "deck"
                    ? "Flashcards"
                    : "Block content"}
              </h2>
              <p>
                {kind === "bank"
                  ? "Answer keys remain private until submission. Existing attempted banks must be duplicated rather than overwritten."
                  : "Use the validated document structure. Errors are shown when saving."}
              </p>
              {kind === "bank" ? (
                <QuestionEditor
                  value={doc.questions}
                  onChange={(v) => put("questions", v)}
                />
              ) : (
                <JsonField
                  onInvalid={(v) => {
                    setInvalidJson(v);
                    setDirty(true);
                  }}
                  value={kind === "block" ? doc : (doc.cards ?? [])}
                  onChange={(value) =>
                    kind === "block"
                      ? (setDoc(value as Doc), setDirty(true))
                      : put("cards", value)
                  }
                />
              )}
            </section>
          )}
          {["lesson", "course", "program", "guide_article"].includes(kind) && (
            <section className="cms-panel">
              <h2>Search and social metadata</h2>
              <label className="cms-field">
                Associated media IDs (comma-separated, approved assets only)
                <input
                  value={mediaText}
                  onChange={(e) => {
                    setMediaText(e.target.value);
                    put(
                      "media_ids",
                      e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    );
                  }}
                />
              </label>
              <div className="cms-form-grid">
                {(["title", "description", "canonical"] as const).map((key) => (
                  <Field
                    label={
                      key === "canonical"
                        ? "Canonical URL · https://nihonpath.org"
                        : `SEO ${key}`
                    }
                    key={key}
                  >
                    <input
                      value={seo[key]}
                      onChange={(e) =>
                        put("seo", { ...seo, [key]: e.target.value })
                      }
                    />
                  </Field>
                ))}
              </div>
              <Field label="Open Graph / thumbnail image asset ID">
                <input
                  value={seo.image}
                  onChange={(e) =>
                    put("seo", { ...seo, image: e.target.value })
                  }
                />
              </Field>
              <label className="cms-check">
                <input
                  type="checkbox"
                  checked={seo.index}
                  onChange={(e) =>
                    put("seo", { ...seo, index: e.target.checked })
                  }
                />
                Allow indexing after publication and site-wide release approval
              </label>
            </section>
          )}
        </fieldset>
      )}
      <section className="cms-panel">
        <h2>Publishing workflow</h2>
        <p>Draft → In review → Approved → Published → Archived</p>
        {workspace?.version === 0 && (
          <p role="status">
            Save a draft to initialize revision tracking before using the new
            publishing workflow. Existing public content remains unchanged.
          </p>
        )}
        {workspace?.review_notes && (
          <blockquote>{workspace.review_notes}</blockquote>
        )}
        {kind === "guide_article" && (
          <label className="cms-check">
            <input
              type="checkbox"
              checked={sourceReviewed}
              onChange={(e) => setSourceReviewed(e.target.checked)}
            />
            I personally reviewed the linked official sources and the
            immigration, legal, tax, employment or safety statements in this
            revision.
          </label>
        )}
        <Field label="Human review notes (at least 10 characters)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </Field>
        <div className="cms-actions">
          {permissions.edit && (
            <>
              <button
                type="button"
                className="cms-primary"
                disabled={pending}
                onClick={() => save()}
              >
                {pending ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => save(true)}
              >
                Duplicate as new draft
              </button>
            </>
          )}
          {workspace && (
            <>
              {permissions.edit && workspace.state === "draft" && (
                <button
                  type="button"
                  disabled={pending || dirty || workspace?.version === 0}
                  onClick={() => transition("submit")}
                >
                  Submit for review
                </button>
              )}
              {permissions.review && workspace.state === "in_review" && (
                <>
                  <button
                    type="button"
                    disabled={pending || dirty || workspace?.version === 0}
                    onClick={() => transition("approve")}
                  >
                    Approve revision
                  </button>
                  <button
                    type="button"
                    disabled={pending || dirty || workspace?.version === 0}
                    onClick={() => transition("reject")}
                  >
                    Request changes
                  </button>
                </>
              )}
              {permissions.publish && workspace.state === "approved" && (
                <button
                  type="button"
                  className="cms-primary"
                  disabled={pending || dirty || workspace?.version === 0}
                  onClick={() => transition("publish")}
                >
                  Publish approved revision
                </button>
              )}
              {permissions.publish && (
                <>
                  <button
                    type="button"
                    disabled={pending || dirty || workspace?.version === 0}
                    onClick={() => transition("unpublish")}
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    disabled={pending || dirty || workspace?.version === 0}
                    onClick={() => transition("archive")}
                  >
                    Archive
                  </button>
                </>
              )}
            </>
          )}
        </div>
        {workspace && permissions.publish && workspace.state === "approved" && (
          <div className="cms-filters">
            <Field label="Publish at (your local time)">
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </Field>
            <button
              type="button"
              disabled={pending || dirty || workspace?.version === 0 || !when}
              onClick={() => transition("schedule")}
            >
              Schedule approved revision
            </button>
            <p>
              Server job must be configured; content remains private until the
              job successfully publishes it.
            </p>
          </div>
        )}
        {workspace?.scheduled_at && (
          <p>
            Scheduled: <time>{workspace.scheduled_at}</time>
          </p>
        )}
        {workspace &&
          permissions.publish &&
          !workspace.published_at &&
          !workspace.base_updated_at && (
            <details>
              <summary>Delete a never-published draft</summary>
              <label className="cms-check">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                I confirm deletion of this draft. Audit and revision history
                remain.
              </label>
              <button
                type="button"
                disabled={!confirm || pending || dirty}
                onClick={() => transition("delete")}
              >
                Delete confirmed draft
              </button>
            </details>
          )}
      </section>
      {workspace && (
        <section className="cms-panel">
          <h2>Revision history</h2>
          {historyResult.success && historyResult.data.length ? (
            historyResult.data.map((r) => (
              <div className="cms-list-row" key={r.id}>
                <span>
                  Revision {r.version} ·{" "}
                  {new Date(r.created_at).toLocaleString("en-GB", {
                    timeZone: "UTC",
                  }) + " UTC"}
                </span>
                {permissions.edit && (
                  <button
                    type="button"
                    disabled={pending || dirty || workspace?.version === 0}
                    onClick={() =>
                      act(() =>
                        restoreCms({
                          kind,
                          id: workspace.entity_id,
                          version: workspace.version,
                          revision: r.id,
                        }),
                      )
                    }
                  >
                    Restore to a new draft
                  </button>
                )}
              </div>
            ))
          ) : (
            <p>No saved editorial revisions yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
function JsonField({
  value,
  onChange,
  onInvalid,
}: {
  value: Json | undefined;
  onChange: (value: Json) => void;
  onInvalid: (invalid: boolean) => void;
}) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2)),
    [error, setError] = useState(false);
  return (
    <Field label="Structured content JSON">
      <textarea
        rows={18}
        className="cms-json"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          try {
            onChange(JSON.parse(e.target.value) as Json);
            setError(false);
            onInvalid(false);
          } catch {
            setError(true);
            onInvalid(true);
          }
        }}
      />
      {error && (
        <span role="alert">Incomplete JSON. Complete it before saving.</span>
      )}
    </Field>
  );
}
