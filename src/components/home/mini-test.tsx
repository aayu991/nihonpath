"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  miniLevels,
  miniQuestions,
  type MiniLevel,
  type MiniResult,
} from "@/lib/learning/mini-test";
import { gradeMiniTest } from "@/actions/mini-test";
import { Japanese } from "@/components/learning/japanese";
import { Button } from "@/components/ui/button";
export function MiniTest() {
  const t = useTranslations("HomePractice");
  const [level, setLevel] = useState<MiniLevel>("n5");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);
  const [result, setResult] = useState<MiniResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  function reset(next: MiniLevel = level) {
    setLevel(next);
    setIndex(0);
    setAnswers([-1, -1, -1]);
    setResult(null);
    setError(false);
  }
  async function submit() {
    if (pending || answers.includes(-1)) return;
    setPending(true);
    setError(false);
    try {
      const value = await gradeMiniTest({ level, answers });
      if (value) setResult(value);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  const question = miniQuestions[level][index];
  return (
    <section className="practice-panel" aria-labelledby="mini-title">
      <p className="eyebrow">JLPT · N5—N1</p>
      <h2 id="mini-title">{t("testTitle")}</h2>
      <p>{t("testIntro")}</p>
      <label className="level-select">
        {t("level")}
        <select
          aria-label={t("level")}
          value={level}
          disabled={pending}
          onChange={(e) => reset(e.target.value as MiniLevel)}
        >
          {miniLevels.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      {result ? (
        <div className="mini-results">
          <h3 role="status">{t("score", { score: result.score })}</h3>
          <p>{t("notSaved")}</p>
          {result.answers.map((feedback, i) => (
            <article key={feedback.id} className="mini-feedback">
              <h4>
                {t("question", { current: i + 1 })} ·{" "}
                {t(
                  answers[i] === feedback.correctIndex
                    ? "correct"
                    : "incorrect",
                )}
              </h4>
              <p className="japanese-sentence">
                <Japanese text={miniQuestions[level][i].prompt} />
              </p>
              <p>
                {t("yourAnswer")}:{" "}
                <Japanese text={miniQuestions[level][i].options[answers[i]]} />
              </p>
              <p>
                <strong>
                  {t("correctAnswer")}:{" "}
                  <Japanese
                    text={
                      miniQuestions[level][i].options[feedback.correctIndex]
                    }
                  />
                </strong>
              </p>
              <p lang="en">{feedback.explanation}</p>
              <p className="japanese-sentence">
                <Japanese text={feedback.example} />
              </p>
            </article>
          ))}
          <Button variant="outline" onClick={() => reset()}>
            {t("restart")}
          </Button>
        </div>
      ) : (
        <>
          <p className="practice-position" aria-live="polite">
            {t("question", { current: index + 1 })} / 3
          </p>
          <fieldset
            className="mini-options"
            key={question.id}
            disabled={pending}
          >
            <legend className="japanese-sentence">
              <Japanese text={question.prompt} />
            </legend>
            {question.options.map((option, i) => (
              <label
                key={option}
                className={answers[index] === i ? "selected" : ""}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[index] === i}
                  onChange={() =>
                    setAnswers((previous) =>
                      previous.map((answer, n) => (n === index ? i : answer)),
                    )
                  }
                />
                <Japanese text={option} />
              </label>
            ))}
          </fieldset>
          <div className="practice-actions">
            <Button
              variant="outline"
              disabled={index === 0 || pending}
              onClick={() => setIndex(index - 1)}
            >
              {t("previous")}
            </Button>
            {index < 2 ? (
              <Button onClick={() => setIndex(index + 1)} disabled={pending}>
                {t("next")}
              </Button>
            ) : (
              <Button
                disabled={pending || answers.includes(-1)}
                onClick={submit}
              >
                {t(pending ? "grading" : "submit")}
              </Button>
            )}
          </div>
          <p className="practice-note">{t("answerAll")}</p>
          {error && <p role="alert">{t("error")}</p>}
        </>
      )}
    </section>
  );
}
