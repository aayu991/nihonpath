import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
import { BreadcrumbMetadata } from "@/components/launch/breadcrumbs";
export const generateMetadata = pageMetadata("help/faq");
export default async function FAQ() {
  const t = await getTranslations("Launch"),
    locale = await getLocale(),
    answers = t.raw("answers") as string[];
  return (
    <section className="container launch-page">
      <Link href="/help">← {t("help")}</Link>
      <h1>{t("faq")}</h1>
      {(t.raw("categories") as string[]).map((v, i) => (
        <details className="launch-faq" key={v} id={`topic-${i}`}>
          <summary>{v}</summary>
          <p>{answers[i]}</p>
        </details>
      ))}
      <Link href="/contact">{t("contact")} →</Link>
      <BreadcrumbMetadata
        path="help/faq"
        locale={locale as "en" | "ja" | "ne" | "hi"}
      />
    </section>
  );
}
