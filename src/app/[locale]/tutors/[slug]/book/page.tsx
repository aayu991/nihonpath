import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { tutorCatalog } from "@/lib/tutors/server";
import { TutorBooking } from "@/components/tutors/booking";
import { Link } from "@/i18n/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    { tutors } = await tutorCatalog(),
    p = tutors.find((t) => t.slug === slug);
  if (!p) notFound();
  const t = await getTranslations("Tutor"),
    user = await getCurrentUser();
  return (
    <section className="container tutor-entry">
      <Link className="text-link" href={`/tutors/${slug}`}>
        {t("profile")} →
      </Link>
      <h1>{t("book")}</h1>
      <TutorBooking tutor={p} member={!!user} self={user?.id === p.user_id} />
    </section>
  );
}
