import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CalendarDays,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
export default async function Page() {
  const t = await getTranslations("Tutor");
  return (
    <section className="container tutor-entry">
      <p className="eyebrow">NIHONPATH / TEACH</p>
      <h1>{t("become")}</h1>
      <p className="tutor-lead">{t("applicationIntro")}</p>
      <div className="tutor-card-grid">
        {(
          [
            { key: "apply", Icon: BookOpen },
            { key: "approved", Icon: ShieldCheck },
            { key: "availability", Icon: CalendarDays },
            { key: "reviews", Icon: MessagesSquare },
          ] as const
        ).map(({ key, Icon }, i) => (
          <article className="tutor-panel" key={key}>
            <Icon size={30} aria-hidden="true" />
            <p className="eyebrow">0{i + 1}</p>
            <h2>{t(key)}</h2>
          </article>
        ))}
      </div>
      <p className="tutor-notice">{t("paidUnavailable")}</p>
      <div className="tutor-controls">
        <Button asChild>
          <Link href="/tutor/application">{t("apply")}</Link>
        </Button>
        <Link className="text-link" href="/tutors">
          {t("title")} →
        </Link>
      </div>
    </section>
  );
}
