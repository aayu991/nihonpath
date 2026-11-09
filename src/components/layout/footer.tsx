import { PrivacyChoices } from "@/components/launch/privacy";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Brand } from "./brand";
export async function Footer() {
  const t = await getTranslations("Common");
  const p = await getTranslations("Platform");
  const h = await getTranslations("HomePractice");
  const tutor = await getTranslations("Tutor");
  const groups = [
    [
      { href: "/learn", label: p("categories.learn.label") },
      { href: "/courses", label: t("courses") },
      { href: "/jlpt", label: p("categories.jlpt.label") },
      { href: "/exams", label: (await getTranslations("Exams"))("title") },
      {
        href: "/flashcards",
        label: (await getTranslations("Home"))("flashcardsLink"),
      },
    ],
    [
      {
        href: "/japan-guide",
        label: p("categories.life-in-japan.label"),
      },
      {
        href: "/jft-basic",
        label: p("categories.jft-basic.label"),
      },
      { href: "/ssw", label: p("categories.ssw.label") },
      { href: "/business", label: p("categories.business.label"), soon: true },
    ],
    [
      {
        href: "/organizations",
        label: p("categories.organizations.label"),
      },
      {
        href: "/pricing",
        label: (await getTranslations("Billing"))("checkout"),
      },
      {
        href: "/billing",
        label: (await getTranslations("Billing"))("billing"),
      },
      { href: "/tutors", label: tutor("title") },
      { href: "/become-a-tutor", label: tutor("become") },
      {
        href: "/ai-practice",
        label: p("categories.ai-practice.label"),
      },
    ],
    [
      { href: "/login", label: t("login") },
      { href: "/register", label: t("register") },
      { href: "/dashboard", label: t("dashboard") },
      { href: "/help", label: (await getTranslations("Launch"))("help") },
      {
        href: "/legal",
        label: (await getTranslations("Launch"))("policyLinks"),
      },
      { href: "/contact", label: (await getTranslations("Launch"))("contact") },
      {
        href: "/legal/privacy",
        label: (await getTranslations("Launch"))("privacy"),
      },
      {
        href: "/legal/terms",
        label: (await getTranslations("Launch"))("terms"),
      },
      { href: "/forgot-password", label: h("help") },
    ],
  ];
  const names = h.raw("footerGroups") as string[];
  return (
    <footer className="site-footer">
      <div className="container footer-brand">
        <Brand />
        <p className="footer-tagline">{t("brand")}</p>
        <p>{t("footerNote")}</p>
      </div>
      <div className="container footer-grid">
        {groups.map((group, i) => (
          <nav key={names[i]} aria-label={names[i]}>
            <h2>{names[i]}</h2>
            {group.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
                {"soon" in item && item.soon && (
                  <span className="footer-status">{p("comingSoon")}</span>
                )}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="container">
        <PrivacyChoices />
      </div>
      <div className="container footer-bottom">
        <p>{t("copyright")}</p>
        <span>EN / 日本語 / नेपाली / हिन्दी</span>
      </div>
    </footer>
  );
}
