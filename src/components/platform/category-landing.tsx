import { getTranslations } from "next-intl/server";
import {
  BookOpen,
  Route,
  BriefcaseBusiness,
  Globe2,
  Compass,
  Users,
  MessagesSquare,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { categoryKeys, type CategoryKey } from "@/lib/platform/catalog";
import { LearningCard } from "./learning-card";
import { LessonModule } from "./lesson-module";
import { FlashcardPreview } from "./flashcard-preview";
import { MockTestPreview } from "./mock-test-preview";
import { Japanese } from "@/components/learning/japanese";
import { getQuizPrompts } from "@/lib/learning/quiz-server";
import { createClient } from "@/lib/supabase/server";
const icons = {
  learn: BookOpen,
  jlpt: Route,
  "jft-basic": Compass,
  ssw: ShieldCheck,
  business: BriefcaseBusiness,
  "life-in-japan": Globe2,
  "ai-practice": MessagesSquare,
  organizations: Users,
};
export async function CategoryLanding({ category }: { category: CategoryKey }) {
  const t = await getTranslations("Platform");
  const s = await getTranslations("Study");
  const Icon = icons[category];
  const demo = category === "learn" || category === "jlpt";
  const client = await createClient();
  const programs = client
    ? await client
        .from("learning_programs")
        .select("id,slug,title,summary")
        .eq("category", category)
        .eq("published", true)
        .order("title")
    : null;
  return (
    <>
      <section className="category-hero">
        <div className="container category-hero-grid">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <span className="category-label">
              {t(`categories.${category}.label`)}
            </span>
            <h1>{t(`categories.${category}.title`)}</h1>
            <p className="category-description">
              {t(`categories.${category}.description`)}
            </p>
            <div className="category-hero-actions">
              <Button asChild>
                <Link href={demo ? "/courses" : "/onboarding"}>
                  {demo ? t("seeAll") : t("onboardingCta")}
                  <ArrowUpRight size={17} />
                </Link>
              </Button>
              <span className={`availability-badge ${demo ? "" : "planned"}`}>
                {t(demo ? "available" : "comingSoon")}
              </span>
            </div>
          </div>
          <div className={`category-art art-${category}`} aria-hidden="true">
            <Icon size={108} strokeWidth={1} />
            <span>
              {category === "learn"
                ? "学"
                : category === "jlpt"
                  ? "道"
                  : category === "life-in-japan"
                    ? "暮"
                    : "未来"}
            </span>
            <small>
              NIHONPATH /{" "}
              {String(categoryKeys.indexOf(category) + 1).padStart(2, "0")}
            </small>
          </div>
        </div>
      </section>
      <section className="container platform-section">
        <div className="platform-section-heading">
          <p className="eyebrow">01 / LEARNING PATH</p>
          <h2>{t("modulePreview")}</h2>
        </div>
        <div className="category-modules">
          {([1, 2, 3] as const).map((index) => (
            <LessonModule
              key={index}
              index={index}
              title={t(`categories.${category}.module${index}`)}
              status={t("comingSoon")}
            >
              <p>{t("moduleNote")}</p>
              {index === 1 && (
                <div className="example-sentence">
                  <Japanese text="{日本語|にほんご}を{教|おし}えてください。" />
                  <p>{t("exampleMeaning")}</p>
                </div>
              )}
              {demo && (
                <Link
                  href={
                    index === 2
                      ? "/courses/n5/flashcards"
                      : "/courses/n4/grammar-practice"
                  }
                  className="text-link"
                >
                  {index === 2 ? t("deck") : t("fullPractice")} →
                </Link>
              )}
            </LessonModule>
          ))}
        </div>
      </section>
      <section className="container platform-section published-programs">
        <div className="platform-section-heading">
          <h2>{t("catalogTitle")}</h2>
        </div>
        {programs?.data?.length ? (
          <div className="path-card-grid">
            {programs.data.map((program) => (
              <LearningCard
                title={program.title}
                description={program.summary}
                href={`/programs/${program.slug}`}
                status={t("available")}
                key={program.id}
              />
            ))}
          </div>
        ) : (
          <p className="empty-note">
            {programs?.error ? t("dbUnavailable") : t("catalogEmpty")}
          </p>
        )}
      </section>
      {demo && (
        <section className="container platform-section">
          <div className="platform-section-heading">
            <p className="eyebrow">02 / TRY A LITTLE JAPANESE</p>
            <h2>{s("intro")}</h2>
          </div>
          <div className="preview-grid">
            <FlashcardPreview />
            <MockTestPreview question={getQuizPrompts()[0]} />
          </div>
        </section>
      )}
      <section className="container platform-section">
        <div className="platform-section-heading">
          <p className="eyebrow">NIHONPATH / DISCOVER MORE</p>
          <h2>{t("explore")}</h2>
        </div>
        <div className="path-card-grid">
          {categoryKeys
            .filter((key) => key !== category)
            .map((key) => {
              const CardIcon = icons[key];
              return (
                <LearningCard
                  title={t(`categories.${key}.label`)}
                  description={t(`categories.${key}.description`)}
                  href={`/${key}`}
                  planned={!["learn", "jlpt"].includes(key)}
                  status={t(
                    ["learn", "jlpt"].includes(key)
                      ? "available"
                      : "comingSoon",
                  )}
                  icon={<CardIcon size={24} />}
                  key={key}
                />
              );
            })}
        </div>
      </section>
    </>
  );
}
