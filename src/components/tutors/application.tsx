"use client";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveTutorApplication } from "@/actions/tutors";
import {
  specialties,
  levels,
  durations,
  type TutorWorkspace,
} from "@/lib/tutors/schema";
import {
  TutorForm,
  TutorTimezone,
  PriceFields,
  priceMinor,
  useTutorText,
} from "./shared";
export function TutorApplication({ data }: { data: TutorWorkspace | null }) {
  const t = useTutorText(),
    locale = useLocale(),
    a = data?.application;
  return (
    <section className="container tutor-entry">
      <p className="eyebrow">NIHONPATH / TEACH</p>
      <h1>{t("apply")}</h1>
      <p>{t("applicationIntro")}</p>
      {!data ? (
        <p role="status">{t("unavailable")}</p>
      ) : (
        <>
          {a && (
            <div className="tutor-notice">
              <strong>{t(a.status)}</strong>
              {a.review_notes && <p>{a.review_notes}</p>}
            </div>
          )}
          {a?.status === "suspended" ? (
            <p>{t("suspended")}</p>
          ) : (
            <TutorForm
              label="save"
              submitLabel="submit"
              action={(fd, intent) =>
                saveTutorApplication(
                  {
                    display_name: fd.get("display_name"),
                    photo_url: fd.get("photo_url"),
                    languages: fd.getAll("languages"),
                    country: fd.get("country"),
                    timezone: fd.get("timezone"),
                    specialties: fd.getAll("specialties"),
                    levels: fd.getAll("levels"),
                    experience_years: Number(fd.get("experience_years")),
                    biography: fd.get("biography"),
                    video_url: fd.get("video_url"),
                    credentials: fd.get("credentials"),
                    durations: fd.getAll("durations").map(Number),
                    proposed_price_minor: priceMinor(
                      fd.get("price"),
                      fd.get("currency"),
                    ),
                    currency: fd.get("currency"),
                  },
                  a?.updated_at ?? null,
                  intent === "submit",
                )
              }
            >
              <div className="tutor-two">
                <label>
                  {t("name")}
                  <input
                    name="display_name"
                    required
                    maxLength={80}
                    defaultValue={a?.display_name ?? ""}
                  />
                </label>
                <label>
                  {t("country")}
                  <input
                    name="country"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={a?.country ?? ""}
                  />
                </label>
                <label>
                  {t("photo")}
                  <input
                    type="url"
                    name="photo_url"
                    maxLength={2000}
                    defaultValue={a?.photo_url ?? ""}
                  />
                </label>
                <TutorTimezone value={a?.timezone} />
              </div>
              <fieldset>
                <legend>{t("languages")}</legend>
                <div className="tutor-checks">
                  {[
                    "ja",
                    "en",
                    "ne",
                    "hi",
                    "zh",
                    "ko",
                    "es",
                    "fr",
                    "de",
                    "vi",
                    "id",
                    "th",
                  ].map((l) => (
                    <label key={l}>
                      <input
                        type="checkbox"
                        name="languages"
                        value={l}
                        defaultChecked={
                          a?.languages.some((value) => value === l) ??
                          l === "ja"
                        }
                      />
                      {new Intl.DisplayNames(locale, { type: "language" }).of(
                        l,
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>{t("specialties")}</legend>
                <div className="tutor-checks">
                  {specialties.map((s) => (
                    <label key={s}>
                      <input
                        type="checkbox"
                        name="specialties"
                        value={s}
                        defaultChecked={a?.specialties.includes(s) ?? false}
                      />
                      {t(s)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>{t("levels")}</legend>
                <div className="tutor-checks">
                  {levels.map((l) => (
                    <label key={l}>
                      <input
                        type="checkbox"
                        name="levels"
                        value={l}
                        defaultChecked={a?.levels.includes(l) ?? false}
                      />
                      {l.toUpperCase()}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                {t("experience")}
                <input
                  type="number"
                  name="experience_years"
                  min={0}
                  max={80}
                  required
                  defaultValue={a?.experience_years ?? 0}
                />
              </label>
              <label>
                {t("biography")}
                <textarea
                  name="biography"
                  required
                  minLength={50}
                  maxLength={4000}
                  rows={6}
                  defaultValue={a?.biography ?? ""}
                />
              </label>
              <label>
                {t("video")}
                <input
                  name="video_url"
                  type="url"
                  defaultValue={a?.video_url ?? ""}
                />
              </label>
              <label>
                {t("credentials")}
                <textarea
                  name="credentials"
                  maxLength={4000}
                  rows={3}
                  defaultValue={a?.credentials ?? ""}
                />
              </label>
              <p className="tutor-fine">{t("credentialNotice")}</p>
              <fieldset>
                <legend>{t("duration")}</legend>
                <div className="tutor-checks">
                  {durations.map((d) => (
                    <label key={d}>
                      <input
                        type="checkbox"
                        name="durations"
                        value={d}
                        defaultChecked={a?.durations.includes(d) ?? d === 30}
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </fieldset>
              <PriceFields
                minor={a?.proposed_price_minor}
                currency={a?.currency}
              />
              <p className="tutor-notice">{t("paidUnavailable")}</p>
            </TutorForm>
          )}
          <Link className="text-link" href="/tutor/dashboard">
            {t("dashboard")} →
          </Link>
        </>
      )}
    </section>
  );
}
