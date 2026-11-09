"use client";
import { usePathname, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { organizationMessageKey } from "@/lib/organizations/messages";
export function OrganizationNavigation({ items }: { items: string[] }) {
  const path = usePathname(),
    t = useTranslations("Organization");
  return (
    <nav aria-label={t("title")}>
      {items.map((key) => (
        <Link
          key={key}
          href={`/organization/${key}`}
          aria-current={path === `/organization/${key}` ? "page" : undefined}
        >
          {t(organizationMessageKey(key))}
        </Link>
      ))}
    </nav>
  );
}
