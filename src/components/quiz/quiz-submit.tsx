"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export function QuizSubmit({
  ready,
  pending,
  error,
  onSubmit,
  pendingLabel,
}: {
  ready: boolean;
  pending: boolean;
  error?: string;
  onSubmit: () => void;
  pendingLabel?: string;
}) {
  const t = useTranslations("Study");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button
        className="finish-button"
        disabled={!ready || pending}
        onClick={() => dialog.current?.showModal()}
      >
        {t("submit")}
      </Button>
      <dialog
        className="submit-dialog"
        ref={dialog}
        aria-labelledby="submit-title"
        aria-describedby="submit-description"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <h2 id="submit-title">{t("confirmTitle")}</h2>
        <p id="submit-description">{t("confirmText")}</p>
        {error && (
          <p role="alert" className="form-message error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            {t("cancel")}
          </Button>
          <Button disabled={pending} onClick={onSubmit}>
            {pending ? (pendingLabel ?? t("saving")) : t("confirm")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
