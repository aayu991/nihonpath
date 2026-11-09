import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export function LessonModule({
  title,
  index,
  status,
  children,
}: {
  title: string;
  index: number;
  status?: string;
  children: ReactNode;
}) {
  return (
    <details className="lesson-module">
      <summary>
        <span className="module-index">{String(index).padStart(2, "0")}</span>
        <strong>{title}</strong>
        {status && <span className="module-status">{status}</span>}
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="module-body">{children}</div>
    </details>
  );
}
