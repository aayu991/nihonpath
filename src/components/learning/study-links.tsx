import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Layers, NotebookPen, ArrowUpRight } from "lucide-react";
export async function StudyLinks({ level }: { level?: string }) {
  const t = await getTranslations("Study");
  return (
    <div className="study-links">
      {(!level || level === "n5") && (
        <Link href="/courses/n5/flashcards">
          <Layers />
          <span>
            <strong>{t("n5Deck")}</strong>
            <small>{t("tenCards")}</small>
          </span>
          <ArrowUpRight />
        </Link>
      )}
      {(!level || level === "n4") && (
        <>
          <Link href="/courses/n4/flashcards">
            <Layers />
            <span>
              <strong>{t("n4Deck")}</strong>
              <small>{t("tenCards")}</small>
            </span>
            <ArrowUpRight />
          </Link>
          <Link href="/courses/n4/grammar-practice">
            <NotebookPen />
            <span>
              <strong>{t("grammar")}</strong>
              <small>20 {t("grammar")}</small>
            </span>
            <ArrowUpRight />
          </Link>
        </>
      )}
    </div>
  );
}
