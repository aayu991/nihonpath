import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OrganizationEntry } from "@/components/organizations/entry";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  await params;
  const user = await getCurrentUser(),
    t = await getTranslations("Organization");
  return (
    <>
      {!user && (
        <div className="container org-notice">
          <p>{t("session")}</p>
          <Link
            href="/login"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            {t("signInReturn")}
          </Link>
        </div>
      )}
      <OrganizationEntry
        mode="onboarding"
        token={(await searchParams).token ?? ""}
      />
    </>
  );
}
