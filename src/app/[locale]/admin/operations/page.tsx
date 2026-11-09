import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { ReviewSupport } from "@/components/launch/forms";
import { z } from "zod";
export const metadata = { robots: { index: false, follow: false } };
const rows = z.array(z.record(z.string(), z.union([z.string(), z.number()])));
const schema = z.object({
  support: z.array(
    z.object({
      id: z.uuid(),
      category: z.string(),
      subject: z.string(),
      body: z.string(),
      status: z.string(),
      updated_at: z.string(),
    }),
  ),
  analytics: rows,
  operations: rows,
  email: rows,
  vitals: rows,
});
export default async function Operations() {
  await requireUser(await getLocale());
  const t = await getTranslations("Launch"),
    a = await getAdminContext();
  if (!a)
    return (
      <section className="container launch-page">
        <h1>{t("admin")}</h1>
        <p role="alert">{t("forbidden")}</p>
      </section>
    );
  const r = await a.client.rpc("launch_admin_snapshot"),
    p = schema.safeParse(r.data);
  return (
    <section className="container launch-page">
      <h1>{t("admin")}</h1>
      {!p.success || r.error ? (
        <p role="status">{t("unavailable")}</p>
      ) : (
        <>
          <h2>{t("contact")}</h2>
          {!p.data.support.length && <p>{t("noData")}</p>}
          {p.data.support.map((s) => (
            <article className="launch-card" key={s.id}>
              <h3>{s.subject}</h3>
              <p className="support-body">{s.body}</p>
              <ReviewSupport
                id={s.id}
                status={s.status}
                expected={s.updated_at}
              />
            </article>
          ))}
          {(["analytics", "operations", "email", "vitals"] as const).map(
            (key, i) => (
              <section key={key}>
                <h2>
                  {t(
                    (
                      [
                        "analyticsReport",
                        "monitoring",
                        "emails",
                        "vitals",
                      ] as const
                    )[i],
                  )}
                </h2>
                {!p.data[key].length ? (
                  <p>{t("noData")}</p>
                ) : (
                  <div className="billing-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(p.data[key][0]).map((k) => (
                            <th scope="col" key={k}>
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {p.data[key].map((row, j) => (
                          <tr key={j}>
                            {Object.entries(row).map(([k, v]) => (
                              <td key={k}>{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ),
          )}
        </>
      )}
    </section>
  );
}
