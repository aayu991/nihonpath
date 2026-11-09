import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("courses");
import { getTranslations } from "next-intl/server";
import { CourseGrid } from "@/components/courses/course-grid";
export default async function Courses() {
  const t = await getTranslations("Courses");
  return (
    <section className="container courses-page">
      <div className="page-hero">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </div>
      <CourseGrid />
    </section>
  );
}
