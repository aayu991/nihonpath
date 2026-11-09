"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GuidePreferencesForm } from "./preferences";
import { saveGuideProgress } from "@/actions/guides";
import {
  relevantItems,
  type GuideCatalog,
  type GuidePreferences,
  type ChecklistProgress,
} from "@/lib/guides/schema";
type Draft = {
  completed: boolean;
  notes: string;
  due_date: string | null;
  item_version: number;
  updated_at: string | null;
};
export function PreparationChecklist({
  catalog,
  demo,
  member,
  preferences,
  progress,
}: {
  catalog: GuideCatalog;
  demo: boolean;
  member: boolean;
  preferences: GuidePreferences;
  progress: ChecklistProgress[];
}) {
  const t = useTranslations("Guide"),
    locale = useLocale(),
    [prefs, setPrefs] = useState(preferences),
    [category, setCategory] = useState("all"),
    [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
      Object.fromEntries(progress.map((p) => [p.item_id, p])),
    ),
    [pending, setPending] = useState<string[]>([]),
    [messages, setMessages] = useState<Record<string, string>>({});
  const canSave = member && !demo;
  const relevant = relevantItems(catalog, prefs),
    filtered = relevant.filter(
      (i) =>
        category === "all" ||
        catalog.templates.find((v) => v.id === i.template_id)
          ?.guide_category_id === category,
    );
  const get = (id: string, version: number): Draft =>
    drafts[id] ?? {
      completed: false,
      notes: "",
      due_date: null,
      item_version: version,
      updated_at: null,
    };
  const completed = relevant.filter((i) => {
      const v = get(i.id, i.version);
      return v.completed && v.item_version === i.version;
    }).length,
    percent = relevant.length
      ? Math.round((completed / relevant.length) * 100)
      : 0;
  function update(id: string, value: Draft) {
    setDrafts((s) => ({ ...s, [id]: value }));
    setMessages((s) => ({
      ...s,
      [id]: canSave ? t("save") : t("sessionOnly"),
    }));
  }
  async function save(id: string, value: Draft) {
    if (!canSave) return;
    setPending((p) => [...p, id]);
    try {
      const r = await saveGuideProgress({
        itemId: id,
        completed: value.completed,
        notes: value.notes,
        dueDate: value.due_date,
        expected: value.updated_at,
      });
      if (r.data) {
        setDrafts((s) => ({ ...s, [id]: r.data }));
        setMessages((s) => ({ ...s, [id]: t("saved") }));
      } else
        setMessages((s) => ({
          ...s,
          [id]: t(r.error === "stale" ? "stale" : "saveError"),
        }));
    } catch {
      setMessages((s) => ({ ...s, [id]: t("saveError") }));
    } finally {
      setPending((p) => p.filter((v) => v !== id));
    }
  }
  function exportPlan() {
    const data = {
      notice: t("notCompliance"),
      preferences: prefs,
      items: relevant.map((i) => ({
        title: locale === "ja" ? i.title_ja : i.title,
        kind: i.kind,
        ...get(i.id, i.version),
        completed:
          get(i.id, i.version).completed &&
          get(i.id, i.version).item_version === i.version,
      })),
    };
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json;charset=utf-8",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "nihonpath-personal-checklist.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="container guide-checklist">
      <GuidePreferencesForm
        value={prefs}
        onChange={setPrefs}
        canSave={canSave}
      />
      <section className="guide-progress-panel">
        <h2>{t("progress")}</h2>
        <strong>{percent}%</strong>
        <progress
          max={relevant.length || 1}
          value={completed}
          aria-label={t("progress")}
        />
        <p>
          {completed} / {relevant.length} {t("done")}
        </p>
        <p>{t("notCompliance")}</p>
        <p className="guide-fine">{t("privacy")}</p>
        <div className="prep-controls no-print">
          <Button onClick={() => window.print()} variant="outline">
            {t("print")}
          </Button>
          <Button onClick={exportPlan} variant="outline">
            {t("export")}
          </Button>
        </div>
      </section>
      <label className="guide-filter-label no-print">
        {t("category")}
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{t("all")}</option>
          {catalog.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {locale === "ja" ? c.title_ja : c.title}
            </option>
          ))}
        </select>
      </label>
      <p className="guide-fine">{t("dueNotice")}</p>
      <div className="guide-task-list">
        {filtered.map((i) => {
          const v = get(i.id, i.version),
            changed = v.item_version !== i.version;
          return (
            <article className="guide-task" key={i.id}>
              <label className="guide-task-title">
                <input
                  type="checkbox"
                  checked={v.completed && !changed}
                  disabled={pending.includes(i.id)}
                  onChange={(e) => {
                    const next = {
                      ...v,
                      completed: e.target.checked,
                      item_version: i.version,
                    };
                    update(i.id, next);
                    void save(i.id, next);
                  }}
                />
                <span>{locale === "ja" ? i.title_ja : i.title}</span>
              </label>
              <span className="guide-rule">{t(`kinds.${i.kind}`)}</span>
              <p>{locale === "ja" ? i.note_ja : i.note}</p>
              {changed && <p role="status">{t("taskChanged")}</p>}
              <details className="guide-task-details">
                <summary>
                  {t("notes")} / {t("due")}
                </summary>
                <label htmlFor={`note-${i.id}`}>{t("notes")}</label>
                <textarea
                  id={`note-${i.id}`}
                  value={v.notes}
                  maxLength={2000}
                  disabled={pending.includes(i.id)}
                  onChange={(e) =>
                    update(i.id, { ...v, notes: e.target.value })
                  }
                />
                <small>{t("notesHint")}</small>
                <label htmlFor={`due-${i.id}`}>{t("due")}</label>
                <input
                  id={`due-${i.id}`}
                  type="date"
                  value={v.due_date ?? ""}
                  disabled={pending.includes(i.id)}
                  onChange={(e) =>
                    update(i.id, { ...v, due_date: e.target.value || null })
                  }
                />
                {canSave && (
                  <Button
                    disabled={pending.includes(i.id)}
                    onClick={() =>
                      save(i.id, {
                        ...v,
                        completed: v.completed && !changed,
                        item_version: i.version,
                      })
                    }
                  >
                    {t(pending.includes(i.id) ? "saving" : "save")}
                  </Button>
                )}
              </details>
              <div className="guide-print-only">
                <p>{v.notes}</p>
                {v.due_date && (
                  <p>
                    {t("due")}: {v.due_date}
                  </p>
                )}
              </div>
              {messages[i.id] && (
                <p role="status" className="guide-fine">
                  {messages[i.id]}
                </p>
              )}
              {i.guide_id &&
                catalog.articles.some((a) => a.id === i.guide_id) && (
                  <Link
                    className="text-link"
                    href={`/japan-guide/${catalog.articles.find((a) => a.id === i.guide_id)!.slug}`}
                  >
                    {t("overview")} →
                  </Link>
                )}
              {catalog.sources.find(
                (s) =>
                  s.id ===
                  catalog.templates.find((v) => v.id === i.template_id)
                    ?.source_id,
              ) && (
                <a
                  className="text-link"
                  href={
                    catalog.sources.find(
                      (s) =>
                        s.id ===
                        catalog.templates.find((v) => v.id === i.template_id)
                          ?.source_id,
                    )!.url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("sources")} ↗
                </a>
              )}
            </article>
          );
        })}
      </div>
      {!filtered.length && <p className="guide-empty">{t("noResults")}</p>}
    </div>
  );
}
