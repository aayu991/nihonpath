"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  subjects,
  type Subject,
  type StudyLesson,
  type StudyBank,
} from "@/lib/learning/study-types";
export function CourseDashboard({
  level,
  lessons,
  banks,
  demo,
  trackProgress = false,
}: {
  level: string;
  lessons: StudyLesson[];
  banks: StudyBank[];
  demo: boolean;
  trackProgress?: boolean;
}) {
  const t = useTranslations("Learning");
  const [subject, setSubject] = useState<Subject>("grammar");
  const selected = lessons.filter((l) => l.subject === subject);
  const completed = selected.filter((l) => l.completed).length;
  return (
    <>
      <div
        className="subject-filters"
        role="group"
        aria-label={t("selectSubject")}
      >
        {subjects.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={subject === s}
            onClick={() => setSubject(s)}
          >
            {t(`subjects.${s}`)}
          </button>
        ))}
      </div>
      <section className="subject-content" aria-live="polite">
        <h2>{t(`subjects.${subject}`)}</h2>
        <p>
          {t(demo ? "demoCount" : "lessonCount", { count: selected.length })}
        </p>
        {selected.length > 0 && trackProgress && (
          <>
            <p>{t("progress", { completed, total: selected.length })}</p>
            <progress
              value={completed}
              max={selected.length}
              aria-label={t("progress", { completed, total: selected.length })}
            />
          </>
        )}
        {!selected.length ? (
          <p className="empty-note">
            {t(subject === "listening" ? "noAudio" : "noLessons")}
          </p>
        ) : (
          <ol className="lesson-list">
            {selected.map((lesson, i) => (
              <li key={lesson.id}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
                  <p>
                    {t(
                      lesson.completed
                        ? "completed"
                        : demo
                          ? "guestLesson"
                          : "ready",
                    )}
                  </p>
                </div>
                <Link className="text-link" href={`/lessons/${lesson.id}`}>
                  {t("openLesson")} →
                </Link>
              </li>
            ))}
          </ol>
        )}
        <div className="study-resource-links">
          {subject !== "listening" && (
            <Link className="text-link" href={`/courses/${level}/flashcards`}>
              {t("flashcards")} →
            </Link>
          )}
          {banks
            .filter((b) => b.subject === subject)
            .map((bank) => (
              <Link
                key={bank.id}
                href={`/courses/${level}/practice/${bank.id}`}
                className="text-link"
              >
                {bank.title} →
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}
