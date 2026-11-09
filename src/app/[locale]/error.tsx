"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("Preview");
  return (
    <section className="container preview-page">
      <h1>{t("error")}</h1>
      <Button onClick={reset}>{t("retry")}</Button>
    </section>
  );
}
