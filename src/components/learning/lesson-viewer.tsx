"use client";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Japanese } from "@/components/learning/japanese";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LessonCompletion } from "@/components/platform/lesson-completion";
import type { StudyLesson, StudyExample } from "@/lib/learning/study-types";
import { isLevel } from "@/lib/courses";
import { RichText } from "@/components/cms/rich-text";
export function JapaneseSentence({ text }: { text: string }) {
  return (
    <p className="japanese-sentence">
      <Japanese text={text} />
    </p>
  );
}
export function FuriganaToggle({
  shown,
  onChange,
}: {
  shown: boolean;
  onChange: () => void;
}) {
  const t = useTranslations("Learning");
  return (
    <Button variant="outline" aria-pressed={shown} onClick={onChange}>
      {t(shown ? "hideFurigana" : "showFurigana")}
    </Button>
  );
}
export function TranslationToggle({
  shown,
  onChange,
}: {
  shown: boolean;
  onChange: () => void;
}) {
  const t = useTranslations("Learning");
  return (
    <Button variant="outline" aria-pressed={shown} onClick={onChange}>
      {t(shown ? "hideTranslation" : "showTranslation")}
    </Button>
  );
}
export function LessonHeader({ lesson }: { lesson: StudyLesson }) {
  const t = useTranslations("Learning");
  return (
    <header className="learning-heading">
      <p className="eyebrow">
        {isLevel(lesson.level)
          ? `JLPT ${lesson.level.toUpperCase()}`
          : "NIHONPATH"}{" "}
        · {t(`subjects.${lesson.subject}`)}
      </p>
      <h1>{lesson.title}</h1>
    </header>
  );
}
export function GrammarExplanation({
  english,
  japanese,
  translation,
}: {
  english?: string;
  japanese?: string;
  translation: boolean;
}) {
  return (
    <div className="grammar-explanation">
      {japanese && <JapaneseSentence text={japanese} />}
      <div hidden={!translation}>{english && <p lang="en">{english}</p>}</div>
    </div>
  );
}
export function VocabularyExample({
  example,
  translation,
}: {
  example: StudyExample;
  translation: boolean;
}) {
  return (
    <article className="lesson-example">
      <JapaneseSentence text={example.japanese} />
      <p hidden={!translation} lang="en">
        {example.english}
      </p>
    </article>
  );
}
export function LessonContent({
  lesson,
  translation,
}: {
  lesson: StudyLesson;
  translation: boolean;
}) {
  return (
    <div className="lesson-study-content">
      {lesson.body.richText && <RichText blocks={lesson.body.richText}/>}
      <GrammarExplanation
        english={lesson.body.explanationEn ?? lesson.body.text}
        japanese={lesson.body.explanationJa}
        translation={translation}
      />
      {lesson.body.examples?.map((example, i) => (
        <VocabularyExample
          key={i}
          example={example}
          translation={translation}
        />
      ))}
    </div>
  );
}
export function LessonNavigation({
  previous,
  next,
  level,
  bankId,
  courseHref,
}: {
  previous?: StudyLesson;
  next?: StudyLesson;
  level: string;
  bankId?: string;
  courseHref?: string;
}) {
  const t = useTranslations("Learning");
  return (
    <nav className="lesson-step-nav" aria-label={t("lessonNavigation")}>
      <div>
        {previous && (
          <Link href={`/lessons/${previous.id}`} className="text-link">
            ← {t("previousLesson")}: {previous.title}
          </Link>
        )}
        {next && (
          <Link href={`/lessons/${next.id}`} className="text-link">
            {t("nextLesson")}: {next.title} →
          </Link>
        )}
      </div>
      <div>
        {isLevel(level) && (
          <Link href={`/courses/${level}/flashcards`} className="text-link">
            {t("practiceFlashcards")} →
          </Link>
        )}
        {bankId && isLevel(level) && (
          <Link
            href={`/courses/${level}/practice/${bankId}`}
            className="text-link"
          >
            {t("takeQuiz")} →
          </Link>
        )}
        <Link
          href={
            courseHref ?? (isLevel(level) ? `/courses/${level}` : "/courses")
          }
          className="text-link"
        >
          {t("backCourse")}
        </Link>
        <Link href="/dashboard" className="text-link">
          {t("dashboard")}
        </Link>
      </div>
    </nav>
  );
}
export function StudyLessonViewer({
  lesson,
  previous,
  next,
  member,
  bankId,
  preview = false,
  courseHref,
  children,
}: {
  lesson: StudyLesson;
  previous?: StudyLesson;
  next?: StudyLesson;
  member: boolean;
  bankId?: string;
  preview?: boolean;
  courseHref?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("Learning");
  const [furigana, setFurigana] = useState(true);
  const [translation, setTranslation] = useState(true);
  const [guestCompleted, setGuestCompleted] = useState(false);
  return (
    <div
      className="lesson-viewer"
      data-furigana={furigana}
      data-translation={translation}
    >
      <LessonHeader lesson={lesson} />
      {lesson.demo && <p className="learning-notice">{t("demoNotice")}</p>}
      <div className="lesson-toggles">
        <FuriganaToggle
          shown={furigana}
          onChange={() => setFurigana(!furigana)}
        />
        <TranslationToggle
          shown={translation}
          onChange={() => setTranslation(!translation)}
        />
      </div>
      <LessonContent lesson={lesson} translation={translation} />
      {children}
      {preview ? (
        <p className="learning-notice">{t("preview")}</p>
      ) : member && !lesson.demo ? (
        <LessonCompletion lessonId={lesson.id} completed={!!lesson.completed} />
      ) : (
        <div className="guest-completion">
          <Button
            disabled={guestCompleted}
            onClick={() => setGuestCompleted(true)}
          >
            {t(guestCompleted ? "completedHere" : "completeLesson")}
          </Button>
          <p role="status">{t("guestCompletion")}</p>
          {!member && (
            <Link href="/login" className="text-link">
              {t("signInSave")}
            </Link>
          )}
        </div>
      )}
      <LessonNavigation
        previous={previous}
        next={next}
        level={lesson.level}
        bankId={bankId}
        courseHref={courseHref}
      />
    </div>
  );
}
