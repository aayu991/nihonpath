import { organizationMessageKey } from "@/lib/organizations/messages";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { organizationContext } from "@/lib/organizations/server";
import { OrganizationConsole } from "@/components/organizations/console";
import { createClient } from "@/lib/supabase/server";
import { isOrgAdmin, canTeach } from "@/lib/organizations/schema";
const views = [
  "dashboard",
  "learners",
  "classes",
  "attendance",
  "assignments",
  "teacher",
  "employer",
  "reports",
  "settings",
];
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!views.includes(view)) notFound();
  const translate = await getTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key)),
    context = await organizationContext();
  if (!context.workspace)
    return (
      <section className="org-panel">
        <h1>{t(view)}</h1>
        <p role="status">{t(context.unavailable ? "unavailable" : "noOrg")}</p>
        <Link href="/organizations/register" className="text-link">
          {t("register")} →
        </Link>
        <br />
        <Link href="/organizations/onboarding" className="text-link">
          {t("onboarding")} →
        </Link>
      </section>
    );
  if (
    (view === "teacher" && !canTeach(context.workspace.role)) ||
    (view === "employer" &&
      !isOrgAdmin(context.workspace.role) &&
      context.workspace.role !== "manager")
  )
    return (
      <section className="org-panel">
        <h1>{t(view)}</h1>
        <p role="alert">{t("forbidden")}</p>
      </section>
    );
  const client = await createClient();
  const [courses, sectors, programs] = client
    ? await Promise.all([
        client
          .from("courses")
          .select("id,title,slug,program_id")
          .eq("published", true)
          .order("title"),
        client
          .from("industry_sectors")
          .select("id,title")
          .eq("published", true)
          .order("title"),
        client
          .from("learning_programs")
          .select("id,slug")
          .eq("published", true),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  return (
    <OrganizationConsole
      workspace={context.workspace}
      view={view}
      courses={(courses.data ?? [])
        .filter(
          (c) =>
            !c.program_id ||
            (programs.data ?? []).some((p) => p.id === c.program_id),
        )
        .map((c) => ({
          id: c.id,
          title: c.title,
          href: /^n[1-5]$/.test(c.slug)
            ? `/courses/${c.slug}`
            : c.program_id
              ? `/programs/${programs.data!.find((p) => p.id === c.program_id)!.slug}/${c.slug}`
              : "/courses",
        }))}
      sectors={sectors.data ?? []}
    />
  );
}
