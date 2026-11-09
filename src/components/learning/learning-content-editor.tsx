"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  saveLearningDocument,
  reviewLearningDocument,
} from "@/actions/learning-admin";
import {
  learningSchemas,
  type LearningKind,
} from "@/lib/learning/admin-validation";
import { Japanese } from "@/components/learning/japanese";
import { Button } from "@/components/ui/button";
export function LearningContentEditor({
  kind,
  initial,
  id,
  version,
  status,
  published,
}: {
  kind: LearningKind;
  initial: string;
  id?: string;
  version?: string;
  status?: string;
  published?: boolean;
}) {
  const t = useTranslations("Learning");
  const router = useRouter();
  const [document, setDocument] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const dirty = document !== initial;
  let content: unknown;
  try {
    content = JSON.parse(document);
  } catch {
    content = null;
  }
  const validated = learningSchemas[kind].safeParse(content);
  async function save(copy = false) {
    setPending(true);
    setError("");
    try {
      const result = await saveLearningDocument({
        kind,
        id: copy ? null : (id ?? null),
        version: copy ? null : (version ?? null),
        document,
      });
      if (result.ok && result.id) {
        router.replace(`/admin/learning/${kind}?id=${result.id}`);
        router.refresh();
      } else setError(result.error ?? t("saveError"));
    } catch {
      setError(t("saveError"));
    } finally {
      setPending(false);
    }
  }
  async function review(action: string) {
    if (!id || !version || dirty) return;
    setPending(true);
    setError("");
    try {
      if (await reviewLearningDocument({ kind, id, version, action }))
        router.refresh();
      else setError(t("reviewError"));
    } catch {
      setError(t("saveError"));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="learning-content-editor">
      <p>{t("editorHelp")}</p>
      <label>
        {t("document")}
        <textarea
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          rows={22}
          maxLength={200000}
          spellCheck={false}
          disabled={pending}
        />
      </label>
      <p>
        {t("state")}: {status ?? "draft"} ·{" "}
        {published ? t("published") : t("unpublished")}
      </p>
      <div className="practice-actions">
        <Button disabled={pending || !validated.success} onClick={() => save()}>
          {t(pending ? "saving" : "saveDraft")}
        </Button>
        {id && (
          <Button
            variant="outline"
            disabled={pending || !validated.success}
            onClick={() => save(true)}
          >
            {t("newRevision")}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!validated.success}
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          {t("preview")}
        </Button>
      </div>
      {!validated.success && (
        <p role="status">
          {t("invalidContent")}
          {validated.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {id && (
        <div className="practice-actions">
          {(["request_review", "approve", "publish", "unpublish"] as const).map(
            (action) => (
              <Button
                variant="outline"
                key={action}
                disabled={
                  pending ||
                  dirty ||
                  (action === "request_review"
                    ? status !== "draft" || published
                    : action === "approve"
                      ? status !== "in_review" || published
                      : action === "publish"
                        ? status !== "approved" || published
                        : !published)
                }
                onClick={() => review(action)}
              >
                {t(action)}
              </Button>
            ),
          )}
        </div>
      )}
      {dirty && id && <p>{t("saveBeforeReview")}</p>}
      {preview && validated.success && (
        <section className="admin-learning-preview">
          <h2>{t("preview")}</h2>
          {"cards" in validated.data ? (
            validated.data.cards.map((c, i) => (
              <article key={i}>
                <h3>
                  <ruby>
                    {c.term}
                    <rt>{c.reading}</rt>
                  </ruby>{" "}
                  · {c.meaning_en}
                </h3>
                <p className="japanese-sentence">
                  <Japanese text={c.example} />
                </p>
                <p>{c.example_translation}</p>
              </article>
            ))
          ) : "questions" in validated.data ? (
            validated.data.questions.map((q, i) => (
              <article key={i}>
                <p className="japanese-sentence">
                  <Japanese text={q.prompt} />
                </p>
                <ol>
                  {q.options.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ol>
                <p>
                  {t("correctOption")}: {q.correctIndex + 1}
                </p>
                <p>{q.explanation}</p>
                <p className="japanese-sentence">
                  <Japanese text={q.japaneseExplanation} />
                </p>
              </article>
            ))
          ) : (
            <article>
              <h3>
                {validated.data.term} · {validated.data.reading} ·{" "}
                {validated.data.meaning_en}
              </h3>
              <Japanese text={validated.data.example} />
            </article>
          )}
        </section>
      )}
    </div>
  );
}
