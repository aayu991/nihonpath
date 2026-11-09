import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Layers,
  Route,
  Check,
  BriefcaseBusiness,
  TrainFront,
  GraduationCap,
  Users,
  Languages,
  NotebookPen,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/shared/section-heading";
import { CourseGrid } from "@/components/courses/course-grid";
import { JapanIllustration } from "./japan-illustration";
import { FlashcardDeck } from "@/components/flashcards/flashcard-deck";
import { flashcards } from "@/lib/learning/content";
import { getCurrentUser } from "@/lib/auth/session";
import { MiniTest } from "./mini-test";
import { GoalPathways } from "./goal-pathways";
import { ConversationPreview } from "./conversation-preview";
import { VocabularyPeek } from "./vocabulary-peek";
export async function Homepage() {
  const t = await getTranslations("Home");
  const p = await getTranslations("HomePractice");
  const user = await getCurrentUser();

  const tools = [
    { key: "vocabulary", icon: Languages, mark: "あ", className: "vocab" },
    { key: "grammar", icon: NotebookPen, mark: "文", className: "grammar" },
    { key: "flashcards", icon: Layers, mark: "学", className: "flash" },
    { key: "mockTests", icon: ClipboardCheck, mark: "試", className: "test" },
  ] as const;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="little-line" />
              {t("eyebrow")}
            </p>
            <h1>
              {t("title")}
              <br />
              <span>{t("accent")}</span>
            </h1>
            <p className="hero-intro">{t("intro")}</p>
            <div className="hero-buttons">
              <Button asChild size="lg">
                <Link href="/courses">
                  {t("primary")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Link className="text-link" href="/life-in-japan">
                {t("secondary")}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <p className="hero-note">
              <Check size={15} aria-hidden="true" />
              {t("note")}
            </p>
          </div>
          <figure className="hero-art">
            <JapanIllustration />
            <figcaption className="hero-art-caption">
              <span>{t("heroLabel")}</span>
              <p>{t("heroCaption")}</p>
            </figcaption>
            <div className="floating-note">
              <span className="note-icon" lang="ja">
                道
              </span>
              <div>
                <strong lang="ja">{t("heroBadge")}</strong>
                <p>{t("heroBadgeSub")}</p>
              </div>
            </div>
          </figure>
        </div>
      </section>
      <VocabularyPeek />
      <div className="container benefits">
        {[
          { icon: Route, title: "strip1", desc: "strip1Sub" },
          { icon: Layers, title: "strip2", desc: "strip2Sub" },
          { icon: BookOpen, title: "strip3", desc: "strip3Sub" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title}>
            <span className="benefit-icon">
              <Icon size={21} aria-hidden="true" />
            </span>
            <div>
              <strong>{t(title as "strip1")}</strong>
              <p>{t(desc as "strip1Sub")}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="section container" id="courses">
        <div className="section-top">
          <SectionHeading
            eyebrow={t("courseEyebrow")}
            title={t("courseTitle")}
            description={t("courseIntro")}
          />
          <Link className="text-link" href="/courses">
            {t("allCourses")}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <CourseGrid />
        <p className="course-footnote">
          <span>
            <Sparkles size={15} aria-hidden="true" />
            {t("beginner")}
          </span>
          <span>{t("availability")}</span>
        </p>
      </section>
      <GoalPathways />
      <section
        className="container section home-practice"
        aria-label={t("toolsTitle")}
      >
        <section
          className="practice-panel"
          aria-labelledby="flash-preview-title"
        >
          <p className="eyebrow">{t("flashcardsLink")}</p>
          <h2 id="flash-preview-title">{p("flashTitle")}</h2>
          <p>{p("flashIntro")}</p>
          <FlashcardDeck
            cards={flashcards.filter((card) => card.level === "n5").slice(0, 5)}
            member={Boolean(user)}
          />
          <p className="practice-note">{p("previewNote")}</p>
        </section>
        <MiniTest />
      </section>
      <ConversationPreview />
      <section className="tools-section" id="learning">
        <div className="container section">
          <SectionHeading
            eyebrow={t("toolsEyebrow")}
            title={t("toolsTitle")}
            description={t("toolsIntro")}
          />
          <div className="tools-layout">
            <div className="tools-grid">
              {tools.map(({ key, icon: Icon, className }) => (
                <Card className={"tool-card " + className} key={key}>
                  <span className="tool-icon">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <h3>{t(key)}</h3>
                  <p>{t(`${key}Desc`)}</p>
                  <Link
                    className="text-link"
                    href={key === "mockTests" ? "/mock-tests" : `/${key}`}
                  >
                    {t(`${key}Link`)}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </Card>
              ))}
            </div>
            <aside className="word-card">
              <p className="eyebrow">{t("sample")}</p>
              <span className="word-decoration" aria-hidden="true">
                木
              </span>
              <div className="word-content">
                <p className="word" lang="ja">
                  {t("word")}
                </p>
                <p className="reading" lang="ja">
                  {t("reading")}
                </p>
                <div className="word-rule" />
                <p className="meaning">{t("meaning")}</p>
              </div>
              <p className="word-note">{t("sampleNote")}</p>
            </aside>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="business-panel">
          <div className="business-art" aria-hidden="true">
            <div className="business-stamp">
              <BriefcaseBusiness size={32} />
              <span>ビジネス日本語</span>
            </div>
            <div className="business-paper">
              <span>はじめまして。</span>
              <div />
              <div />
              <small>よろしくお願いいたします。</small>
              <div className="paper-seal">礼</div>
            </div>
            <span className="business-coordinates">
              WORDS THAT OPEN OPPORTUNITIES
            </span>
          </div>
          <div className="business-copy">
            <SectionHeading
              eyebrow={t("businessEyebrow")}
              title={t("businessTitle")}
              description={t("businessDesc")}
            />
            <ul className="business-list">
              {(["business1", "business2", "business3"] as const).map((k) => (
                <li key={k}>
                  <Check size={16} aria-hidden="true" />
                  {t(k)}
                </li>
              ))}
            </ul>
            <Button variant="outline" asChild>
              <Link href="/business">
                {t("businessLink")}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="container life-section" id="life">
        <div className="section-top">
          <SectionHeading
            eyebrow={t("lifeEyebrow")}
            title={t("lifeTitle")}
            description={t("lifeDesc")}
          />
          <Link className="text-link" href="/life-in-japan">
            {t("lifeLink")}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="life-grid">
          {[
            { key: "life1", icon: TrainFront, number: "01" },
            { key: "life2", icon: GraduationCap, number: "02" },
            { key: "life3", icon: Users, number: "03" },
          ].map(({ key, icon: Icon, number }) => (
            <Link href="/life-in-japan" key={key} className="life-card">
              <div>
                <Icon size={27} strokeWidth={1.5} aria-hidden="true" />
                <span>{number}</span>
              </div>
              <h3>{t(key as "life1")}</h3>
              <p>{t((key + "Desc") as "life1Desc")}</p>
              <ArrowUpRight
                className="life-arrow"
                size={21}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
      <section className="container cta-wrap">
        <div className="cta">
          <div>
            <p className="eyebrow">{t("ctaEyebrow")}</p>
            <h2>{t("ctaTitle")}</h2>
            <p>{t("ctaDesc")}</p>
          </div>
          <Button asChild className="bg-white text-navy hover:bg-blue-50">
            <Link href="/courses">
              {t("ctaButton")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <span className="cta-kanji" aria-hidden="true">
            道
          </span>
        </div>
      </section>
    </>
  );
}
