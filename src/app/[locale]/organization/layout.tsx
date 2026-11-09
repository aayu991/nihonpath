import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { OrganizationShell } from "@/components/organizations/shell";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await requireUser((await params).locale);
  return <OrganizationShell>{children}</OrganizationShell>;
}
