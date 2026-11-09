"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { editExamQuestion } from "@/actions/exams";
import type { Json } from "@/lib/supabase/database.types";
export interface StudioQuestion {
  id: string;
  status: string;
  data: Json;
  reviews: { reviewer_id: string; status: string; created_at: string }[];
}
const sample = {
  level: "n5",
  subject: "grammar",
  type: "grammar_completion",
  difficulty: "easy",
  prompt: "毎朝、七時（　）起きます。",
  options: ["に", "を", "で", "へ"],
  correctIndex: 0,
  explanation: "に marks the specific time when an action takes place.",
  japaneseExplanation: "「に」は動作が行われる時刻を表します。",
  translation: "I get up at seven every morning.",
  source: "Original NihonPath draft — educator review required",
  tags: ["time", "particles"],
};
export function ExamAdmin({ questions }: { questions: StudioQuestion[] }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null),
    [text, setText] = useState(JSON.stringify(sample, null, 2)),
    [saved, setSaved] = useState(text),
    [error, setError] = useState(""),
    [pending, startTransition] = useTransition();
  const selected = questions.find((q) => q.id === id);
  function run(action: string) {
    setError("");
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      setError("Enter valid JSON.");
      return;
    }
    startTransition(async () => {
      try {
        const r = await editExamQuestion(id, data, action);
        if (r.error) setError(r.error);
        else {
          setId(r.id!);
          setSaved(text);
          router.refresh();
        }
      } catch {
        setError("Connection failed. Retry without leaving this draft.");
      }
    });
  }
  return (
    <div className="exam-center-grid">
      <aside className="exam-panel">
        <h2>Question library</h2>
        <Button
          disabled={pending}
          variant="outline"
          onClick={() => {
            setId(null);
            const next = JSON.stringify(sample, null, 2);
            setText(next);
            setSaved(next);
          }}
        >
          New original question
        </Button>
        <ul className="exam-history">
          {questions.map((q) => (
            <li key={q.id}>
              <button
                disabled={pending}
                className="text-left text-link"
                onClick={() => {
                  setId(q.id);
                  const next = JSON.stringify(q.data, null, 2);
                  setText(next);
                  setSaved(next);
                }}
              >
                {String((q.data as Record<string, Json>).prompt)}
                <span className="block text-sm">{q.status}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="exam-panel">
        <h2>{id ? "Edit question" : "New draft"}</h2>
        <p>
          Internal editorial studio. Draft → Under review → Approved →
          Published. Confirm Japanese accuracy, one unambiguous answer,
          explanations, source rights, and curriculum fit before approving.
          Listening publication is disabled until audio verification is
          implemented.
        </p>
        <label htmlFor="exam-question-json">Question document (JSON)</label>
        <textarea
          id="exam-question-json"
          rows={24}
          spellCheck={false}
          className="w-full rounded-xl border border-slate-300 p-4 font-mono text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p>
          Optional passage, lessonId and deckId connect reading prompts and
          revision resources. Save always returns the question to Draft. Create
          a new revision to change its level or subject.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={pending} onClick={() => run("save")}>
            {pending ? "Saving…" : "Save draft"}
          </Button>
          {id &&
            ["review", "approve", "publish", "archive"]
              .filter(
                (a) =>
                  a === "archive" ||
                  (
                    {
                      draft: "review",
                      in_review: "approve",
                      approved: "publish",
                    } as Record<string, string>
                  )[selected?.status ?? ""] === a,
              )
              .map((a) => (
                <Button
                  variant="outline"
                  key={a}
                  disabled={pending || text !== saved}
                  onClick={() => run(a)}
                >
                  {a}
                </Button>
              ))}
        </div>
        {text !== saved && <p>Save your changes before a review transition.</p>}
        {error && <p role="alert">{error}</p>}
        <h3>Review audit</h3>
        {selected?.reviews.map((r, i) => (
          <p key={i}>
            {r.status} · {r.created_at} · reviewer {r.reviewer_id}
          </p>
        ))}
      </div>
    </div>
  );
}
