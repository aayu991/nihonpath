"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { completeLesson, type LessonState } from "@/actions/lesson";
import { Button } from "@/components/ui/button";
export function LessonCompletion({
  lessonId,
  completed,
}: {
  lessonId: string;
  completed: boolean;
}) {
  const t = useTranslations("Platform");
  const locale = useLocale();
  const [state, action, pending] = useActionState(
    completeLesson.bind(null, lessonId, locale),
    { status: "idle" } as LessonState,
  );
  return (
    <form action={action} className="lesson-completion">
      <Button disabled={completed || state.status === "saved" || pending}>
        {pending
          ? t("saving")
          : completed || state.status === "saved"
            ? t("lessonCompleted")
            : t("completeLesson")}
      </Button>
      {state.status === "saved" && (
        <p role="status" className="form-message success">
          {t("lessonCompleted")}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="form-message error">
          {t("saveError")}
        </p>
      )}
    </form>
  );
}
