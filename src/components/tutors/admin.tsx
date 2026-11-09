"use client";
import { useLocale } from "next-intl";
import {
  reviewTutorApplication,
  moderateTutorContent,
  purgeTutorPrivate,
} from "@/actions/tutors";
import { type TutorAdminWorkspace, lessonTime } from "@/lib/tutors/schema";
import { TutorForm, useTutorText } from "./shared";
export function TutorAdmin({ data }: { data: TutorAdminWorkspace | null }) {
  const t = useTutorText(),
    locale = useLocale();
  return (
    <section className="container tutor-entry">
      <p className="eyebrow">NIHONPATH / ADMIN</p>
      <h1>{t("admin")}</h1>
      {!data ? (
        <p>{t("unavailable")}</p>
      ) : (
        <>
          <section className="tutor-panel">
            <h2>{t("applications")}</h2>
            {!data.applications.length && <p>{t("empty")}</p>}
            {data.applications.map((a) => (
              <details className="tutor-admin-record" key={a.user_id}>
                <summary>
                  {a.display_name} · {t(a.status)}
                </summary>
                <p>
                  {a.country} · {a.timezone} · {a.languages.join(" / ")} ·{" "}
                  {a.levels.join(" / ")}
                </p>
                <p>{a.biography}</p>
                <h3>{t("credentials")}</h3>
                <p className="tutor-preserve">{a.credentials || "—"}</p>
                {a.video_url && (
                  <a href={a.video_url} target="_blank" rel="noreferrer">
                    {t("watchVideo")} ↗
                  </a>
                )}
                <p>
                  {t("experience")}: {a.experience_years}
                </p>
                <TutorForm
                  action={(fd) =>
                    reviewTutorApplication({
                      tutor: a.user_id,
                      expected: a.updated_at,
                      action: fd.get("action"),
                      notes: fd.get("notes"),
                      verified: fd.get("verified") === "on",
                      summary: fd.get("summary"),
                      attested: fd.get("attested") === "on",
                    })
                  }
                >
                  <label>
                    {t("status")}
                    <select name="action" required>
                      <option value="">—</option>
                      {["submitted", "rejected", "suspended"].includes(
                        a.status,
                      ) && (
                        <option value="under_review">
                          {t("under_review")}
                        </option>
                      )}
                      {a.status === "under_review" && (
                        <>
                          <option value="approved">{t("approved")}</option>
                          <option value="rejected">{t("rejected")}</option>
                        </>
                      )}
                      {a.status === "approved" && (
                        <option value="verification">
                          {t("manageVerification")}
                        </option>
                      )}
                      <option value="suspended">{t("suspended")}</option>
                    </select>
                  </label>
                  <label>
                    {t("applicationFeedback")}
                    <textarea
                      name="notes"
                      required
                      minLength={10}
                      maxLength={4000}
                      defaultValue={a.review_notes}
                    />
                  </label>
                  <label className="tutor-checkbox">
                    <input type="checkbox" name="verified" />
                    {t("verified")}
                  </label>
                  <label>
                    {t("qualificationSummary")}
                    <textarea name="summary" maxLength={2000} />
                  </label>
                  <label className="tutor-checkbox">
                    <input type="checkbox" name="attested" />
                    {t("attest")}
                  </label>
                </TutorForm>
              </details>
            ))}
          </section>
          <section className="tutor-panel">
            <h2>{t("reviews")}</h2>
            {data.reviews.map((r) => (
              <details key={r.id} className="tutor-admin-record">
                <summary>
                  ★ {r.rating} ·{" "}
                  {t(
                    r.moderation_status === "pending"
                      ? "moderationPending"
                      : r.moderation_status,
                  )}
                </summary>
                <p>{r.body}</p>
                <p>{r.response}</p>
                <TutorForm
                  action={(fd) =>
                    moderateTutorContent({
                      kind: "review",
                      id: r.id,
                      action: fd.get("action"),
                      notes: fd.get("notes"),
                    })
                  }
                >
                  <label>
                    {t("status")}
                    <select name="action">
                      <option value="published">{t("published")}</option>
                      <option value="hidden">{t("hidden")}</option>
                    </select>
                  </label>
                  <label>
                    {t("reviewNotes")}
                    <textarea
                      name="notes"
                      required
                      minLength={10}
                      maxLength={4000}
                    />
                  </label>
                </TutorForm>
              </details>
            ))}
          </section>
          <section className="tutor-panel">
            <h2>{t("reports")}</h2>
            {data.reports.map((r) => (
              <details key={r.id} className="tutor-admin-record">
                <summary>
                  {r.status === "resolved" ? t("resolved") : t("report")}
                </summary>
                <p>{r.reason}</p>
                <p>{r.booking_id ?? r.review_id ?? r.tutor_id}</p>
                {r.status !== "resolved" && (
                  <TutorForm
                    action={(fd) =>
                      moderateTutorContent({
                        kind: "report",
                        id: r.id,
                        action: "resolved",
                        notes: fd.get("notes"),
                      })
                    }
                  >
                    <label>
                      {t("reviewNotes")}
                      <textarea
                        name="notes"
                        required
                        minLength={10}
                        maxLength={4000}
                      />
                    </label>
                  </TutorForm>
                )}
              </details>
            ))}
          </section>
          <section className="tutor-panel">
            <h2>{t("activity")}</h2>
            {data.bookings.map((b) => (
              <details key={b.id} className="tutor-admin-record">
                <summary>
                  {t(b.status)} · {lessonTime(b.starts_at, "UTC", locale)}
                </summary>
                <p>
                  {b.id} · {b.tutor_id}
                </p>
                {["pending", "confirmed"].includes(b.status) && (
                  <TutorForm
                    label="cancel"
                    action={(fd) =>
                      moderateTutorContent({
                        kind: "booking",
                        id: b.id,
                        action: "cancelled",
                        notes: fd.get("notes"),
                      })
                    }
                  >
                    <label>
                      {t("reviewNotes")}
                      <textarea
                        name="notes"
                        required
                        minLength={10}
                        maxLength={4000}
                      />
                    </label>
                  </TutorForm>
                )}
              </details>
            ))}
          </section>
          <section className="tutor-panel">
            <h2>{t("logs")}</h2>
            <ol>
              {data.logs.map((l) => (
                <li key={l.id}>
                  <time dateTime={l.created_at}>
                    {lessonTime(l.created_at, "UTC", locale)}
                  </time>{" "}
                  · {l.action}
                  <p>{l.notes}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="tutor-panel">
            <h2>{t("purge")}</h2>
            <p>{t("retention")}</p>
            <TutorForm label="purge" action={purgeTutorPrivate} />
          </section>
        </>
      )}
    </section>
  );
}
