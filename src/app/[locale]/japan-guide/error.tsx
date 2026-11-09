"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  const t = useTranslations("Guide");
  return (
    <section className="container section-space">
      <h1>{t("error")}</h1>
      <Button onClick={reset}>{t("retry")}</Button>
    </section>
  );
}
