import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await requireUser((await params).locale);
  const t = await getTranslations("Tutor");
  return (
    <>
      <nav className="container tutor-top-nav" aria-label={t("dashboard")}>
        <Link href="/tutor/dashboard">{t("dashboard")}</Link>
        <Link href="/tutor/application">{t("apply")}</Link>
        <Link href="/tutor/availability">{t("availability")}</Link>
        <Link href="/dashboard/lessons">{t("myLessons")}</Link>
      </nav>
      {children}
    </>
  );
}
