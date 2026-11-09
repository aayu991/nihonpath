"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { sendArticleFeedback } from "@/actions/guides";
export function ArticleFeedback({
  articleId,
  enabled,
}: {
  articleId: string;
  enabled: boolean;
}) {
  const t = useTranslations("Guide"),
    [kind, setKind] = useState<"helpful" | "unclear" | "outdated">("helpful"),
    [notes, setNotes] = useState(""),
    [message, setMessage] = useState(""),
    [pending, start] = useTransition();
  return (
    <section className="guide-feedback">
      <h2>{t("feedback")}</h2>
      {!enabled ? (
        <p>{t("feedbackLogin")}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              try {
                const r = await sendArticleFeedback({ articleId, kind, notes });
                setMessage(t(r.error ? "saveError" : "feedbackSaved"));
              } catch {
                setMessage(t("saveError"));
              }
            });
          }}
        >
          <label>
            {t("feedbackKind")}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              {(["helpful", "unclear", "outdated"] as const).map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("notes")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </label>
          <p className="guide-fine">{t("notesHint")}</p>
          <Button disabled={pending}>
            {t(pending ? "saving" : "sendFeedback")}
          </Button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
    </section>
  );
}
