import { DashboardNav } from "@/components/platform/dashboard-nav";
import { requireUser } from "@/lib/auth/session";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  return (
    <>
      <DashboardNav />
      {children}
    </>
  );
}
