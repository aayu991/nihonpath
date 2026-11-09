"use client";
import { Japanese } from "@/components/learning/japanese";
import type { QuizPrompt } from "@/lib/learning/types";
export function QuizQuestion({
  question,
  selected,
  onSelect,
  disabled,
}: {
  question: QuizPrompt;
  selected?: string;
  onSelect: (option: string) => void;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="quiz-question">
      <legend>
        <Japanese text={question.prompt} />
      </legend>
      <div className="quiz-options">
        {question.options.map((option, i) => (
          <label
            className={selected === option.id ? "selected" : ""}
            key={option.id}
          >
            <input
              type="radio"
              name={question.id}
              value={option.id}
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
            />
            <span className="option-letter" aria-hidden="true">
              {String.fromCharCode(65 + i)}
            </span>
            <span>
              <Japanese text={option.text} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
