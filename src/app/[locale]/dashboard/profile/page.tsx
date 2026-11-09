import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/auth/account-form";
export default async function Profile({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const client = await createClient();
  const t = await getTranslations("Study");
  const result = client
    ? await client.from("profiles").select("*").eq("id", user.id).single()
    : null;
  const { saved } = await searchParams;
  return (
    <section className="container profile-page">
      <p className="eyebrow">NIHONPATH</p>
      <h1>{t("profile")}</h1>
      <p>{t("profileIntro")}</p>
      {saved === "1" && (
        <p role="status" className="form-message success">
          {t("profileSaved")}
        </p>
      )}
      {!result || result.error ? (
        <p role="alert" className="form-message error">
          {t("dbError")}
        </p>
      ) : (
        <AccountForm mode="profile" profile={result.data} />
      )}
    </section>
  );
}
