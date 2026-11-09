import { metadataFor } from "@/lib/seo/metadata";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const data = await loadGuides(),
    m = metadataFor("japan-guide", (await params).locale);
  return {
    ...m,
    ...(data.demo ? { robots: { index: false, follow: true } } : {}),
  };
}
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GuideExplorer } from "@/components/guides/explorer";
import { GuideNotice } from "@/components/guides/article";
import { loadGuides, guideUser } from "@/lib/guides/server";
export default async function JapanGuide() {
  const [t, data, user] = await Promise.all([
    getTranslations("Guide"),
    loadGuides(),
    guideUser(),
  ]);
  return (
    <>
      <section className="guide-hero">
        <div className="container">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
          <div className="prep-controls">
            <Button asChild>
              <a href="#guides">{t("browse")} ↗</a>
            </Button>
            <Link className="text-link" href="/japan-guide/my-checklist">
              {t("checklist")} →
            </Link>
            <Link className="text-link" href="/japan-guide/culture">
              {t("culture")} →
            </Link>
            <Link className="text-link" href="/japan-guide/role-play">
              {t("roleplays")} →
            </Link>
          </div>
          <div className="guide-hero-note" lang="ja">
            暮らしを知る。
            <br />
            言葉でつながる。
          </div>
        </div>
      </section>
      <GuideNotice demo={data.demo} />
      <GuideExplorer
        catalog={data.catalog}
        demo={data.demo}
        preferences={user.preferences}
        member={user.member}
      />
    </>
  );
}
