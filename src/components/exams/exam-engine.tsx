"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Clock3, Flag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Japanese } from "@/components/learning/japanese";
import { Link } from "@/i18n/navigation";
import { finishExam, loadExam, updateExam } from "@/actions/exams";
import {
  breakdown,
  remainingSeconds,
  type Exam,
  type ExamQuestionData,
  type ExamResultData,
} from "@/lib/exams/schema";
export function ExamTimer({ seconds }: { seconds: number }) {
  const t = useTranslations("Exams");
  return (
    <span className="exam-timer" role="timer" aria-label={t("remaining")}>
      <Clock3 aria-hidden="true" />
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
export function ExamProgress({
  answered,
  total,
}: {
  answered: number;
  total: number;
}) {
  const t = useTranslations("Exams");
  return (
    <div className="exam-progress">
      <p>
        {t("answered")}: {answered}/{total} · {t("unanswered")}:{" "}
        {total - answered}
      </p>
      <progress aria-label={t("answered")} max={total} value={answered} />
    </div>
  );
}
export function QuestionNavigator({
  questions,
  index,
  onChange,
  disabled,
}: {
  questions: ExamQuestionData[];
  index: number;
  onChange: (i: number) => void;
  disabled: boolean;
}) {
  const t = useTranslations("Exams");
  return (
    <nav aria-label={t("questionMap")} className="exam-question-map">
      {questions.map((q, i) => (
        <button
          disabled={disabled}
          key={q.id}
          aria-current={index === i ? "step" : undefined}
          aria-label={`${i + 1}: ${t(q.selectedOptionId ? "answered" : "unanswered")}${q.flagged ? `, ${t("flagged")}` : ""}`}
          data-answered={!!q.selectedOptionId}
          onClick={() => onChange(i)}
        >
          {i + 1}
          {q.flagged && <Flag size={12} aria-hidden="true" />}
        </button>
      ))}
    </nav>
  );
}
export function AnswerSelector({
  question,
  onSelect,
  disabled,
}: {
  question: ExamQuestionData;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("Exams");
  return (
    <fieldset className="exam-options" disabled={disabled}>
      <legend className="sr-only">{t("chooseAnswer")}</legend>
      {question.options.map((o, i) => (
        <label key={o.id} data-selected={question.selectedOptionId === o.id}>
          <input
            type="radio"
            name={question.id}
            value={o.id}
            checked={question.selectedOptionId === o.id}
            onChange={() => onSelect(o.id)}
          />
          <span className="exam-option-letter">{i + 1}</span>
          <Japanese text={o.text} />
        </label>
      ))}
    </fieldset>
  );
}
export function ExamQuestion({
  question,
  index,
  onSelect,
  disabled,
}: {
  question: ExamQuestionData;
  index: number;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("Exams");
  const subjectLabel =
    question.subject === "grammar" ||
    question.subject === "vocabulary" ||
    question.subject === "kanji" ||
    question.subject === "reading" ||
    question.subject === "listening"
      ? t(question.subject)
      : question.subject;
  return (
    <div className="exam-question">
      <p className="eyebrow">
        {String(index + 1).padStart(2, "0")} / {subjectLabel} ·{" "}
        {question.type.replaceAll("_", " ")}
      </p>
      {question.passage && (
        <blockquote className="exam-passage">
          <Japanese text={question.passage} />
        </blockquote>
      )}
      <h2 tabIndex={-1} id="exam-question-heading">
        <Japanese text={question.prompt} />
      </h2>
      <AnswerSelector
        question={question}
        onSelect={onSelect}
        disabled={disabled}
      />
    </div>
  );
}
export function ExamSubmission({
  unanswered,
  onSubmit,
  onCancel,
  pending,
}: {
  unanswered: number;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const t = useTranslations("Exams"),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="exam-submit-dialog"
      onCancel={onCancel}
      aria-labelledby="exam-submit-title"
    >
      <h2 id="exam-submit-title">{t("confirmSubmit")}</h2>
      <p>
        {unanswered > 0
          ? t("unansweredWarning", { count: unanswered })
          : t("allAnswered")}
      </p>
      <p>{t("finalWarning")}</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={onSubmit}>
          {pending ? t("submitting") : t("submit")}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onCancel}>
          {t("continue")}
        </Button>
      </div>
    </dialog>
  );
}
export function AnswerReview({
  answers,
  incorrectOnly = false,
}: {
  answers: ExamResultData["answers"];
  incorrectOnly?: boolean;
}) {
  const t = useTranslations("Exams");
  return (
    <div className="exam-reviews">
      {answers
        .filter((a) => !incorrectOnly || !a.correct)
        .map((a, i) => (
          <details key={`${a.id}-${i}`} className="exam-panel">
            <summary>
              {i + 1}. {t(a.correct ? "correct" : "incorrect")} ·{" "}
              <Japanese text={a.prompt} />
            </summary>
            {a.passage && (
              <p className="exam-passage">
                <Japanese text={a.passage} />
              </p>
            )}
            <p>
              {t("yourAnswer")}:{" "}
              <Japanese
                text={
                  a.options.find((o) => o.id === a.selectedOptionId)?.text ??
                  t("unanswered")
                }
              />
            </p>
            <p className="text-emerald-800">
              {t("correctAnswer")}:{" "}
              <Japanese
                text={
                  a.options.find((o) => o.id === a.correctOptionId)?.text ?? ""
                }
              />
            </p>
            <p>{a.explanation}</p>
            <p>
              <Japanese text={a.japaneseExplanation} />
            </p>
            {a.translation && <p>{a.translation}</p>}
            <div className="flex flex-wrap gap-4">
              {a.lessonId && (
                <Link className="text-link" href={`/lessons/${a.lessonId}`}>
                  {t("relatedLesson")} →
                </Link>
              )}
              {a.level && (
                <Link
                  className="text-link"
                  href={
                    a.subject === "vocabulary"
                      ? `/courses/${a.level}/flashcards${a.deckId ? `?deck=${a.deckId}` : ""}`
                      : a.subject === "grammar" && a.level === "n4"
                        ? `/courses/${a.level}/grammar-practice`
                        : `/courses/${a.level}`
                  }
                >
                  {t(
                    a.subject === "vocabulary"
                      ? "flashcards"
                      : a.subject === "grammar" && a.level === "n4"
                        ? "untimed"
                        : "lessons",
                  )}{" "}
                  →
                </Link>
              )}
            </div>
          </details>
        ))}
    </div>
  );
}
export function ExamResults({
  result,
  level,
}: {
  result: ExamResultData;
  level: string;
}) {
  const t = useTranslations("Exams"),
    [only, setOnly] = useState(false);
  return (
    <div>
      <div className="exam-panel">
        <p className="eyebrow">
          <CheckCircle2 aria-hidden="true" /> {t("submitted")}
        </p>
        <h1>{t("results")}</h1>
        <div className="exam-stats">
          {[
            [t("total"), result.total],
            [t("correct"), result.correct],
            [t("incorrect"), result.total - result.correct - result.unanswered],
            [t("unanswered"), result.unanswered],
            [
              t("accuracy"),
              `${Math.round((result.correct / result.total) * 100)}%`,
            ],
            [
              t("timeSpent"),
              `${Math.floor(result.seconds / 60)}:${String(result.seconds % 60).padStart(2, "0")}`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p>{t("scoreNote")}</p>
        <div className="exam-breakdowns">
          {(["subject", "type"] as const).map((field) => (
            <div key={field}>
              <h2>{t(field === "type" ? "byType" : "bySubject")}</h2>
              {breakdown(result.answers, field).map((b) => (
                <p key={b.label}>
                  {b.label.replaceAll("_", " ")}{" "}
                  <strong>
                    {b.correct}/{b.total}
                  </strong>
                </p>
              ))}
            </div>
          ))}
        </div>
        <h2>{t("recommended")}</h2>
        <div className="flex flex-wrap gap-4">
          <Link className="text-link" href={`/courses/${level}`}>
            {t("lessons")} →
          </Link>
          <Link className="text-link" href={`/courses/${level}/flashcards`}>
            {t("flashcards")} →
          </Link>
          <Link className="text-link" href="/exams">
            {t("title")} →
          </Link>
        </div>
      </div>
      <div className="exam-review-heading">
        <h2>{t("review")}</h2>
        <label>
          <input
            type="checkbox"
            checked={only}
            onChange={(e) => setOnly(e.target.checked)}
          />{" "}
          {t("incorrectOnly")}
        </label>
      </div>
      <AnswerReview answers={result.answers} incorrectOnly={only} />
    </div>
  );
}
export function ExamEngine({ initial }: { initial: Exam }) {
  const t = useTranslations("Exams");
  const [exam, setExam] = useState(initial),
    [index, setIndex] = useState(0),
    [seconds, setSeconds] = useState(
      remainingSeconds(initial.expires_at, Date.parse(initial.serverTime)),
    ),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [pending, startTransition] = useTransition();
  const time = useRef({ server: Date.parse(initial.serverTime), local: 0 }),
    busy = useRef(false),
    heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    time.current.local = performance.now();
    const timer = setInterval(
      () =>
        setSeconds(
          remainingSeconds(
            initial.expires_at,
            time.current.server + performance.now() - time.current.local,
          ),
        ),
      500,
    );
    return () => clearInterval(timer);
  }, [initial.expires_at]);
  const submit = () => {
    if (busy.current) return;
    busy.current = true;
    setError("");
    startTransition(async () => {
      try {
        const r = await finishExam(exam.id);
        if (r.exam) {
          setExam(r.exam);
          setConfirm(false);
        } else setError(r.error ?? t("loadError"));
      } catch {
        setError(t("connectionError"));
      } finally {
        busy.current = false;
      }
    });
  };
  useEffect(() => {
    if (seconds === 0 && exam.status === "active") {
      let retries = 0;
      const attemptSubmission = () => {
        if (!busy.current) {
          retries += 1;
          busy.current = true;
          startTransition(async () => {
            try {
              const r = await finishExam(exam.id);
              if (r.exam) setExam(r.exam);
              else setError(r.error ?? t("connectionError"));
            } catch {
              setError(t("connectionError"));
            } finally {
              busy.current = false;
            }
          });
          if (retries >= 3) clearInterval(timer);
        }
      };
      const first = setTimeout(attemptSubmission, 0);
      const timer = setInterval(attemptSubmission, 10000);
      return () => {
        clearTimeout(first);
        clearInterval(timer);
      };
    }
  }, [seconds, exam.id, exam.status, t]);
  useEffect(() => {
    if (exam.status !== "active") return;
    const sync = async () => {
      if (document.visibilityState !== "visible" || busy.current) return;
      try {
        const restored = await loadExam(exam.id);
        if (restored) {
          time.current = {
            server: Date.parse(restored.serverTime),
            local: performance.now(),
          };
          setSeconds(
            remainingSeconds(restored.expires_at, time.current.server),
          );
          if (restored.status === "submitted") setExam(restored);
        }
      } catch {
        /* Countdown and explicit save errors remain available when offline. */
      }
    };
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [exam.id, exam.status]);
  const save = (option: string | null, flagged: boolean) => {
    if (busy.current || seconds === 0) return;
    busy.current = true;
    setError("");
    const q = exam.questions[index];
    startTransition(async () => {
      try {
        const r = await updateExam(exam.id, q.id, option, flagged);
        if (r.error) setError(r.error);
        else if (r.saved)
          setExam((e) => ({
            ...e,
            questions: e.questions.map((x) =>
              x.id === q.id ? { ...x, selectedOptionId: option, flagged } : x,
            ),
          }));
        else {
          const restored = await loadExam(exam.id);
          if (restored) setExam(restored);
          else setError(t("loadError"));
        }
      } catch {
        setError(t("connectionError"));
      } finally {
        busy.current = false;
      }
    });
  };
  if (exam.result)
    return <ExamResults result={exam.result} level={exam.level} />;
  const q = exam.questions[index],
    answered = exam.questions.filter((x) => x.selectedOptionId).length;
  const move = (i: number) => {
    setIndex(i);
    setTimeout(
      () => heading.current?.querySelector<HTMLElement>("h2")?.focus(),
      0,
    );
  };
  return (
    <div className="exam-active">
      <div className="exam-panel">
        <div className="exam-session-heading">
          <div>
            <p className="eyebrow">JLPT {exam.level.toUpperCase()}</p>
            <h1>{exam.title}</h1>
          </div>
          <ExamTimer seconds={seconds} />
        </div>
        <p>{t("autosave")}</p>
        <ExamProgress answered={answered} total={exam.questions.length} />
        <QuestionNavigator
          questions={exam.questions}
          index={index}
          onChange={move}
          disabled={pending}
        />
        {error && (
          <p role="alert" className="exam-notice">
            {error}
          </p>
        )}
        <p role="status" aria-live="polite">
          {pending ? t("saving") : error ? t("unsaved") : t("saved")}
        </p>
      </div>
      <div className="exam-panel exam-timed" ref={heading}>
        <ExamQuestion
          question={q}
          index={index}
          disabled={pending || seconds === 0}
          onSelect={(id) => save(id, q.flagged)}
        />
        <div className="exam-session-actions">
          <Button
            variant="outline"
            disabled={pending || seconds === 0}
            aria-pressed={q.flagged}
            onClick={() => save(q.selectedOptionId, !q.flagged)}
          >
            <Flag />
            {t(q.flagged ? "flagged" : "flag")}
          </Button>
          <Button
            variant="ghost"
            disabled={pending || seconds === 0 || !q.selectedOptionId}
            onClick={() => save(null, q.flagged)}
          >
            {t("clear")}
          </Button>
        </div>
        <div className="exam-session-actions">
          <Button
            variant="outline"
            disabled={pending || index === 0}
            onClick={() => move(index - 1)}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            disabled={pending || index === exam.questions.length - 1}
            onClick={() => move(index + 1)}
          >
            {t("next")}
          </Button>
          <Button
            disabled={pending}
            onClick={() => (seconds === 0 ? submit() : setConfirm(true))}
          >
            {t("submit")}
          </Button>
        </div>
      </div>
      {confirm && (
        <ExamSubmission
          unanswered={exam.questions.length - answered}
          onSubmit={submit}
          onCancel={() => setConfirm(false)}
          pending={pending}
        />
      )}
    </div>
  );
}
