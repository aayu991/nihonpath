import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SupportForm } from "@/components/launch/forms";
import { pageMetadata } from "@/lib/seo/metadata";
import { Link } from "@/i18n/navigation";
export const generateMetadata = pageMetadata("contact");
export default async function Contact() {
  const t = await getTranslations("Launch"),
    user = await getCurrentUser(),
    client = user ? await createClient() : null,
    rows = await client
      ?.from("support_requests")
      .select("id,subject,status,created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(30);
  return (
    <section className="container launch-page">
      <h1>{t("contact")}</h1>
      <p>{t("warning")}</p>
      {user ? (
        <>
          <SupportForm />
          <h2>{t("history")}</h2>
          {rows?.error && <p role="status">{t("unavailable")}</p>}
          {rows?.data?.map((r) => (
            <article className="launch-card" key={r.id}>
              <h3>{r.subject}</h3>
              <p>
                {t("status")}: {t(r.status as "open")}
              </p>
            </article>
          ))}
        </>
      ) : (
        <Link className="text-link" href="/login">
          {t("signIn")} →
        </Link>
      )}
      <Link href="/help">{t("help")} →</Link>
    </section>
  );
}
