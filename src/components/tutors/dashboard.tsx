"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  tutorBookingAction,
  writeTutorReview,
  respondTutorReview,
} from "@/actions/tutors";
import {
  lessonTime,
  type Booking,
  type TutorWorkspace,
  timezoneSchema,
} from "@/lib/tutors/schema";
import {
  TutorForm,
  TutorTimezone,
  useViewerTimezone,
  useTutorText,
} from "./shared";
import { TutorReport } from "./report";
function BookingCard({
  b,
  user,
  zone,
}: {
  b: Booking;
  user: string;
  zone: string;
}) {
  const t = useTutorText(),
    locale = useLocale(),
    isTutor = user === b.tutor_id,
    ended = new Date(b.ends_at) <= new Date(),
    expired =
      b.status === "pending" &&
      !!b.request_expires_at &&
      new Date(b.request_expires_at) <= new Date(),
    acknowledged = isTutor ? b.tutor_completed_at : b.learner_completed_at;
  return (
    <article className="tutor-booking-card">
      <header>
        <div>
          <p className="tutor-badge">{t(expired ? "expired" : b.status)}</p>
          <h2>{b.lesson_title}</h2>
          <p>{isTutor ? b.learner_name : b.tutor_name}</p>
        </div>
        <time dateTime={b.starts_at}>
          {lessonTime(b.starts_at, zone, locale)}
          <br />— {lessonTime(b.ends_at, zone, locale)}
        </time>
      </header>
      {b.learning_goals && (
        <div>
          <h3>{t("goals")}</h3>
          <p>{b.learning_goals}</p>
        </div>
      )}
      {b.status_reason && <p>{b.status_reason}</p>}
      {b.cancellation_requested_at && (
        <p className="tutor-notice">{t("cancelRequested")}</p>
      )}
      {b.meeting_url && (
        <a
          className="tutor-card-link"
          href={b.meeting_url}
          target="_blank"
          rel="noreferrer"
        >
          {t("join")} ↗
        </a>
      )}
      <div className="tutor-booking-actions">
        {isTutor && b.status === "pending" && !expired && (
          <TutorForm
            label="confirm"
            action={() =>
              tutorBookingAction({
                id: b.id,
                action: "confirm",
                expected: b.updated_at,
                text: "",
              })
            }
          />
        )}
        {["pending", "confirmed"].includes(b.status) && (
          <details>
            <summary>{t("status")}</summary>
            <TutorForm
              action={(fd) =>
                tutorBookingAction({
                  id: b.id,
                  action: String(fd.get("action")),
                  expected: b.updated_at,
                  text: fd.get("reason") ?? "",
                })
              }
            >
              <label>
                {t("status")}
                <select name="action" required>
                  <option value="">—</option>
                  {isTutor && b.status === "pending" && (
                    <option value="decline">{t("decline")}</option>
                  )}
                  {(b.status === "pending" ||
                    (isTutor && b.status === "confirmed")) && (
                    <option value="cancel">{t("cancel")}</option>
                  )}
                  {!isTutor && b.status === "confirmed" && (
                    <option value="request_cancel">{t("requestCancel")}</option>
                  )}
                  {isTutor && b.status === "confirmed" && ended && (
                    <option value="no_show">{t("no_show")}</option>
                  )}
                </select>
              </label>
              <label>
                {t("reason")}
                <textarea name="reason" maxLength={2000} />
              </label>
            </TutorForm>
          </details>
        )}
        {b.status === "confirmed" &&
          ended &&
          (acknowledged ? (
            <p>{t("awaitOther")}</p>
          ) : (
            <TutorForm
              label="complete"
              action={() =>
                tutorBookingAction({
                  id: b.id,
                  action: "complete",
                  expected: b.updated_at,
                  text: "",
                })
              }
            />
          ))}
      </div>
      {isTutor && b.status === "confirmed" && (
        <details>
          <summary>{t("meeting")}</summary>
          <p>{t("meetingNotice")}</p>
          <TutorForm
            action={(fd) =>
              tutorBookingAction({
                id: b.id,
                action: "meeting",
                expected: b.updated_at,
                text: fd.get("url"),
              })
            }
          >
            <label>
              {t("meeting")}
              <input
                name="url"
                type="url"
                maxLength={2000}
                required
                defaultValue={b.meeting_url ?? ""}
              />
            </label>
          </TutorForm>
        </details>
      )}
      <details>
        <summary>{t("privateNote")}</summary>
        <p>{t("noteNotice")}</p>
        <TutorForm
          action={(fd) =>
            tutorBookingAction({
              id: b.id,
              action: "note",
              expected: b.updated_at,
              text: fd.get("note"),
            })
          }
        >
          <label>
            {t("privateNote")}
            <textarea
              name="note"
              rows={3}
              maxLength={3000}
              defaultValue={b.private_note}
            />
          </label>
        </TutorForm>
      </details>
      {!isTutor && b.status === "completed" && !b.reviewed && (
        <details>
          <summary>{t("writeReview")}</summary>
          <TutorForm
            label="writeReview"
            action={(fd) =>
              writeTutorReview({
                booking: b.id,
                rating: Number(fd.get("rating")),
                body: fd.get("body"),
              })
            }
          >
            <label>
              {t("rating")}
              <select name="rating">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              {t("reviewBody")}
              <textarea name="body" minLength={10} maxLength={2000} required />
            </label>
          </TutorForm>
        </details>
      )}
      <TutorReport kind="booking" target={b.id} />
    </article>
  );
}
export function TutorDashboard({
  data,
  asTutor,
}: {
  data: TutorWorkspace | null;
  asTutor: boolean;
}) {
  const t = useTutorText(),
    detected = useViewerTimezone(),
    [zone, setZone] = useState<string | null>(null),
    [date, setDate] = useState(""),
    [status, setStatus] = useState("all");
  const tz = zone && timezoneSchema.safeParse(zone).success ? zone : detected;
  const all =
    data?.bookings.filter(
      (b) => (asTutor ? b.tutor_id : b.learner_id) === data.user_id,
    ) ?? [];
  const effective = (b: Booking) =>
    b.status === "pending" &&
    b.request_expires_at &&
    new Date(b.request_expires_at) <= new Date()
      ? "expired"
      : b.status;
  const bookings = all.filter(
    (b) =>
      (status === "all" || effective(b) === status) &&
      (!date ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(b.starts_at)) === date),
  );
  return (
    <section className="container tutor-entry">
      <div className="tutor-market-heading">
        <div>
          <p className="eyebrow">NIHONPATH / LESSONS</p>
          <h1>{t(asTutor ? "dashboard" : "myLessons")}</h1>
        </div>
        <nav className="tutor-controls" aria-label={t("title")}>
          <Link className="text-link" href="/tutors">
            {t("title")} →
          </Link>
          {asTutor && (
            <>
              <Link className="text-link" href="/tutor/application">
                {t("apply")} →
              </Link>
              <Link className="text-link" href="/tutor/availability">
                {t("availability")} →
              </Link>
            </>
          )}
        </nav>
      </div>
      {!data ? (
        <p>{t("unavailable")}</p>
      ) : (
        <>
          {asTutor && (
            <p className="tutor-notice">
              {t(data.application?.status ?? "applicationIntro")}
            </p>
          )}
          <div className="tutor-kpis">
            {["pending", "confirmed", "completed", "cancelled"].map((s) => (
              <article key={s}>
                <span>{t(s)}</span>
                <strong>{all.filter((b) => effective(b) === s).length}</strong>
              </article>
            ))}
          </div>
          <section className="tutor-panel">
            <h2>{t("calendar")}</h2>
            <div className="tutor-search">
              <TutorTimezone value={zone ?? detected} onChange={setZone} />
              <label>
                {t("date")}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                {t("status")}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {[
                    "all",
                    "pending",
                    "confirmed",
                    "completed",
                    "cancelled",
                    "declined",
                    "no_show",
                    "expired",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p>{t("completionNotice")}</p>
          </section>
          <div className="tutor-booking-list">
            {bookings.map((b) => (
              <BookingCard key={b.id} b={b} user={data.user_id} zone={tz} />
            ))}
          </div>
          {!bookings.length && (
            <p className="tutor-empty">{t("emptyLessons")}</p>
          )}
          {asTutor &&
            !!data.reviews.filter((r) => r.tutor_id === data.user_id)
              .length && (
              <section className="tutor-panel">
                <h2>{t("reviews")}</h2>
                {data.reviews
                  .filter((r) => r.tutor_id === data.user_id)
                  .map((r) => (
                    <article className="tutor-item" key={r.id}>
                      <p>
                        ★ {r.rating} ·{" "}
                        {t(
                          r.moderation_status === "pending"
                            ? "moderationPending"
                            : r.moderation_status,
                        )}
                      </p>
                      <p>{r.body}</p>
                      <TutorForm
                        label="respond"
                        action={(fd) =>
                          respondTutorReview(r.id, String(fd.get("response")))
                        }
                      >
                        <label>
                          {t("response")}
                          <textarea
                            name="response"
                            maxLength={2000}
                            defaultValue={r.response}
                          />
                        </label>
                      </TutorForm>
                    </article>
                  ))}
              </section>
            )}
          <p className="tutor-fine">{t("retention")}</p>
        </>
      )}
    </section>
  );
}
