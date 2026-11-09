"use client";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { localeSchema } from "@/lib/auth/validation";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { setPreferredLanguage } from "@/actions/preferences";
export function LanguageSwitcher() {
  const locale = useLocale(),
    pathname = usePathname(),
    router = useRouter(),
    t = useTranslations("Common"),
    s = useTranslations("Study");
  const [pending, start] = useTransition(),
    [error, setError] = useState(false);
  return (
    <span className="language-switch-wrap">
      <label className="language-switch">
        <Languages size={17} aria-hidden="true" />
        <select
          aria-label={t("language")}
          value={locale}
          disabled={pending}
          onChange={(e) => {
            const next = localeSchema.parse(e.target.value);
            start(async () => {
              setError(false);
              try {
                if (await setPreferredLanguage(next))
                  router.replace(pathname, { locale: next });
                else setError(true);
              } catch {
                setError(true);
              }
            });
          }}
        >
          {Object.entries({
            en: "English",
            ja: "日本語",
            ne: "नेपाली",
            hi: "हिन्दी",
          }).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <span role="alert" className="language-error">
          {s("networkError")}
        </span>
      )}
    </span>
  );
}
