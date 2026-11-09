"use client";
import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { loadTutorSlots, requestTutorBooking } from "@/actions/tutors";
import {
  lessonTime,
  money,
  tutorDay,
  timezoneSchema,
  type Tutor,
} from "@/lib/tutors/schema";
import { TutorTimezone, useViewerTimezone, useTutorText } from "./shared";
export function TutorBooking({
  tutor,
  member,
  self = false,
}: {
  tutor: Tutor;
  member: boolean;
  self?: boolean;
}) {
  const t = useTutorText(),
    locale = useLocale(),
    detected = useViewerTimezone(),
    [zone, setZone] = useState<string | null>(null),
    [duration, setDuration] = useState(
      tutor.lesson_types[0]?.duration_minutes ?? 30,
    ),
    [type, setType] = useState(tutor.lesson_types[0]?.id ?? ""),
    [day, setDay] = useState(""),
    [viewDay, setViewDay] = useState(""),
    [loaded, setLoaded] = useState(false),
    [slots, setSlots] = useState<{ starts_at: string; ends_at: string }[]>([]),
    [selected, setSelected] = useState(""),
    [goals, setGoals] = useState(""),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false),
    [pending, start] = useTransition(),
    [key, setKey] = useState(() => crypto.randomUUID());
  const tz = zone && timezoneSchema.safeParse(zone).success ? zone : detected,
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: detected,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    date = day || today,
    lesson = tutor.lesson_types.find((l) => l.id === type),
    price = lesson?.price_minor;
  function reset() {
    setSlots([]);
    setLoaded(false);
    setSelected("");
    setSaved(false);
    setMessage("");
    setKey(crypto.randomUUID());
  }
  return (
    <section className="tutor-booking">
      <h2>
        {t("book")} · {tutor.display_name}
      </h2>
      <p className="tutor-notice">{t("paidUnavailable")}</p>
      <div className="tutor-search">
        <TutorTimezone
          value={zone ?? detected}
          onChange={(v) => {
            setZone(v);
            reset();
          }}
        />
        <label>
          {t("duration")}
          <select
            value={duration}
            onChange={(e) => {
              const value = Number(e.target.value);
              setDuration(value);
              setType(
                tutor.lesson_types.find((l) => l.duration_minutes === value)
                  ?.id ?? "",
              );
              reset();
            }}
          >
            {[
              ...new Set(tutor.lesson_types.map((l) => l.duration_minutes)),
            ].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          {t("lessonTypes")}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              reset();
            }}
          >
            {tutor.lesson_types
              .filter((l) => l.duration_minutes === duration)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} · {money(l.price_minor, l.currency, locale)}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t("weekOf")}
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDay(e.target.value);
              reset();
            }}
          />
        </label>
      </div>
      <Button
        disabled={pending || !lesson}
        onClick={() =>
          start(async () => {
            setMessage("");
            try {
              const result = await loadTutorSlots({
                tutor: tutor.user_id,
                type,
                day: date,
                timezone: zone ?? detected,
              });
              setSlots(result.slots ?? []);
              setLoaded(!result.error);
              setViewDay(date);
              setSelected("");
              setMessage(
                result.error
                  ? t(result.error)
                  : !result.slots?.length
                    ? t("noSlots")
                    : "",
              );
            } catch {
              setMessage(t("saveError"));
            }
          })
        }
      >
        {t(pending ? "saving" : "checkAvailability")}
      </Button>
      <p>{t("bookingNotice")}</p>
      {loaded && (
        <div className="tutor-week" role="group" aria-label={t("calendar")}>
          {Array.from({ length: 7 }, (_, i) =>
            new Date(new Date(date + "T00:00:00Z").getTime() + i * 86400000)
              .toISOString()
              .slice(0, 10),
          ).map((d) => (
            <button
              type="button"
              key={d}
              aria-pressed={viewDay === d}
              onClick={() => {
                setViewDay(d);
                setSelected("");
                setSaved(false);
                setKey(crypto.randomUUID());
              }}
            >
              {new Intl.DateTimeFormat(locale, {
                timeZone: "UTC",
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(new Date(d + "T00:00:00Z"))}
              <span>
                {slots.filter((s) => tutorDay(s.starts_at, tz) === d).length}
              </span>
            </button>
          ))}
        </div>
      )}
      <fieldset className="tutor-slots">
        <legend>{t("selectSlot")}</legend>
        {slots
          .filter((s) => tutorDay(s.starts_at, tz) === (viewDay || date))
          .map((s) => (
            <label
              key={s.starts_at}
              className={selected === s.starts_at ? "selected" : ""}
            >
              <input
                type="radio"
                name="slot"
                checked={selected === s.starts_at}
                value={s.starts_at}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setKey(crypto.randomUUID());
                  setSaved(false);
                }}
              />
              <span>
                {lessonTime(s.starts_at, tz, locale)}
                <small>— {lessonTime(s.ends_at, tz, locale)}</small>
              </span>
            </label>
          ))}
      </fieldset>
      {loaded &&
        !slots.some((s) => tutorDay(s.starts_at, tz) === (viewDay || date)) && (
          <p>{t("noSlots")}</p>
        )}
      <label>
        {t("goals")}
        <textarea
          value={goals}
          maxLength={2000}
          rows={3}
          onChange={(e) => {
            setGoals(e.target.value);
            setKey(crypto.randomUUID());
            setSaved(false);
          }}
        />
      </label>
      {self ? (
        <Link className="text-link" href="/tutor/availability">
          {t("availability")} →
        </Link>
      ) : !member ? (
        <Link href="/login" className="text-link">
          {t("session")} →
        </Link>
      ) : (
        <Button
          disabled={pending || !selected || price !== 0 || saved}
          onClick={() =>
            start(async () => {
              setMessage("");
              try {
                const result = await requestTutorBooking({
                  id: key,
                  tutor: tutor.user_id,
                  type,
                  start: selected,
                  goals,
                });
                setMessage(t(result.error ?? "requestSent"));
                if (!result.error) setSaved(true);
              } catch {
                setMessage(t("saveError"));
              }
            })
          }
        >
          {t(pending ? "saving" : "confirmRequest")}
        </Button>
      )}
      {message && (
        <p role="status" className="tutor-message">
          {message}
        </p>
      )}
      {saved && (
        <Link className="text-link" href="/dashboard/lessons">
          {t("myLessons")} →
        </Link>
      )}
    </section>
  );
}
