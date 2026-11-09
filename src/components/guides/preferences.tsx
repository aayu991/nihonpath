"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { saveGuidePreferences } from "@/actions/guides";
import { audiences, stages, type GuidePreferences } from "@/lib/guides/schema";
export function GuidePreferencesForm({
  value,
  onChange,
  canSave,
}: {
  value: GuidePreferences;
  onChange: (v: GuidePreferences) => void;
  canSave: boolean;
}) {
  const t = useTranslations("Guide"),
    [pending, start] = useTransition(),
    [message, setMessage] = useState("");
  return (
    <section className="guide-preferences no-print">
      <h2>{t("personalize")}</h2>
      <p>{t("planningNotice")}</p>
      <fieldset>
        <legend>{t("audience")}</legend>
        <div className="guide-audience-options">
          {audiences.map((a) => (
            <label key={a}>
              <input
                type="checkbox"
                checked={value.audiences.includes(a)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...value.audiences, a]
                    : value.audiences.filter((v) => v !== a);
                  if (next.length) onChange({ ...value, audiences: next });
                }}
              />
              {t(`audiences.${a}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="guide-preference-row">
        <label>
          {t("stage")}
          <select
            value={value.stage}
            onChange={(e) =>
              onChange({
                ...value,
                stage: e.target.value as GuidePreferences["stage"],
              })
            }
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {t(`stages.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.renting}
            onChange={(e) => onChange({ ...value, renting: e.target.checked })}
          />
          {t("renting")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.banking}
            onChange={(e) => onChange({ ...value, banking: e.target.checked })}
          />
          {t("banking")}
        </label>
      </div>
      {canSave ? (
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMessage("");
              try {
                const r = await saveGuidePreferences(value);
                setMessage(r.error ? t("saveError") : t("saved"));
              } catch {
                setMessage(t("saveError"));
              }
            })
          }
        >
          {t(pending ? "saving" : "savePreferences")}
        </Button>
      ) : (
        <p className="guide-fine">{t("sessionOnly")}</p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
