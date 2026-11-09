"use client";
import {
  useState,
  useTransition,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { tutorMessageKey } from "@/lib/tutors/messages";
import { zones } from "@/lib/tutors/schema";
export function useTutorText() {
  const t = useTranslations("Tutor");
  return (key: string) => t(tutorMessageKey(key));
}
const subscribe = () => () => {};
export function useViewerTimezone() {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
}
export function TutorTimezone({
  name = "timezone",
  value,
  onChange,
}: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const t = useTutorText(),
    detected = useViewerTimezone();
  return (
    <label>
      {t("timezone")}
      <input
        name={name}
        list="tutor-timezones"
        required
        {...(onChange
          ? {
              value: value ?? detected,
              onChange: (e) => onChange(e.target.value),
            }
          : { defaultValue: value ?? "UTC" })}
      />
      <datalist id="tutor-timezones">
        {[...new Set([detected, ...zones])].map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </label>
  );
}
export type TutorResult = { error?: string; ok?: boolean; id?: string };
export function TutorForm({
  action,
  children,
  label = "save",
  submitLabel,
  onDone,
}: {
  action: (data: FormData, intent: string) => Promise<TutorResult>;
  children?: ReactNode;
  label?: string;
  submitLabel?: string;
  onDone?: () => void;
}) {
  const t = useTutorText(),
    router = useRouter(),
    [pending, start] = useTransition(),
    [message, setMessage] = useState("");
  return (
    <form
      method="post"
      className="tutor-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget),
          intent =
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ??
            "save";
        start(async () => {
          setMessage("");
          try {
            const r = await action(data, intent);
            setMessage(t(r.error ?? "saved"));
            if (!r.error) {
              onDone?.();
              router.refresh();
            }
          } catch {
            setMessage(t("saveError"));
          }
        });
      }}
    >
      {children !== undefined && (
        <fieldset className="tutor-form-fields" disabled={pending}>
          {children}
        </fieldset>
      )}
      <div className="tutor-controls">
        <Button disabled={pending} value="save">
          {t(pending ? "saving" : label)}
        </Button>
        {submitLabel && (
          <Button disabled={pending} variant="outline" value="submit">
            {t(submitLabel)}
          </Button>
        )}
      </div>
      {message && (
        <p role="status" className="tutor-message">
          {message}
        </p>
      )}
    </form>
  );
}
export function PriceFields({
  minor = 0,
  currency = "JPY",
}: {
  minor?: number;
  currency?: string;
}) {
  const t = useTutorText();
  return (
    <div className="tutor-two">
      <label>
        {t("price")}
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={minor / (currency === "JPY" ? 1 : 100)}
        />
      </label>
      <label>
        {t("currency")}
        <select name="currency" defaultValue={currency}>
          {["JPY", "USD", "NPR", "INR"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
export { priceMinor } from "@/lib/tutors/schema";
