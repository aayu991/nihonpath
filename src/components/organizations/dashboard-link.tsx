import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { organizationContext } from "@/lib/organizations/server";
export async function OrganizationDashboardLink() {
  const t = await getTranslations("Organization"),
    data = await organizationContext();
  return (
    <section className="dashboard-panel">
      <h2>{t("title")}</h2>
      <p>
        {data.choices.length
          ? data.choices.map((o) => o.name).join(" · ")
          : t("noOrg")}
      </p>
      <Link className="text-link" href="/organization/dashboard">
        {t("dashboard")} →
      </Link>
    </section>
  );
}
