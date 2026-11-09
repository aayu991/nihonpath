import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("pricing");
import { getTranslations } from "next-intl/server";
import { billingCatalog } from "@/lib/billing/server";
import { available } from "@/lib/billing/config";
import { getCurrentUser } from "@/lib/auth/session";
import { BillingCheckout } from "@/components/billing/checkout";
import { Link } from "@/i18n/navigation";
export default async function Pricing() {
  const t = await getTranslations("Billing"),
    catalog = await billingCatalog(),
    user = await getCurrentUser();
  const prices = catalog.prices.filter((p) =>
    available(p, p.country === "*" ? "US" : p.country),
  );
  return (
    <div className="container billing-page">
      <p className="eyebrow">NIHONPATH / WORLDWIDE</p>
      <h1>{t("title")}</h1>
      <p className="billing-intro">{t("intro")}</p>
      <p className="billing-notice">{t("test")}</p>
      {(catalog.unavailable || !prices.length) && (
        <p className="billing-notice" role="status">
          {t("unavailable")}
        </p>
      )}
      <BillingCheckout prices={prices} signedIn={!!user} />
      <p>{t("organization")}</p>
      <nav className="billing-actions">
        <Link href="/billing">{t("billing")} →</Link>
        <Link href="/billing-policy">{t("policy")} →</Link>
      </nav>
    </div>
  );
}
