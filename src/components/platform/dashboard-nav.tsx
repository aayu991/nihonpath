"use client";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Target, UserRound, Layers } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
export function DashboardNav() {
  const t = useTranslations("Platform");
  const pathname = usePathname();
  const links = [
    { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
    { href: "/dashboard/goals", key: "editGoals", icon: Target },
    { href: "/dashboard/profile", key: "profile", icon: UserRound },
    { href: "/courses", key: "practice", icon: Layers },
  ] as const;
  return (
    <nav className="dashboard-nav container" aria-label={t("dashboard")}>
      {links.map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          <Icon size={17} />
          <span>{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}
