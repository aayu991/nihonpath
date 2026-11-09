import { getCmsContext } from "@/lib/cms/server";
import {
  cmsRow,
  type CmsKind,
  cmsWorkspace,
  referenceSchema,
} from "@/lib/cms/schema";
import { Link } from "@/i18n/navigation";
import { CmsEditor } from "./editor";
import { z } from "zod";
import { CsvImport } from "./csv-import";
import { TranslationOverview } from "./translations";
export type CmsSearch = Promise<{
  id?: string;
  q?: string;
  state?: string;
  page?: string;
  new?: string;
  target?: string;
  language?: string;
}>;
export async function CmsCatalogPage({
  kind,
  title,
  searchParams,
}: {
  kind: CmsKind;
  title: string;
  searchParams: CmsSearch;
}) {
  const ctx = await getCmsContext();
  if (!ctx) return null;
  const s = await searchParams;
  const page = Math.min(2500, Math.max(0, Number(s.page) || 0));
  if (s.id && !z.uuid().safeParse(s.id).success)
    return <p role="alert">Invalid content ID.</p>;
  const [r, refs, w, h] = await Promise.all([
    ctx.client.rpc("cms_catalog", {
      p_kind: kind,
      p_query: (s.q ?? "").slice(0, 100),
      p_state: s.state ?? "",
      p_offset: page * 40,
    }),
    ctx.client.rpc("cms_references"),
    s.id ? ctx.client.rpc("cms_document", { p_kind: kind, p_id: s.id }) : null,
    s.id ? ctx.client.rpc("cms_history", { p_kind: kind, p_id: s.id }) : null,
  ]);
  const rows = z.array(cmsRow).safeParse(r.data),
    references = referenceSchema.safeParse(refs.data),
    workspace = w ? cmsWorkspace.safeParse(w.data) : null;
  if (
    r.error ||
    refs.error ||
    w?.error ||
    !rows.success ||
    !references.success ||
    (workspace && !workspace.success)
  )
    return (
      <section>
        <h1>{title}</h1>
        <p role="alert">
          Content is unavailable. Check the CMS migration and database
          connection.
        </p>
      </section>
    );
  return (
    <>
      <header className="cms-page-heading">
        <div>
          <p className="eyebrow">CONTENT LIBRARY</p>
          <h1>{title}</h1>
          <p>Separate drafts, human review and controlled publication.</p>
        </div>
        {ctx.permissions.edit && (
          <Link href={`/admin/editor/${kind}?new=1`} className="cms-primary">
            + Create {kind === "bank" ? "question bank" : kind}
          </Link>
        )}
      </header>
      {kind === "vocabulary" && ctx.permissions.edit && (
        <CsvImport courses={references.data.courses} />
      )}
      {(kind.startsWith("guide_") || kind === "exam") && (
        <details className="cms-panel">
          <summary>Available reference IDs for the editorial document</summary>
          <p>
            Select an existing reference below, then copy its ID into the
            document. Sources must be verified and published before guide
            publication.
          </p>
          {[
            {
              name: "Guide categories",
              rows: references.data.categories ?? [],
            },
            {
              name: "Official guide sources",
              rows: references.data.sources ?? [],
            },
            { name: "Question banks", rows: references.data.banks ?? [] },
          ].map((group) => (
            <section key={group.name}>
              <h2>{group.name}</h2>
              {group.rows.map((row) => (
                <div className="cms-list-row" key={row.id}>
                  <span>{row.title}</span>
                  <code className="cms-reference-id">{row.id}</code>
                </div>
              ))}
            </section>
          ))}
        </details>
      )}
      {s.id || s.new ? (
        <CmsEditor
          key={
            workspace?.success
              ? `${s.id}:${workspace.data.version}`
              : `new-${kind}`
          }
          kind={kind}
          workspace={workspace?.success ? workspace.data : null}
          references={references.data}
          permissions={ctx.permissions}
          history={h?.data ?? []}
          preset={
            kind === "translation" && z.uuid().safeParse(s.target).success
              ? {
                  target_id: s.target!,
                  locale: ["en", "ja", "ne", "hi"].includes(s.language ?? "")
                    ? s.language!
                    : "ja",
                }
              : undefined
          }
        />
      ) : (
        <>
          <form className="cms-filters">
            <label>
              Search
              <input
                name="q"
                defaultValue={s.q}
                maxLength={100}
                placeholder={`Search ${title.toLowerCase()}…`}
              />
            </label>
            <label>
              Status
              <select name="state" defaultValue={s.state ?? ""}>
                <option value="">All statuses</option>
                {[
                  "draft",
                  "in_review",
                  "approved",
                  "published",
                  "archived",
                ].map((v) => (
                  <option key={v} value={v}>
                    {v.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="cms-primary">
              Filter
            </button>
          </form>
          <div className="cms-table-wrap">
            <table>
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Content</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated (UTC)</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.title ?? kind}</strong>
                      <small>{row.id.slice(0, 8)}</small>
                    </td>
                    <td>
                      <span className={`cms-badge cms-${row.state}`}>
                        {row.state.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <time dateTime={row.updated_at}>
                        {new Date(row.updated_at).toLocaleDateString("en-GB", {
                          timeZone: "UTC",
                        })}
                      </time>
                    </td>
                    <td>
                      <Link href={`/admin/editor/${kind}?id=${row.id}`}>
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.data.length && (
              <p className="cms-empty">
                No matching content. Create a draft to begin.
              </p>
            )}
          </div>
          <nav className="cms-pagination" aria-label="Content pages">
            {page > 0 && (
              <Link
                href={`?page=${page - 1}&q=${encodeURIComponent(s.q ?? "")}&state=${encodeURIComponent(s.state ?? "")}`}
              >
                ← Previous
              </Link>
            )}
            {rows.data.length === 40 && (
              <Link
                href={`?page=${page + 1}&q=${encodeURIComponent(s.q ?? "")}&state=${encodeURIComponent(s.state ?? "")}`}
              >
                Next →
              </Link>
            )}
          </nav>
        </>
      )}
      {kind === "lesson" && s.id && <TranslationOverview id={s.id} />}
    </>
  );
}
