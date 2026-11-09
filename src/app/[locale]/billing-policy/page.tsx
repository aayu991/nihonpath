import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
export default async function Policy() {
  const t = await getTranslations("Billing");
  return (
    <section className="container billing-page">
      <h1>{t("policy")}</h1>
      <p className="billing-notice">{t("test")}</p>
      <p className="billing-intro">{t("policyText")}</p>
      <Link href="/pricing">{t("checkout")} →</Link>
    </section>
  );
}
