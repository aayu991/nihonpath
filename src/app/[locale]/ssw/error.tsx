"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  const t = useTranslations("Preparation");
  return (
    <section className="container prep-page prep-study">
      <h1>{t("sswTitle")}</h1>
      <p role="alert">{t("loadError")}</p>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </section>
  );
}
