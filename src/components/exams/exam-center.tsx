"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Clock3, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { startExam } from "@/actions/exams";
import type { ExamTemplate } from "@/lib/exams/schema";
import { officialSections } from "@/lib/exams/official";
export function ExamInstructions() {
  const t = useTranslations("Exams");
  return (
    <div className="exam-notice">
      <ShieldCheck aria-hidden="true" />
      <p>{t("instructions")}</p>
    </div>
  );
}
export function ExamConfiguration({
  templates,
  member,
}: {
  templates: ExamTemplate[];
  member: boolean;
}) {
  const t = useTranslations("Exams"),
    router = useRouter();
  const [level, setLevel] = useState("n5"),
    [mode, setMode] = useState("quick"),
    [subject, setSubject] = useState("grammar"),
    [choice, setChoice] = useState(""),
    [difficulty, setDifficulty] = useState("mixed"),
    [count, setCount] = useState(1),
    [pending, startTransition] = useTransition(),
    [error, setError] = useState("");
  const matches = templates.filter(
    (x) => x.level === level && x.mode === mode && x.subject === subject,
  );
  const selected = matches.find((x) => x.id === choice) ?? matches[0];
  const actualCount =
    mode === "quick"
      ? Math.min(count, selected?.count ?? 1)
      : (selected?.count ?? 1);
  const actualDifficulty = mode === "quick" ? difficulty : "mixed";
  const available =
    !!selected?.available &&
    mode !== "full" &&
    (actualDifficulty === "mixed"
      ? Object.values(selected.difficultyCounts).reduce((n, c) => n + c, 0)
      : (selected.difficultyCounts[actualDifficulty] ?? 0)) >= actualCount;
  return (
    <div className="exam-center-grid">
      <div className="exam-panel">
        <p className="eyebrow">01 / {t("configure")}</p>
        <h2>{t("yourPractice")}</h2>
        <fieldset>
          <legend>{t("level")}</legend>
          <div className="exam-levels">
            {["n5", "n4", "n3", "n2", "n1"].map((l) => (
              <button
                key={l}
                aria-pressed={level === l}
                onClick={() => {
                  setLevel(l);
                  setChoice("");
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t("mode")}</legend>
          <div className="exam-modes">
            {(["quick", "section", "full"] as const).map((m) => (
              <button
                key={m}
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setChoice("");
                }}
              >
                <BookOpen aria-hidden="true" />
                <strong>{t(m)}</strong>
                <span>{t(`${m}Desc`)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="exam-fields">
          <label>
            {t("subject")}
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setChoice("");
              }}
            >
              {(
                [
                  "grammar",
                  "vocabulary",
                  "kanji",
                  "reading",
                  "listening",
                ] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("difficulty")}
            <select
              aria-describedby="exam-difficulty"
              value={actualDifficulty}
              disabled={mode !== "quick" || !selected}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="mixed">{t("mixed")}</option>
              {(["easy", "medium", "hard"] as const).map((d) => (
                <option
                  key={d}
                  value={d}
                  disabled={!selected?.difficultyCounts[d]}
                >
                  {t(d)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p id="exam-difficulty" className="text-sm text-slate-600">
          {t("difficultyNote")}
        </p>
        {matches.length > 0 && mode !== "full" && (
          <label>
            {t("configuration")}
            <select
              value={selected?.id ?? ""}
              onChange={(e) => setChoice(e.target.value)}
            >
              {matches.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title} · {x.count} · {Math.round(x.seconds / 60)} min
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "quick" && selected && (
          <label>
            {t("questionCount")}
            <select
              value={actualCount}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {Array.from({ length: selected.count }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
        <ExamInstructions />
        {(!available || mode === "full") && (
          <p className="exam-notice" role="status">
            {t(mode === "full" ? "fullUnavailable" : "unavailable")}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {member ? (
          <Button
            disabled={pending || !available}
            onClick={() =>
              startTransition(async () => {
                setError("");
                try {
                  const r = await startExam(
                    crypto.randomUUID(),
                    selected!.id,
                    actualCount,
                    actualDifficulty,
                  );
                  if (r.error) setError(r.error);
                  else router.push(`/exams/${r.id}`);
                } catch {
                  setError(t("connectionError"));
                }
              })
            }
          >
            {pending ? t("starting") : t("start")}
            <ArrowRight />
          </Button>
        ) : (
          <Button asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        )}
        <p className="text-sm text-slate-600">{t("practiceCounts")}</p>
      </div>
      <aside className="exam-panel exam-guide">
        <p className="eyebrow">
          <Clock3 aria-hidden="true" /> {level.toUpperCase()} / JLPT
        </p>
        <h2>{t("official")}</h2>
        {officialSections[level].map((s) => (
          <div className="exam-duration" key={s.name}>
            <span>
              {t(
                (
                  {
                    Vocabulary: "officialVocabulary",
                    "Grammar & reading": "officialGrammarreading",
                    Listening: "officialListening",
                    "Language knowledge & reading":
                      "officialLanguageknowledgereading",
                  } as const
                )[s.name],
              )}
            </span>
            <strong>{s.minutes} min</strong>
          </div>
        ))}
        <p>{t("timingNote")}</p>
        <a
          className="text-link"
          href="https://www.jlpt.jp/e/guideline/testsections.html"
          target="_blank"
          rel="noreferrer"
        >
          {t("officialSource")} ↗
        </a>
        <hr />
        <h3>{t("recommended")}</h3>
        <Link className="text-link" href={`/courses/${level}`}>
          {level.toUpperCase()} · {t("lessons")} →
        </Link>
        <Link className="text-link" href={`/courses/${level}/flashcards`}>
          {t("flashcards")} →
        </Link>
        {level === "n4" && (
          <Link
            className="text-link"
            href={`/courses/${level}/grammar-practice`}
          >
            {t("untimed")} →
          </Link>
        )}
      </aside>
    </div>
  );
}
