"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Japanese } from "@/components/learning/japanese";
import { LessonCompletion } from "@/components/platform/lesson-completion";
import type { Interview, Sector } from "@/lib/preparation/schema";
export function InterviewPractice({
  questions,
  sectors,
  member,
  completed,
}: {
  questions: Interview[];
  sectors: Sector[];
  member: boolean;
  completed: string[];
}) {
  const t = useTranslations("Preparation"),
    locale = useLocale();
  const [filter, setFilter] = useState(""),
    [index, setIndex] = useState(0),
    [reveal, setReveal] = useState(false),
    [translation, setTranslation] = useState(true),
    [furigana, setFurigana] = useState(true),
    [answer, setAnswer] = useState("");
  const selected = questions.filter((q) => !filter || q.sectorId === filter),
    q = selected[index];
  const move = (i: number) => {
    setIndex(i);
    setReveal(false);
    setAnswer("");
  };
  return (
    <section className="prep-section prep-dialogue" data-furigana={furigana}>
      <label htmlFor="interview-sector">{t("industry")}</label>
      <select
        id="interview-sector"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          move(0);
        }}
      >
        <option value="">{t("allTopics")}</option>
        {sectors.map((s) => (
          <option key={s.id} value={s.id}>
            {locale === "ja" ? s.titleJa : s.title}
          </option>
        ))}
      </select>
      {!q ? (
        <p>{t("noInterviews")}</p>
      ) : (
        <>
          <div className="prep-controls">
            <label>
              <input
                type="checkbox"
                checked={furigana}
                onChange={(e) => setFurigana(e.target.checked)}
              />
              {t("furigana")}
            </label>
            <label>
              <input
                type="checkbox"
                checked={translation}
                onChange={(e) => setTranslation(e.target.checked)}
              />
              {t("translation")}
            </label>
          </div>
          <article className="prep-card">
            <p className="eyebrow">
              {index + 1} / {selected.length} · {q.topic}
            </p>
            <h2>
              <Japanese text={q.prompt} />
            </h2>
            <label htmlFor="interview-answer">{t("yourDraft")}</label>
            <textarea
              id="interview-answer"
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={3000}
            />
            <p className="prep-muted">{t("draftPrivacy")}</p>
            <Button
              variant="outline"
              aria-expanded={reveal}
              aria-controls="interview-suggestion"
              onClick={() => setReveal(!reveal)}
            >
              {t(reveal ? "hideAnswer" : "revealAnswer")}
            </Button>
            {reveal && (
              <div id="interview-suggestion" className="prep-suggestion">
                <h3>{t("suggestedAnswer")}</h3>
                <p className="prep-japanese">
                  <Japanese text={q.answer} />
                </p>
                {translation && <p>{q.translation}</p>}
                <p>{locale === "ja" ? q.explanationJa : q.explanation}</p>
                {member ? (
                  <LessonCompletion
                    key={q.id}
                    lessonId={q.lessonId}
                    completed={completed.includes(q.lessonId)}
                  />
                ) : (
                  <p className="prep-notice">{t("guestProgress")}</p>
                )}
              </div>
            )}
          </article>
          <div className="prep-controls">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => move(index - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setReveal(false);
                setAnswer("");
              }}
            >
              {t("tryAgain")}
            </Button>
            <Button
              disabled={index === selected.length - 1}
              onClick={() => move(index + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
