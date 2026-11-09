import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCmsContext } from "@/lib/cms/server";
import { CmsShell } from "@/components/cms/shell";
import { z } from "zod";
import "../../cms.css";
export const metadata = {
  title: "Content administration",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const ctx = await getCmsContext();
  if (!ctx) notFound();
  const r = await ctx.client.rpc("cms_dashboard");
  const parsed = z
    .object({ stats: z.object({ review: z.number() }) })
    .safeParse(r.data);
  return (
    <CmsShell
      email={ctx.user.email ?? "Verified administrator"}
      role={ctx.role ?? ""}
      locale={locale}
      reviewCount={parsed.success ? parsed.data.stats.review : null}
      superAdmin={ctx.permissions.users}
    >
      {!ctx.ready && (
        <p role="status" className="cms-panel">
          The new CMS migrations are not available. Existing administrator
          studios remain accessible; new CMS actions are unavailable until the
          reviewed migrations are applied.
        </p>
      )}
      {children}
    </CmsShell>
  );
}
