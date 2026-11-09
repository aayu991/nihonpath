import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
export const metadata = { robots: { index: false, follow: false } };
export default async function LegalIndex() {
  const t = await getTranslations("Launch");
  return (
    <section className="container launch-page">
      <h1>{t("policyLinks")}</h1>
      <p className="billing-notice">{t("draft")}</p>
      <nav className="launch-grid">
        {(
          [
            ["terms", "terms"],
            ["privacy", "privacy"],
            ["refund-policy", "refund"],
            ["cancellation-policy", "cancellation"],
            ["subscription-terms", "subscription"],
            ["payment-providers", "providers"],
            ["commercial-disclosure", "commercial"],
          ] as const
        ).map(([slug, key]) => (
          <Link className="launch-card" key={slug} href={`/legal/${slug}`}>
            {t(key)} →
          </Link>
        ))}
      </nav>
    </section>
  );
}
