import { getTranslations, getLocale } from "next-intl/server";
import { Menu, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/actions/auth";
import { categoryKeys } from "@/lib/platform/catalog";
import { NavigationDisclosure } from "@/components/platform/navigation-disclosure";
import { getCmsContext } from "@/lib/cms/server";
export async function Header() {
  const t = await getTranslations("Common");
  const s = await getTranslations("Study");
  const p = await getTranslations("Platform");
  const tutor = await getTranslations("Tutor");
  const locale = await getLocale();
  const user = await getCurrentUser();
  const cms = user ? await getCmsContext() : null;
  const categories = (
    <nav className="category-navigation" aria-label={p("explore")}>
      {cms && (
        <Link href="/admin">
          <strong>{t("admin")}</strong>
          <span>NihonPath Studio</span>
        </Link>
      )}
      {categoryKeys.map((key) => (
        <Link key={key} href={`/${key}`}>
          <strong>{p(`categories.${key}.label`)}</strong>
          <span>
            {p(
              [
                "learn",
                "jlpt",
                "jft-basic",
                "ssw",
                "ai-practice",
                "life-in-japan",
                "organizations",
              ].includes(key)
                ? "available"
                : "comingSoon",
            )}
          </span>
        </Link>
      ))}
      <Link href="/exams">
        <strong>
          {locale === "ja" ? "試験センター" : "Examination center"}
        </strong>
        <span>JLPT N5–N1</span>
      </Link>
      <Link href="/pricing">
        <strong>{(await getTranslations("Billing"))("title")}</strong>
        <span>{(await getTranslations("Billing"))("checkout")}</span>
      </Link>
      <Link href="/tutors">
        <strong>{tutor("title")}</strong>
        <span>{tutor("book")}</span>
      </Link>
    </nav>
  );
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label={t("menu")}>
          <Link href="/learn">{p("categories.learn.label")}</Link>
          <Link href="/jlpt">{p("categories.jlpt.label")}</Link>
          <Link href="/exams">{locale === "ja" ? "試験" : "Exams"}</Link>
          <NavigationDisclosure
            label={p("explore")}
            className="desktop-category-menu"
          >
            {categories}
          </NavigationDisclosure>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          {user ? (
            <>
              <Link className="login-link" href="/dashboard">
                {s("dashboard")}
              </Link>
              <form
                action={logout.bind(null, locale)}
                className="desktop-logout"
              >
                <Button variant="outline" size="sm">
                  {s("logout")}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link className="login-link" href="/login">
                {t("login")}
              </Link>
              <Button asChild size="sm" className="signup-link">
                <Link href="/register">
                  {t("register")}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
          <NavigationDisclosure
            label={t("menu")}
            className="mobile-category-menu"
            icon={<Menu size={23} />}
          >
            <div className="mobile-category-panel">
              {categories}
              <nav className="mobile-account-nav" aria-label={s("profile")}>
                {user ? (
                  <>
                    <Link href="/dashboard">{s("dashboard")}</Link>
                    {cms && <Link href="/admin">{t("admin")}</Link>}
                    <Link href="/dashboard/goals">{p("editGoals")}</Link>
                    <Link href="/dashboard/profile">{s("profile")}</Link>
                    <form action={logout.bind(null, locale)}>
                      <Button variant="ghost">{s("logout")}</Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login">{t("login")}</Link>
                    <Link href="/register">{t("register")}</Link>
                  </>
                )}
              </nav>
            </div>
          </NavigationDisclosure>
        </div>
      </div>
    </header>
  );
}
