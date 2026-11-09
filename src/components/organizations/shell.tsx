import { OrganizationNavigation } from "./navigation";
import { canTeach, isOrgAdmin } from "@/lib/organizations/schema";
import { organizationMessageKey } from "@/lib/organizations/messages";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { organizationContext } from "@/lib/organizations/server";
import { OrganizationSwitcher } from "./switcher";
import Image from "next/image";
export async function OrganizationShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const translate = await getTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key)),
    context = await organizationContext();
  return (
    <div className="container org-shell">
      <aside className="org-sidebar">
        {context.workspace?.organization.logo_url && (
          <Image
            src={context.workspace.organization.logo_url}
            alt={context.workspace.organization.name}
            width={64}
            height={64}
            unoptimized
          />
        )}
        <Link href="/organization/dashboard" className="org-workspace-title">
          NihonPath <span>{t("title")}</span>
        </Link>
        {!!context.choices.length && (
          <OrganizationSwitcher
            choices={context.choices}
            current={context.workspace?.organization.id}
          />
        )}
        <OrganizationNavigation
          items={[
            "dashboard",
            "learners",
            "classes",
            "attendance",
            "assignments",
            ...(context.workspace && canTeach(context.workspace.role)
              ? ["teacher"]
              : []),
            ...(context.workspace &&
            (isOrgAdmin(context.workspace.role) ||
              context.workspace.role === "manager")
              ? ["employer"]
              : []),
            "reports",
            "settings",
          ]}
        />
        <Link href="/organizations/register" className="text-link">
          {t("register")} →
        </Link>
        <p className="org-fine">{t("languageNote")}</p>
      </aside>
      <div className="org-main">{children}</div>
    </div>
  );
}
