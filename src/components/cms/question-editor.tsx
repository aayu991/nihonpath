"use client";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
const row = z.object({
  prompt: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number(),
  explanation: z.string(),
  japaneseExplanation: z.string(),
  translation: z.string(),
});
const empty = {
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
  explanation: "",
  japaneseExplanation: "",
  translation: "",
};
export function QuestionEditor({
  value,
  onChange,
}: {
  value: Json | undefined;
  onChange: (v: Json) => void;
}) {
  const parsed = z.array(row).safeParse(value);
  const questions = parsed.success ? parsed.data : [];
  const update = (i: number, key: string, v: Json) =>
    onChange(questions.map((q, n) => (n === i ? { ...q, [key]: v } : q)));
  return (
    <div>
      {questions.map((q, i) => (
        <section className="cms-panel" key={i}>
          <h3>Question {i + 1}</h3>
          <label className="cms-field">
            Japanese prompt / passage
            <textarea
              lang="ja"
              value={q.prompt}
              onChange={(e) => update(i, "prompt", e.target.value)}
            />
          </label>
          {q.options.map((option, n) => (
            <label className="cms-field" key={n}>
              Option {n + 1}
              <input
                value={option}
                onChange={(e) =>
                  update(
                    i,
                    "options",
                    q.options.map((o, j) => (j === n ? e.target.value : o)),
                  )
                }
              />
            </label>
          ))}
          <div className="cms-actions">
            <button
              type="button"
              disabled={q.options.length >= 4}
              onClick={() => update(i, "options", [...q.options, ""])}
            >
              Add option
            </button>
            <button
              type="button"
              disabled={q.options.length <= 2}
              onClick={() => {
                onChange(
                  questions.map((item, index) =>
                    index === i
                      ? {
                          ...item,
                          options: item.options.slice(0, -1),
                          correctIndex:
                            item.correctIndex >= item.options.length - 1
                              ? 0
                              : item.correctIndex,
                        }
                      : item,
                  ),
                );
              }}
            >
              Remove last option
            </button>
          </div>
          <label className="cms-field">
            Correct answer (administrators only)
            <select
              value={q.correctIndex}
              onChange={(e) =>
                update(i, "correctIndex", Number(e.target.value))
              }
            >
              {q.options.map((_, n) => (
                <option value={n} key={n}>
                  Option {n + 1}
                </option>
              ))}
            </select>
          </label>
          {(["explanation", "japaneseExplanation", "translation"] as const).map(
            (key) => (
              <label className="cms-field" key={key}>
                {key === "explanation"
                  ? "English explanation"
                  : key === "japaneseExplanation"
                    ? "Japanese explanation"
                    : "Prompt translation"}
                <textarea
                  value={q[key]}
                  onChange={(e) => update(i, key, e.target.value)}
                />
              </label>
            ),
          )}
          <button
            type="button"
            onClick={() => onChange(questions.filter((_, n) => n !== i))}
          >
            Remove question {i + 1}
          </button>
        </section>
      ))}
      <button
        type="button"
        disabled={questions.length >= 100}
        onClick={() => onChange([...questions, { ...empty }])}
      >
        + Add question
      </button>
      <p className="cms-muted">
        One correct answer, distinct options and meaningful Japanese/English
        explanations are required before publication. Keys are kept in the
        existing private answer-key table.
      </p>
    </div>
  );
}
