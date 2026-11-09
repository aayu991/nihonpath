"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
const key = "nihonpath-analytics-consent";
const subscribe = (fn: () => void) => {
  window.addEventListener("storage", fn);
  window.addEventListener("nihonpath-consent", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("nihonpath-consent", fn);
  };
};
const current = () => {
  try {
    return navigator.doNotTrack === "1" ||
      ("globalPrivacyControl" in navigator && navigator.globalPrivacyControl)
      ? "no"
      : (localStorage.getItem(key) ?? "no");
  } catch {
    return "no";
  }
};
function setConsent(value: string) {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event("nihonpath-consent"));
  } catch {
    /* Consent remains off when browser storage is unavailable. */
  }
}
function send(body: unknown) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
const reportVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  if (current() !== "yes" || !["LCP", "INP", "CLS"].includes(metric.name))
    return;
  send({
    type: "vital",
    metric: metric.name,
    value: metric.value,
    consent: true,
  });
};
export function PrivacyChoices() {
  const t = useTranslations("Launch"),
    path = usePathname(),
    consent = useSyncExternalStore(subscribe, current, () => "no");
  useEffect(() => {
    if (consent !== "yes") return;
    const parts = path.split("/").filter(Boolean),
      locale = parts[0];
    if (!["en", "ja", "ne", "hi"].includes(locale)) return;
    const event =
      parts.length === 1
        ? "homepage_visit"
        : parts[1] === "courses"
          ? "course_exploration"
          : parts[1] === "lessons"
            ? "lesson_start"
            : null;
    if (event) send({ type: "event", event, locale, consent: true });
  }, [path, consent]);
  useReportWebVitals(reportVital);
  return (
    <details className="privacy-choices">
      <summary>{t("analytics")}</summary>
      <p>{t("analyticsBody")}</p>
      <div className="launch-actions">
        <Button
          type="button"
          variant="outline"
          onClick={() => setConsent("yes")}
        >
          {t("allow")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setConsent("no")}
        >
          {t("decline")}
        </Button>
      </div>
      <p role="status">{t(consent === "yes" ? "enabled" : "disabled")}</p>
    </details>
  );
}
