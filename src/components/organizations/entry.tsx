"use client";
import { organizationMessageKey } from "@/lib/organizations/messages";
import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  registerOrganization,
  acceptOrganizationInvite,
} from "@/actions/organizations";
import type { OrganizationInput } from "@/lib/organizations/schema";
export function OrganizationFields({ value }: { value?: OrganizationInput }) {
  const translate = useTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key));
  return (
    <div className="org-fields">
      {(["name", "contact_email", "contact_phone", "logo_url"] as const).map(
        (k) => (
          <label key={k}>
            {t(k)}
            <input
              name={k}
              type={
                k === "contact_email"
                  ? "email"
                  : k === "logo_url"
                    ? "url"
                    : "text"
              }
              required={k === "name"}
              maxLength={
                k === "name"
                  ? 180
                  : k === "contact_phone"
                    ? 60
                    : k === "logo_url"
                      ? 2000
                      : 254
              }
              defaultValue={value?.[k] ?? ""}
            />
          </label>
        ),
      )}
      <label>
        {t("kind")}
        <select name="kind" defaultValue={value?.kind ?? "institute"}>
          {["institute", "ssw_center", "employer", "training_provider"].map(
            (k) => (
              <option key={k} value={k}>
                {t(k === "employer" ? "employerType" : k)}
              </option>
            ),
          )}
        </select>
      </label>
      <label>
        {t("preferred_language")}
        <select
          name="preferred_language"
          defaultValue={value?.preferred_language ?? "en"}
        >
          {Object.entries({
            en: "English",
            ja: "日本語",
            ne: "नेपाली",
            hi: "हिन्दी",
          }).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("timezone")}
        <select name="timezone" defaultValue={value?.timezone ?? "Asia/Tokyo"}>
          {["Asia/Tokyo", "Asia/Kathmandu", "Asia/Kolkata", "UTC"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
export function OrganizationEntry({
  mode,
  token = "",
}: {
  mode: "register" | "onboarding";
  token?: string;
}) {
  const translate = useTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key)),
    locale = useLocale(),
    router = useRouter();
  const [pending, start] = useTransition(),
    [message, setMessage] = useState("");
  return (
    <section className="container org-entry">
      <p className="eyebrow">NIHONPATH / ORGANIZATIONS</p>
      <h1>{t(mode)}</h1>
      <p>{t(mode === "register" ? "verified" : "privacy")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            try {
              const result =
                mode === "register"
                  ? await registerOrganization(Object.fromEntries(data))
                  : await acceptOrganizationInvite(
                      String(data.get("token")),
                      data.get("share") === "on",
                    );
              if (result.error) setMessage(t(result.error));
              else router.push("/organization/dashboard", { locale });
            } catch {
              setMessage(t("saveError"));
            }
          });
        }}
      >
        {mode === "register" ? (
          <OrganizationFields />
        ) : (
          <>
            <label>
              {t("token")}
              <input
                name="token"
                autoComplete="off"
                required
                pattern="[a-f0-9]{64}"
                defaultValue={token}
              />
            </label>
            <label className="org-check">
              <input name="share" type="checkbox" />
              {t("sharing")}
            </label>
          </>
        )}
        <Button disabled={pending}>
          {t(pending ? "saving" : mode === "register" ? "register" : "accept")}
        </Button>
        {message && <p role="alert">{message}</p>}
      </form>
    </section>
  );
}
