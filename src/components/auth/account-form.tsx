"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { accountAction, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Profile } from "@/lib/supabase/database.types";
export type FormMode =
  "login" | "register" | "forgot-password" | "reset-password" | "profile";
export function AccountForm({
  mode,
  configured = true,
  profile,
}: {
  mode: FormMode;
  configured?: boolean;
  profile?: Profile;
}) {
  const t = useTranslations("Study");
  const locale = useLocale();
  const [state, action, pending] = useActionState(
    accountAction.bind(null, mode, locale),
    { status: "idle" } as FormState,
  );
  const registration = mode === "register";
  const preferences = registration || mode === "profile";
  const password =
    mode === "login" || registration || mode === "reset-password";
  return (
    <form action={action} className="account-form" aria-busy={pending}>
      <fieldset disabled={pending || !configured}>
        <legend className="sr-only">
          {t(
            mode === "profile"
              ? "profile"
              : mode === "forgot-password"
                ? "forgot"
                : mode === "reset-password"
                  ? "reset"
                  : mode,
          )}
        </legend>
        {preferences && (
          <label>
            {t("displayName")}
            <input
              name="display_name"
              required
              minLength={1}
              maxLength={60}
              autoComplete="nickname"
              defaultValue={profile?.display_name}
            />
          </label>
        )}
        {mode !== "profile" && mode !== "reset-password" && (
          <label>
            {t("email")}
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
        )}
        {password && (
          <label>
            {t("password")}
            <input
              name="password"
              type="password"
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              aria-describedby={mode === "login" ? undefined : "password-hint"}
            />
          </label>
        )}
        {(registration || mode === "reset-password") && (
          <>
            <p id="password-hint" className="field-hint">
              {t("passwordHint")}
            </p>
            <label>
              {t("confirmPassword")}
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </>
        )}
        {preferences && (
          <>
            <label>
              {t("language")}
              <select
                name="preferred_language"
                defaultValue={profile?.preferred_language ?? locale}
              >
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ne">नेपाली</option>
                <option value="hi">हिन्दी</option>
              </select>
            </label>
            <label>
              {t("goal")}
              <select
                name="learning_goal"
                defaultValue={profile?.learning_goal ?? "jlpt"}
              >
                {(
                  [
                    "jlpt",
                    "business",
                    "conversation",
                    "study",
                    "work",
                    "travel",
                  ] as const
                ).map((goal) => (
                  <option key={goal} value={goal}>
                    {t(`goals.${goal}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("target")}
              <select
                name="jlpt_target"
                defaultValue={profile?.jlpt_target ?? "n5"}
              >
                {["n5", "n4", "n3", "n2", "n1"].map((level) => (
                  <option key={level} value={level}>
                    {level.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <Button type="submit">
          {pending
            ? t("saving")
            : t(
                mode === "profile"
                  ? "saveProfile"
                  : mode === "forgot-password"
                    ? "sendReset"
                    : mode === "reset-password"
                      ? "reset"
                      : mode,
              )}
        </Button>
      </fieldset>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`form-message ${state.status}`}
        >
          {state.message}
        </p>
      )}
      {mode === "login" && (
        <div className="form-links">
          <Link href="/forgot-password">{t("forgot")}</Link>
          <Link href="/register">{t("register")}</Link>
        </div>
      )}
      {registration && (
        <>
          <p className="field-hint">{t("emailNotice")}</p>
          <Link className="text-link" href="/login">
            {t("login")}
          </Link>
        </>
      )}
    </form>
  );
}
