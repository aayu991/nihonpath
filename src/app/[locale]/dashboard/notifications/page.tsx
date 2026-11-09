import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NotificationPreferences } from "@/components/launch/forms";
export const metadata = { robots: { index: false, follow: false } };
export default async function Preferences() {
  const locale = await getLocale(),
    user = await requireUser(locale),
    t = await getTranslations("Launch"),
    c = await createClient(),
    p = await c
      ?.from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
  return (
    <section className="container launch-page">
      <h1>{t("preferences")}</h1>
      {p?.error && <p>{t("unavailable")}</p>}
      <NotificationPreferences
        learning={p?.data?.learning_updates}
        renewal={p?.data?.renewal_reminders}
      />
    </section>
  );
}
