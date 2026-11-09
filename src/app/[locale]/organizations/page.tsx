import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("organizations");
import {
  GraduationCap,
  ShieldCheck,
  BriefcaseBusiness,
  BookOpen,
} from "lucide-react";
import { organizationMessageKey } from "@/lib/organizations/messages";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
export default async function Page() {
  const translate = await getTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key));
  return (
    <section className="container org-entry">
      <p className="eyebrow">NIHONPATH / TEAMS</p>
      <h1>{t("intro")}</h1>
      <p className="org-public-intro">{t("organizationIntro")}</p>
      <div className="org-class-grid">
        {["institute", "ssw_center", "employer", "training_provider"].map(
          (k, index) => {
            const Icon = [
              GraduationCap,
              ShieldCheck,
              BriefcaseBusiness,
              BookOpen,
            ][index];
            return (
              <article className="org-panel" key={k}>
                <Icon
                  aria-hidden="true"
                  className="org-public-icon"
                  size={30}
                />
                <h2>{t(k === "employer" ? "employerType" : k)}</h2>
                <p>{t(`${k}Description`)}</p>
              </article>
            );
          },
        )}
      </div>
      <div className="prep-controls">
        <Button asChild>
          <Link href="/organizations/register">{t("register")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/organization/dashboard">{t("dashboard")}</Link>
        </Button>
        <Link href="/organizations/onboarding" className="text-link">
          {t("onboarding")} →
        </Link>
      </div>
      <p className="org-fine">{t("trainingNotice")}</p>
    </section>
  );
}
