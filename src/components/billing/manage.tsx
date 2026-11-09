"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
export function ManagePayment({
  order,
  stripe,
  paid,
}: {
  order: string;
  stripe: boolean;
  paid: boolean;
}) {
  const t = useTranslations("Billing"),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/billing/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, action }),
      });
      const p = await r.json();
      if (!r.ok) {
        setError(p.error === "timeout" ? "timeout" : "error");
        return;
      }
      if (p.url) window.location.assign(p.url);
      else router.refresh();
    } catch {
      setError("timeout");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="billing-actions">
      <button
        type="button"
        className="button button-outline"
        disabled={busy}
        onClick={() => run("verify")}
      >
        {t(busy ? "busy" : "refresh")}
      </button>
      {stripe && paid && (
        <>
          <button
            type="button"
            className="button button-outline"
            disabled={busy}
            onClick={() => run("portal")}
          >
            {t("portal")}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={busy}
            onClick={() => run("cancel")}
          >
            {t("cancel")}
          </button>
        </>
      )}
      <p role="status">{error && t(error as "error")}</p>
    </div>
  );
}
