"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { QuizPrompt, QuizResult } from "@/lib/learning/types";
import { submitQuiz } from "@/actions/learning";
import { QuizStart } from "./quiz-start";
import { QuizQuestion } from "./quiz-question";
import { QuizProgress } from "./quiz-progress";
import { QuizNavigation } from "./quiz-navigation";
import { QuizSubmit } from "./quiz-submit";
import { QuizResults } from "./quiz-results";
export function QuizEngine({
  questions,
  member,
  bankId,
  title,
  demo,
}: {
  questions: QuizPrompt[];
  member: boolean;
  bankId?: string;
  title?: string;
  demo?:boolean;
}) {
  const t = useTranslations("Study");
  const l = useTranslations("Learning");
  const [timer, setTimer] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const busy = useRef(false);
  const attempt = useRef<string>("");
  const count = Object.keys(answers).length;
  useEffect(() => {
    if (!started || result || !timer) return;
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [started, result, timer]);
  const heading = useRef<HTMLParagraphElement>(null);
  function move(next: number) {
    setIndex(next);
    heading.current?.focus();
  }
  async function submit() {
    if (busy.current || count !== questions.length) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const response = await submitQuiz({
        attemptId: attempt.current,
        member,
        bankId,
        demo,
        answers: questions.map((q) => ({
          questionId: q.id,
          optionId: answers[q.id],
        })),
      });
      if (response.ok) setResult(response.data);
      else
        setError(
          t(response.error === "session" ? "sessionError" : "networkError"),
        );
    } catch {
      setError(t("networkError"));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (result)
    return (
      <QuizResults
        result={result}
        questions={questions}
        onRetry={() => {
          setStarted(false);
          setIndex(0);
          setAnswers({});
          setResult(undefined);
          setError(undefined);
          attempt.current = "";
          setElapsed(0);
        }}
      />
    );
  if (!started)
    return (
      <div>
        <label className="practice-timer-option">
          <input
            type="checkbox"
            checked={timer}
            onChange={(e) => setTimer(e.target.checked)}
          />
          {l("timer")}
        </label>
        <QuizStart
          count={questions.length}
          title={title}
          onStart={() => {
            attempt.current = crypto.randomUUID();
            setStarted(true);
          }}
        />
      </div>
    );
  const question = questions[index];
  return (
    <div className="quiz-shell">
      {timer && (
        <p className="practice-timer">
          {l("elapsed")}: {Math.floor(elapsed / 60)}:
          {String(elapsed % 60).padStart(2, "0")}
        </p>
      )}
      <nav className="question-map" aria-label={l("questionNavigation")}>
        {questions.map((q, i) => (
          <button
            type="button"
            key={q.id}
            disabled={pending}
            aria-current={index === i ? "step" : undefined}
            aria-label={`${i + 1}: ${l(answers[q.id] ? "answered" : "unanswered")}`}
            onClick={() => move(i)}
          >
            {i + 1}
            {answers[q.id] ? " ✓" : " ○"}
          </button>
        ))}
      </nav>
      <QuizProgress count={count} total={questions.length} />
      <p
        className="study-position"
        ref={heading}
        tabIndex={-1}
        aria-live="polite"
      >
        {t("question", { current: index + 1, total: questions.length })}
      </p>
      <QuizQuestion
        question={question}
        selected={answers[question.id]}
        onSelect={(option) =>
          setAnswers((current) => ({ ...current, [question.id]: option }))
        }
        disabled={pending}
      />
      <QuizNavigation
        index={index}
        total={questions.length}
        disabled={pending}
        onMove={move}
      />
      <QuizSubmit
        pendingLabel={member ? t("saving") : t("checking")}
        ready={count === questions.length}
        pending={pending}
        onSubmit={submit}
        error={error}
      />
    </div>
  );
}
