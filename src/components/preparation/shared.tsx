import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { OfficialResource } from "@/lib/preparation/schema";
export async function PreparationNotice({ demo }: { demo: boolean }) {
  const t = await getTranslations("Preparation");
  return demo ? (
    <p role="status" className="prep-notice">
      <BookOpen aria-hidden="true" />
      {t("demo")}
    </p>
  ) : null;
}
export async function PreparationSources({
  resources,
}: {
  resources: OfficialResource[];
}) {
  const t = await getTranslations("Preparation"),
    locale = await getLocale();
  return (
    <section className="prep-sources">
      <h2>{t("officialSources")}</h2>
      <div className="prep-resource-grid">
        {resources.map((r) => (
          <article className="prep-card" key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              {r.title}
              <ExternalLink size={18} aria-hidden="true" />
            </a>
            <p>{locale === "ja" ? r.summaryJa : r.summary}</p>
            <small>
              {t("reviewed")}{" "}
              <time dateTime={r.reviewedAt}>{r.reviewedAt}</time>
            </small>
          </article>
        ))}
      </div>
      <p className="prep-disclaimer">{t("disclaimer")}</p>
    </section>
  );
}
export async function PrepBreadcrumb({ ssw = false }: { ssw?: boolean }) {
  const t = await getTranslations("Preparation");
  return (
    <Link href={ssw ? "/ssw" : "/jft-basic"} className="text-link">
      ← {t(ssw ? "sswTitle" : "jftTitle")}
    </Link>
  );
}
