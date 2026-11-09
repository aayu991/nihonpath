import { getCmsContext } from "@/lib/cms/server";
import { cmsKinds, cmsRow } from "@/lib/cms/schema";
import { Link } from "@/i18n/navigation";
import { z } from "zod";
export default async function Page() {
  const ctx = await getCmsContext();
  if (!ctx) return null;
  const all = await Promise.all(
    cmsKinds.map(async (kind) => ({
      kind,
      result: await ctx.client.rpc("cms_catalog", {
        p_kind: kind,
        p_state: "in_review",
      }),
    })),
  );
  return (
    <section>
      <h1>Review queue</h1>
      <p>
        Review the saved revision and leave meaningful notes. Authors cannot
        approve their own revision.
      </p>
      {all.map(({ kind, result }) => {
        const rows = z.array(cmsRow).safeParse(result.data);
        return (
          <section className="cms-panel" key={kind}>
            <h2>{kind}</h2>
            {!rows.success ? (
              <p role="alert">Queue unavailable.</p>
            ) : rows.data.length ? (
              rows.data.map((row) => (
                <Link
                  className="cms-list-row"
                  key={row.id}
                  href={`/admin/editor/${kind}?id=${row.id}`}
                >
                  {row.title ?? kind} →
                </Link>
              ))
            ) : (
              <p>No pending reviews.</p>
            )}
          </section>
        );
      })}
    </section>
  );
}
