import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { sectorContent } from "@/lib/preparation/server";
import { getCurrentUser } from "@/lib/auth/session";
import { FlashcardDeck } from "@/components/flashcards/flashcard-deck";
import {
  PreparationNotice,
  PrepBreadcrumb,
} from "@/components/preparation/shared";
import { Link } from "@/i18n/navigation";
export default async function Deck({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    data = await sectorContent(slug);
  if (!data) notFound();
  const t = await getTranslations("Preparation"),
    user = await getCurrentUser();
  return (
    <section className="container prep-page prep-study">
      <PrepBreadcrumb ssw />
      <h1>
        {data.sector.title} · {t("vocabularyTitle")}
      </h1>
      <p>{t("vocabularyDesc")}</p>
      <PreparationNotice demo={data.demo} />
      {data.error ? (
        <p role="alert">{t("loadError")}</p>
      ) : (
        <FlashcardDeck cards={data.cards} member={!!user && !data.demo} />
      )}
      <Link href={`/ssw/${slug}`} className="text-link">
        {t("backToTrack")} →
      </Link>
    </section>
  );
}
