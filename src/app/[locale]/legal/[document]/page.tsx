import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
const documents = {
  terms: ["terms", "legalTerms"],
  privacy: ["privacy", "legalPrivacy"],
  "refund-policy": ["refund", "legalRefund"],
  "cancellation-policy": ["cancellation", "legalCancellation"],
  "subscription-terms": ["subscription", "legalSubscription"],
  "payment-providers": ["providers", "legalProviders"],
  "commercial-disclosure": ["commercial", "legalCommercial"],
} as const;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string; locale: string }>;
}) {
  const { document, locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!(document in documents)) notFound();
  const t = await getTranslations({ locale, namespace: "Launch" });
  return {
    title: t(documents[document as keyof typeof documents][0]),
    robots: { index: false, follow: false },
  };
}
export async function generateStaticParams() {
  return Object.keys(documents).map((document) => ({ document }));
}
export default async function Legal({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  if (!(document in documents)) notFound();
  const pair = documents[document as keyof typeof documents],
    t = await getTranslations("Launch");
  return (
    <section className="container launch-page legal-draft">
      <h1>{t(pair[0])}</h1>
      <p className="billing-notice" role="note">
        {t("draft")}
      </p>
      <p>{t("legalIntro")}</p>
      <p>{t(pair[1])}</p>
      <p>{t("legalCommercial")}</p>
    </section>
  );
}
