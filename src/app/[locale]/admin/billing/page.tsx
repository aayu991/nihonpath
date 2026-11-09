import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { formatMoney, formatExactMoney } from "@/lib/billing/schema";
import { z } from "zod";
const money = z
  .union([z.number().int(), z.string().regex(/^\d+$/)])
  .transform(String);
const report = z.object({
  totals: z.array(
    z.object({
      provider: z.string(),
      currency: z.string(),
      payments: z.number(),
      gross_minor: money,
    }),
  ),
  orders: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      currency: z.string(),
      amount_minor: z.number(),
      status: z.string(),
      kind: z.string(),
      product: z.string(),
      created_at: z.string(),
    }),
  ),
  refunds: z.array(
    z.object({
      provider: z.string(),
      currency: z.string(),
      amount_minor: z.number().nullable(),
      status: z.string(),
    }),
  ),
  settlements: z.array(
    z.object({
      provider: z.string(),
      currency: z.string(),
      gross_minor: z.number(),
      refund_minor: z.number(),
      fee_minor: z.number(),
      net_minor: z.number(),
      status: z.string(),
    }),
  ),
  active_passes: z.number(),
  active_subscriptions: z.number(),
});
export default async function AdminBilling() {
  const locale = await getLocale();
  await requireUser(locale);
  const t = await getTranslations("Billing"),
    admin = await getAdminContext();
  if (!admin)
    return (
      <section className="container billing-page">
        <h1>{t("admin")}</h1>
        <p role="alert">{t("forbidden")}</p>
      </section>
    );
  const r = await admin.client.rpc("billing_admin_report"),
    p = report.safeParse(r.data);
  if (r.error || !p.success)
    return (
      <section className="container billing-page">
        <h1>{t("admin")}</h1>
        <p role="status">{t("unavailable")}</p>
      </section>
    );
  const d = p.data;
  return (
    <section className="container billing-page">
      <h1>{t("admin")}</h1>
      <p>{t("test")}</p>
      <p>{t("noFx")}</p>
      <p>
        {t("activePasses")}: {d.active_passes} · {t("activeSubscriptions")}:{" "}
        {d.active_subscriptions}
      </p>
      <h2>{t("gross")}</h2>
      {d.totals.map((x) => (
        <article key={x.provider + x.currency} className="billing-panel">
          <strong>
            {x.provider} · {x.currency}
          </strong>
          <p>
            {t("gross")}: {formatExactMoney(x.gross_minor, x.currency, locale)}{" "}
            ({x.payments})
          </p>
        </article>
      ))}
      <h2>{t("history")}</h2>
      <div className="billing-table-wrap">
        <table>
          <thead>
            <tr>
              {["receipt", "method", "price", "status"].map((k) => (
                <th key={k} scope="col">
                  {t(k as "receipt")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <code>{o.id}</code>
                </td>
                <td>{o.provider}</td>
                <td>{formatMoney(o.amount_minor, o.currency, locale)}</td>
                <td>{t(o.status as "pending")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>{t("refunds")}</h2>
      {d.refunds.map((v, i) => (
        <p key={i}>
          {v.provider} ·{" "}
          {v.amount_minor === null
            ? t("unknown")
            : formatMoney(v.amount_minor, v.currency, locale)}{" "}
          · {v.status}
        </p>
      ))}
      <h2>{t("settlements")}</h2>
      {!d.settlements.length && <p>{t("noSettlement")}</p>}
      {d.settlements.map((v, i) => (
        <article className="billing-panel" key={i}>
          <h3>
            {v.provider} · {v.currency}
          </h3>
          {(["gross", "refunds", "fees", "net"] as const).map((k, j) => (
            <p key={k}>
              {t(k)}:{" "}
              {formatMoney(
                [v.gross_minor, v.refund_minor, v.fee_minor, v.net_minor][j],
                v.currency,
                locale,
              )}
            </p>
          ))}
          <p>{v.status}</p>
        </article>
      ))}
    </section>
  );
}
