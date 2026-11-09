"use client";
import { useActionState, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  saveContent,
  reviewContent,
  type ContentState,
} from "@/actions/content";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { categoryKeys } from "@/lib/platform/catalog";
import { subjects } from "@/lib/learning/study-types";
import type { ContentKind } from "@/lib/platform/validation";
import {
  referenceId,
  type AdminRecord,
  type ContentReferences,
} from "@/lib/platform/content-model";
export function ContentEditor({
  kind,
  record,
  references,
}: {
  kind: ContentKind;
  record?: AdminRecord;
  references: ContentReferences;
}) {
  const [dirty, setDirty] = useState(false);
  const t = useTranslations("Platform");
  const locale = useLocale();
  const [saveState, saveAction, pending] = useActionState(
    saveContent.bind(null, kind, locale),
    {} as ContentState,
  );
  const [reviewState, reviewAction, reviewPending] = useActionState(
    reviewContent.bind(null, kind, locale),
    {} as ContentState,
  );
  const targetKinds = [
    "program",
    "course",
    "module",
    "lesson",
    "block",
  ] as const;
  const initialTarget =
    targetKinds.find((key) => referenceId(record, key)) ?? "program";
  const [target, setTarget] =
    useState<(typeof targetKinds)[number]>(initialTarget);
  const [course, setCourse] = useState(referenceId(record, "course"));
  function field(name: string, label: string, area = false) {
    const raw = record?.[name];
    const value =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object"
          ? JSON.stringify(raw, null, 2)
          : area
            ? "{}"
            : "";
    return (
      <label>
        {label}
        {area ? (
          <textarea
            name={name}
            defaultValue={value}
            required
            maxLength={50000}
            rows={7}
          />
        ) : (
          <input
            name={name}
            defaultValue={value}
            required
            maxLength={name === "slug" ? 100 : 180}
          />
        )}
      </label>
    );
  }
  function select(
    name: string,
    label: string,
    options: { id: string; title: string }[],
    nullable = false,
    value?: string,
  ) {
    return (
      <label>
        {label}
        <select
          name={name}
          defaultValue={
            value ??
            (typeof record?.[name] === "string" ? (record[name] as string) : "")
          }
          required={!nullable}
        >
          <option value="" disabled={!nullable}>
            {t("none")}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div className="content-editor">
      <form
        action={saveAction}
        onChange={() => setDirty(true)}
        className="account-form"
        aria-busy={pending}
      >
        <fieldset disabled={pending || reviewPending}>
          <legend>{t("contentFields")}</legend>
          <input type="hidden" name="id" value={record?.id ?? ""} />
          <input
            type="hidden"
            name="expected_updated_at"
            value={record?.updated_at ?? ""}
          />
          {["program", "course", "module", "lesson", "translation"].includes(
            kind,
          ) && field("title", t("title"))}
          {["program", "course", "lesson"].includes(kind) &&
            field("slug", t("slug"))}
          {kind === "program" && (
            <>
              <label>
                {t("summary")}
                <textarea
                  name="summary"
                  defaultValue={
                    typeof record?.summary === "string" ? record.summary : ""
                  }
                  maxLength={2000}
                  rows={4}
                />
              </label>
              {select(
                "category",
                t("category"),
                categoryKeys.map((key) => ({
                  id: key,
                  title: t(`categories.${key}.label`),
                })),
              )}
            </>
          )}
          {kind === "course" &&
            select("program_id", t("program"), references.program, true)}
          {(kind === "module" || kind === "lesson") && (
            <label>
              {t("course")}
              <select
                name="course_id"
                value={course}
                onChange={(event) => setCourse(event.target.value)}
                required
              >
                <option value="" disabled>
                  {t("none")}
                </option>
                {references.course.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "lesson" &&
            select(
              "module_id",
              t("module"),
              references.module.filter((item) => item.course_id === course),
              true,
            )}
          {kind === "block" && (
            <>
              {select("lesson_id", t("lesson"), references.lesson)}
              <label>
                {t("kind")}
                <select
                  name="kind"
                  defaultValue={
                    typeof record?.kind === "string" ? record.kind : "text"
                  }
                >
                  {["text", "example", "flashcards", "quiz", "audio"].map(
                    (value) => (
                      <option
                        key={value}
                        value={value}
                        disabled={value === "audio" && !references.audio.length}
                      >
                        {value}
                        {value === "audio" && !references.audio.length
                          ? ` · ${t("comingSoon")}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {select("deck_id", t("deckId"), references.deck, true)}
              {select("question_bank_id", t("bankId"), references.bank, true)}
              {select("audio_asset_id", t("audioId"), references.audio, true)}
            </>
          )}
          {["module", "lesson", "block"].includes(kind) && (
            <label>
              {t("position")}
              <input
                type="number"
                name="position"
                min={0}
                max={10000}
                defaultValue={
                  typeof record?.position === "number" ? record.position : 0
                }
                required
              />
            </label>
          )}
          {kind === "lesson" && (
            <>
              <label>
                Subject
                <select
                  name="subject"
                  defaultValue={
                    typeof record?.subject === "string"
                      ? record.subject
                      : "vocabulary"
                  }
                >
                  {subjects.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </label>
              {field("body", t("body"), true)}
            </>
          )}
          {["block", "translation"].includes(kind) &&
            field("content", t("content"), true)}
          {kind === "translation" && (
            <>
              <label>
                {t("targetKind")}
                <select
                  name="target_kind"
                  value={target}
                  onChange={(event) =>
                    setTarget(event.target.value as typeof target)
                  }
                >
                  {targetKinds.map((value) => (
                    <option key={value} value={value}>
                      {t(value)}
                    </option>
                  ))}
                </select>
              </label>
              <div key={target}>
                {select(
                  "target_id",
                  t("targetId"),
                  references[target],
                  false,
                  referenceId(record, target),
                )}
              </div>
              {select("locale", t("locale"), [
                { id: "en", title: "English" },
                { id: "ja", title: "日本語" },
                { id: "ne", title: "नेपाली" },
                { id: "hi", title: "हिन्दी" },
              ])}
            </>
          )}
          <p className="field-hint">{t("jsonHelp")}</p>
          <p className="field-hint">{t("parentHelp")}</p>
          <Button type="submit">
            {pending ? t("saving") : t("saveDraft")}
          </Button>
        </fieldset>
        {saveState.error && (
          <p role="alert" className="form-message error">
            {t(saveState.error)}
          </p>
        )}
      </form>
      {record && (
        <section className="content-review-panel">
          <h2>{t("reviewStatus")}</h2>
          <p>
            <span className={`status-pill state-${record.review_status}`}>
              {t(record.published ? "published" : record.review_status)}
            </span>
          </p>
          <p className="field-hint">
            {t("updated")}:{" "}
            <time dateTime={record.updated_at}>{record.updated_at}</time>
          </p>
          <p className="field-hint">
            {dirty ? t("unsavedChanges") : t("parentHelp")}
          </p>
          <form action={reviewAction} aria-busy={reviewPending}>
            <input type="hidden" name="id" value={record.id} />
            <input
              type="hidden"
              name="expected_updated_at"
              value={record.updated_at}
            />
            <div className="review-buttons">
              {(record.published
                ? (["unpublish"] as const)
                : record.review_status === "draft"
                  ? (["request_review"] as const)
                  : record.review_status === "in_review"
                    ? (["approve"] as const)
                    : (["publish"] as const)
              ).map((action) => (
                <Button
                  name="action"
                  value={action}
                  key={action}
                  disabled={pending || reviewPending || dirty}
                >
                  {reviewPending ? t("saving") : t(action)}
                </Button>
              ))}
            </div>
          </form>
          {reviewState.error && (
            <p role="alert" className="form-message error">
              {t(reviewState.error)}
            </p>
          )}
          {kind === "lesson" && (
            <Link
              className="text-link"
              href={`/admin/lesson-preview/${record.id}`}
            >
              Preview saved lesson →
            </Link>
          )}
          <Link className="text-link" href={`/admin/content/${kind}`}>
            {t("create")} →
          </Link>
        </section>
      )}
    </div>
  );
}
