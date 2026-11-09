"use client";
import { reportTutorContent } from "@/actions/tutors";
import { TutorForm, useTutorText } from "./shared";
export function TutorReport({
  kind,
  target,
}: {
  kind: "profile" | "booking" | "review";
  target: string;
}) {
  const t = useTutorText();
  return (
    <details className="tutor-report">
      <summary>{t("report")}</summary>
      <TutorForm
        label="report"
        action={(fd) =>
          reportTutorContent({ kind, target, reason: fd.get("reason") })
        }
      >
        <label>
          {t("reason")}
          <textarea name="reason" required minLength={10} maxLength={2000} />
        </label>
      </TutorForm>
    </details>
  );
}
