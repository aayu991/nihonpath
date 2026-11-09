"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  const t = useTranslations("Organization");
  return (
    <section className="org-panel">
      <h1>{t("title")}</h1>
      <p role="alert">{t("saveError")}</p>
      <Button onClick={reset}>{t("dashboard")}</Button>
    </section>
  );
}
