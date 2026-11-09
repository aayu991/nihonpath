"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  formatMoney,
  type RegionalPrice,
  type Checkout,
} from "@/lib/billing/schema";
export function BillingCheckout({
  prices,
  signedIn,
}: {
  prices: RegionalPrice[];
  signedIn: boolean;
}) {
  const t = useTranslations("Billing"),
    locale = useLocale();
  const [country, setCountry] = useState("US"),
    [currency, setCurrency] = useState("USD"),
    [plan, setPlan] = useState("month"),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [checkout, setCheckout] = useState<Checkout | null>(null),
    [order, setOrder] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID());
  const choices = prices.filter(
    (p) =>
      (p.country === "*" || p.country === country) &&
      p.currency === currency &&
      (p.kind === "subscription"
        ? p.interval === plan
        : `pass${p.days}` === plan),
  );
  const price = choices.find((p) => p.id === selected);
  function reset() {
    setSelected("");
    setCheckout(null);
    setError("");
    setOrder("");
    setKey(crypto.randomUUID());
  }
  async function pay() {
    if (!price) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: price.id,
          provider: price.provider,
          country,
          locale,
          key,
        }),
      });
      const p = await r.json();
      if (p.order) setOrder(p.order);
      if (!r.ok) {
        setError(
          p.error === "timeout"
            ? "timeout"
            : p.error === "pending"
              ? "pending"
              : "provider_error",
        );
        return;
      }
      setCheckout(p.checkout);
    } catch {
      setError("timeout");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="billing-panel" aria-label={t("review")}>
      <fieldset disabled={busy || !!checkout}>
        <legend>{t("review")}</legend>
        <div className="billing-fields">
          <label>
            {t("country")}
            <input
              value={country}
              maxLength={2}
              pattern="[A-Z]{2}"
              list="billing-countries"
              onChange={(e) => {
                reset();
                setCountry(e.target.value.toUpperCase());
              }}
            />
            <datalist id="billing-countries">
              {[
                "NP",
                "JP",
                "IN",
                "US",
                "GB",
                "DE",
                "FR",
                "CA",
                "AU",
                "SG",
                "NZ",
              ].map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </label>
          <label>
            {t("currency")}
            <select
              value={currency}
              onChange={(e) => {
                reset();
                setCurrency(e.target.value);
              }}
            >
              {["USD", "NPR", "JPY"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            {t("plan")}
            <select
              value={plan}
              onChange={(e) => {
                reset();
                setPlan(e.target.value);
              }}
            >
              {["month", "year", "pass30", "pass365"].map((v) => (
                <option key={v} value={v}>
                  {t(v as "month")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>{t("declared")}</p>
        <p>{t(plan.startsWith("pass") ? "manual" : "recurring")}</p>
        <div className="billing-options">
          {choices.map((p) => (
            <label key={p.id} className="billing-option">
              <input
                type="radio"
                name="billing-price"
                checked={selected === p.id}
                onChange={() => setSelected(p.id)}
              />
              <strong>{t(p.product === "premium" ? "premium" : "mock")}</strong>
              <span>
                {p.provider === "esewa"
                  ? "eSewa"
                  : p.provider === "khalti"
                    ? "Khalti"
                    : "Stripe"}
              </span>
              <span>{formatMoney(p.amount_minor, p.currency, locale)}</span>
            </label>
          ))}
        </div>
        {!choices.length && <p role="status">{t("noMatch")}</p>}
        {price && (
          <div className="billing-total">
            <strong>
              {t("price")}:{" "}
              {formatMoney(price.amount_minor, price.currency, locale)}
            </strong>
            <p>
              {t("tax")}: {formatMoney(price.tax_minor, price.currency, locale)}{" "}
              · {price.tax_label}
            </p>
            <p>{t("taxNotice")}</p>
          </div>
        )}
        {signedIn ? (
          <button
            type="button"
            className="button button-primary"
            disabled={!price || busy || !!order}
            onClick={pay}
          >
            {t(busy ? "busy" : "confirm")}
          </button>
        ) : (
          <Link className="button button-primary" href="/login">
            {t("sign_in")}
          </Link>
        )}
      </fieldset>
      <p aria-live="polite">{error && t(error as "error")}</p>
      {checkout &&
        (checkout.fields ? (
          <form action={checkout.url} method="post">
            {Object.entries(checkout.fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button className="button button-primary">
              {t("returnProvider")}
            </button>
          </form>
        ) : (
          <a className="button button-primary" href={checkout.url}>
            {t("returnProvider")}
          </a>
        ))}
      {order && (
        <p>
          <Link href={`/billing?order=${order}`}>{t("retry")}</Link>
        </p>
      )}
      <p>{t("secure")}</p>
    </section>
  );
}
