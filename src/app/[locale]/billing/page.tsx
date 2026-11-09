import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { billingAccount } from "@/lib/billing/server";
import { formatMoney } from "@/lib/billing/schema";
import { ManagePayment } from "@/components/billing/manage";
import { Link } from "@/i18n/navigation";
export const metadata = { robots: { index: false, follow: false } };
export default async function Billing() {
  const locale = await getLocale();
  await requireUser(locale);
  const t = await getTranslations("Billing"),
    { orders, periods, unavailable, now } = await billingAccount();
  return (
    <div className="container billing-page">
      <h1>{t("billing")}</h1>
      <p className="billing-notice">{t("test")}</p>
      {unavailable && <p role="status">{t("unavailable")}</p>}
      <nav className="billing-actions">
        <Link href="/pricing">{t("checkout")} →</Link>
        <Link href="/dashboard">{t("dashboard")} →</Link>
      </nav>
      <h2>{t("passes")}</h2>
      {periods.map((e) => (
        <article key={e.order_id} className="billing-panel">
          <p>
            {t("starts")}:{" "}
            <time dateTime={e.starts_at}>
              {new Date(e.starts_at).toLocaleString(locale)}
            </time>
          </p>
          <p>
            {t("until")}:{" "}
            <time dateTime={e.ends_at}>
              {new Date(e.ends_at).toLocaleString(locale)}
            </time>
          </p>
          {orders.some((o) => o.id === e.order_id && o.kind === "pass") &&
            new Date(e.ends_at).getTime() > now &&
            new Date(e.ends_at).getTime() < now + 7 * 86400000 && (
              <p className="billing-notice">{t("reminder")}</p>
            )}
        </article>
      ))}
      <h2>{t("history")}</h2>
      {!orders.length && <p>{t("empty")}</p>}
      {orders.map((o) => (
        <article key={o.id} className="billing-panel">
          <h3>
            {t(o.product === "premium" ? "premium" : "mock")} · {o.provider}
          </h3>
          <p>
            {t("receipt")}: <code>{o.id}</code>
          </p>
          <p>
            {formatMoney(o.amount_minor, o.currency, locale)} · {t("tax")}:{" "}
            {formatMoney(o.tax_minor, o.currency, locale)}
          </p>
          <p>
            {t("status")}: <strong>{t(o.status)}</strong>
          </p>
          <p>{t(o.kind === "subscription" ? "recurring" : "manual")}</p>
          <ManagePayment
            order={o.id}
            stripe={o.provider === "stripe" && o.kind === "subscription"}
            paid={o.status === "paid"}
          />
        </article>
      ))}
      <Link href="/billing-policy">{t("policy")}</Link>
    </div>
  );
}
