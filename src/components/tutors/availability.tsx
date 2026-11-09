"use client";
import { useLocale } from "next-intl";
import { manageTutor } from "@/actions/tutors";
import {
  specialties,
  durations,
  money,
  lessonTime,
  type TutorWorkspace,
} from "@/lib/tutors/schema";
import {
  TutorForm,
  TutorTimezone,
  PriceFields,
  priceMinor,
  useTutorText,
} from "./shared";
export function TutorAvailability({ data }: { data: TutorWorkspace | null }) {
  const t = useTutorText(),
    locale = useLocale(),
    p = data?.profile;
  return (
    <section className="container tutor-entry">
      <h1>{t("availability")}</h1>
      {!data ? (
        <p>{t("unavailable")}</p>
      ) : data.application?.status !== "approved" || !p ? (
        <p>{t("applicationIntro")}</p>
      ) : (
        <>
          <section className="tutor-panel">
            <h2>{t("publish")}</h2>
            <TutorForm
              action={(fd) =>
                manageTutor("settings", {
                  timezone: fd.get("timezone"),
                  notice_hours: Number(fd.get("notice_hours")),
                  horizon_days: Number(fd.get("horizon_days")),
                  published: fd.get("published") === "on",
                })
              }
            >
              <TutorTimezone value={p.timezone} />
              <div className="tutor-two">
                <label>
                  {t("noticeHours")}
                  <input
                    name="notice_hours"
                    type="number"
                    min={0}
                    max={168}
                    required
                    defaultValue={p.notice_hours}
                  />
                </label>
                <label>
                  {t("horizonDays")}
                  <input
                    name="horizon_days"
                    type="number"
                    min={7}
                    max={90}
                    required
                    defaultValue={p.horizon_days}
                  />
                </label>
              </div>
              <label className="tutor-checkbox">
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={p.published}
                />
                {t("publish")}
              </label>
            </TutorForm>
          </section>
          <section className="tutor-panel">
            <h2>{t("lessonTypes")}</h2>
            <p>{t("paidUnavailable")}</p>
            {data.lesson_types.map((l) => (
              <div key={l.id} className="tutor-item">
                <strong>
                  {l.title} · {l.duration_minutes} ·{" "}
                  {money(l.price_minor, l.currency, locale)}
                </strong>
                <TutorForm
                  label={l.published ? "hide" : "show"}
                  action={() =>
                    manageTutor("lesson", { ...l, published: !l.published })
                  }
                >
                  <span>{t(l.published ? "published" : "draft")}</span>
                </TutorForm>
              </div>
            ))}
            <details>
              <summary>{t("addLesson")}</summary>
              <TutorForm
                label="addLesson"
                action={(fd) =>
                  manageTutor("lesson", {
                    id: null,
                    title: fd.get("title"),
                    specialty: fd.get("specialty"),
                    duration_minutes: Number(fd.get("duration_minutes")),
                    price_minor: priceMinor(
                      fd.get("price"),
                      fd.get("currency"),
                    ),
                    currency: fd.get("currency"),
                    published: fd.get("published") === "on",
                  })
                }
              >
                <label>
                  {t("lessonTitle")}
                  <input name="title" required maxLength={160} />
                </label>
                <div className="tutor-two">
                  <label>
                    {t("specialties")}
                    <select name="specialty">
                      {specialties.map((s) => (
                        <option key={s} value={s}>
                          {t(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("duration")}
                    <select name="duration_minutes">
                      {durations.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <PriceFields />
                <label className="tutor-checkbox">
                  <input name="published" type="checkbox" />
                  {t("published")}
                </label>
              </TutorForm>
            </details>
          </section>
          <section className="tutor-panel">
            <h2>{t("weekly")}</h2>
            <p>{p.timezone}</p>
            {data.rules.map((r) => (
              <div className="tutor-item" key={r.id}>
                <strong>
                  {new Intl.DateTimeFormat(locale, {
                    weekday: "long",
                    timeZone: "UTC",
                  }).format(new Date(Date.UTC(2026, 0, 4 + r.weekday)))}{" "}
                  · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                </strong>
                <TutorForm
                  label="remove"
                  action={() => manageTutor("remove_rule", { id: r.id })}
                />
              </div>
            ))}
            <TutorForm
              label="addRule"
              action={(fd) =>
                manageTutor("rule", {
                  weekday: Number(fd.get("weekday")),
                  start_time: fd.get("start_time"),
                  end_time: fd.get("end_time"),
                })
              }
            >
              <label>
                {t("weekday")}
                <select name="weekday">
                  {Array.from({ length: 7 }, (_, d) => (
                    <option key={d} value={d}>
                      {new Intl.DateTimeFormat(locale, {
                        weekday: "long",
                        timeZone: "UTC",
                      }).format(new Date(Date.UTC(2026, 0, 4 + d)))}
                    </option>
                  ))}
                </select>
              </label>
              <div className="tutor-two">
                <label>
                  {t("startTime")}
                  <input name="start_time" type="time" step={900} required />
                </label>
                <label>
                  {t("endTime")}
                  <input name="end_time" type="time" step={900} required />
                </label>
              </div>
            </TutorForm>
          </section>
          <section className="tutor-panel">
            <h2>{t("dateSpecific")}</h2>
            <p>{t("utcInput")}</p>
            {data.exceptions.map((e) => (
              <div key={e.id} className="tutor-item">
                <p>
                  {t(e.kind)} · {lessonTime(e.starts_at, p.timezone, locale)} —{" "}
                  {lessonTime(e.ends_at, p.timezone, locale)}
                </p>
                <TutorForm
                  label="remove"
                  action={() => manageTutor("remove_exception", { id: e.id })}
                />
              </div>
            ))}
            <TutorForm
              action={(fd) =>
                manageTutor("exception", {
                  kind: fd.get("kind"),
                  starts_at: new Date(
                    String(fd.get("starts_at")) + "Z",
                  ).toISOString(),
                  ends_at: new Date(
                    String(fd.get("ends_at")) + "Z",
                  ).toISOString(),
                })
              }
            >
              <label>
                {t("status")}
                <select name="kind">
                  <option value="available">{t("available")}</option>
                  <option value="blocked">{t("blocked")}</option>
                </select>
              </label>
              <div className="tutor-two">
                <label>
                  {t("startTime")} (UTC)
                  <input name="starts_at" type="datetime-local" required />
                </label>
                <label>
                  {t("endTime")} (UTC)
                  <input name="ends_at" type="datetime-local" required />
                </label>
              </div>
            </TutorForm>
          </section>
        </>
      )}
    </section>
  );
}
