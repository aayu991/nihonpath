import { getTranslations } from "next-intl/server";
import { interviews, prepCatalog } from "@/lib/preparation/server";
import { getCurrentUser } from "@/lib/auth/session";
import { InterviewPractice } from "@/components/preparation/interview-practice";
import {
  PreparationNotice,
  PrepBreadcrumb,
} from "@/components/preparation/shared";
export default async function Interviews() {
  const t = await getTranslations("Preparation"),
    user = await getCurrentUser();
  const [data, catalog] = await Promise.all([interviews(), prepCatalog()]);
  return (
    <section className="container prep-page prep-study">
      <PrepBreadcrumb ssw />
      <p className="eyebrow">NIHONPATH / INTERVIEW</p>
      <h1>{t("interviewTitle")}</h1>
      <p>{t("interviewIntro")}</p>
      <PreparationNotice demo={data.demo} />
      {data.error && <p role="alert">{t("progressUnavailable")}</p>}
      <InterviewPractice
        questions={data.questions}
        sectors={catalog.sectors}
        member={!!user && !data.demo}
        completed={data.completed}
      />
    </section>
  );
}
