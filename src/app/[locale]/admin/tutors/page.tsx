import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { getTranslations } from "next-intl/server";
import { adminWorkspaceSchema } from "@/lib/tutors/schema";
import { TutorAdmin } from "@/components/tutors/admin";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireUser((await params).locale);
  const a = await getAdminContext(),
    t = await getTranslations("Tutor");
  if (!a)
    return (
      <section className="container tutor-entry">
        <h1>{t("admin")}</h1>
        <p role="alert">{t("forbidden")}</p>
      </section>
    );
  const r = await a.client.rpc("tutor_admin_workspace"),
    parsed = adminWorkspaceSchema.safeParse(r.data);
  return <TutorAdmin data={!r.error && parsed.success ? parsed.data : null} />;
}
