"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  submitSupport,
  reviewSupport,
  saveNotificationPreferences,
} from "@/actions/support";
const categories = [
  "account",
  "courses",
  "exams",
  "ai",
  "billing",
  "tutors",
  "organizations",
];
export function SupportForm() {
  const t = useTranslations("Launch"),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [id, setId] = useState(() => crypto.randomUUID());
  return (
    <form
      className="launch-form"
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          data = new FormData(form);
        setBusy(true);
        setMessage("");
        try {
          const r = await submitSupport({
            id,
            category: data.get("category"),
            subject: data.get("subject"),
            body: data.get("body"),
            website: data.get("website"),
            consent: data.get("consent") === "on",
          });
          setMessage(r.error ?? "saved");
          if (r.saved) {
            form.reset();
            setId(crypto.randomUUID());
            router.refresh();
          }
        } catch {
          setMessage("unavailable");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend>{t("contact")}</legend>
        <p>{t("warning")}</p>
        <label>
          {t("category")}
          <select name="category">
            {categories.map((c, i) => (
              <option value={c} key={c}>
                {(t.raw("categories") as string[])[i]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("subject")}
          <input name="subject" required minLength={6} maxLength={160} />
        </label>
        <label>
          {t("message")}
          <textarea
            name="body"
            required
            minLength={20}
            maxLength={3000}
            rows={6}
          />
        </label>
        <div className="launch-honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="launch-check">
          <input type="checkbox" name="consent" required />
          {t("consent")}
        </label>
        <Button disabled={busy}>{t(busy ? "busy" : "submit")}</Button>
      </fieldset>
      <p role="status">{message && t(message as "saved")}</p>
    </form>
  );
}
export function ReviewSupport({
  id,
  status,
  expected,
}: {
  id: string;
  status: string;
  expected: string;
}) {
  const t = useTranslations("Launch"),
    router = useRouter();
  const [value, setValue] = useState(status),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await reviewSupport({ id, status: value, expected });
          setMessage(r.error ?? "saved");
          if (r.saved) router.refresh();
        } catch {
          setMessage("unavailable");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {t("review")}
        <select
          disabled={busy}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {["open", "in_review", "resolved"].map((s) => (
            <option key={s} value={s}>
              {t(s as "open")}
            </option>
          ))}
        </select>
      </label>
      <Button disabled={busy} variant="outline">
        {t("save")}
      </Button>
      <p role="status">{message && t(message as "saved")}</p>
    </form>
  );
}
export function NotificationPreferences({
  learning = false,
  renewal = false,
}: {
  learning?: boolean;
  renewal?: boolean;
}) {
  const t = useTranslations("Launch");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="launch-form"
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const r = await saveNotificationPreferences({
            learning: data.get("learning") === "on",
            renewal: data.get("renewal") === "on",
          });
          setMessage(r.error ?? "saved");
        } catch {
          setMessage("unavailable");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend>{t("preferences")}</legend>
        <label className="launch-check">
          <input type="checkbox" name="learning" defaultChecked={learning} />
          {t("learning")}
        </label>
        <label className="launch-check">
          <input type="checkbox" name="renewal" defaultChecked={renewal} />
          {t("renewal")}
        </label>
        <p>{t("essential")}</p>
        <Button>{t(busy ? "busy" : "save")}</Button>
      </fieldset>
      <p role="status">{message && t(message as "saved")}</p>
    </form>
  );
}
