import { getCmsContext } from "@/lib/cms/server";
import { cmsKinds, cmsRow } from "@/lib/cms/schema";
import { Link } from "@/i18n/navigation";
import { z } from "zod";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const ctx = await getCmsContext();
  if (!ctx) return null;
  const results = q
    ? await Promise.all(
        cmsKinds.map(async (kind) => ({
          kind,
          result: await ctx.client.rpc("cms_catalog", {
            p_kind: kind,
            p_query: q,
          }),
        })),
      )
    : [];
  return (
    <section>
      <h1>Search content</h1>
      <p>Results for “{q}”</p>
      {!q && <p>Enter a title in the search field to begin.</p>}
      {results.map(({ kind, result }) => {
        const rows = z.array(cmsRow).safeParse(result.data);
        return (
          <section className="cms-panel" key={kind}>
            <h2>{kind}</h2>
            {!rows.success ? (
              <p role="alert">Search unavailable.</p>
            ) : rows.data.length ? (
              rows.data.map((row) => (
                <Link
                  className="cms-list-row"
                  key={row.id}
                  href={`/admin/editor/${kind}?id=${row.id}`}
                >
                  <span>{row.title}</span>
                  <span>{row.state}</span>
                </Link>
              ))
            ) : (
              <p>No matches.</p>
            )}
          </section>
        );
      })}
    </section>
  );
}
