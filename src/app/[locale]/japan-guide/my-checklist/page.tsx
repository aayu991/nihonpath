import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadGuides, guideUser } from "@/lib/guides/server";
import { GuideNotice } from "@/components/guides/article";
import { PreparationChecklist } from "@/components/guides/checklist";
export default async function MyChecklist() {
  const [t, data, user] = await Promise.all([
    getTranslations("Guide"),
    loadGuides(),
    guideUser(),
  ]);
  return (
    <>
      <header className="container guide-page-heading">
        <nav aria-label="Breadcrumb">
          <Link href="/japan-guide">{t("back")}</Link> / {t("checklist")}
        </nav>
        <h1>{t("checklist")}</h1>
        <p>{t("notCompliance")}</p>
      </header>
      <GuideNotice demo={data.demo} />
      {user.error && !data.demo && (
        <p role="alert" className="container">
          {t("saveError")}
        </p>
      )}
      <PreparationChecklist
        catalog={data.catalog}
        demo={data.demo}
        member={user.member}
        preferences={user.preferences}
        progress={user.progress}
      />
    </>
  );
}
