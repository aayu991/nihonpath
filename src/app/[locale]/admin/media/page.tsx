import { getCmsContext } from "@/lib/cms/server";
import { MediaLibrary } from "@/components/cms/media-library";
import { z } from "zod";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const ctx = await getCmsContext();
  if (!ctx) return null;
  const s = await searchParams;
  const r = await ctx.client.rpc("cms_media_list", {
    p_query: (s.q ?? "").slice(0, 100),
    p_type: ["image", "audio", "application"].includes(s.type ?? "")
      ? s.type
      : "",
  });
  const rows = z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        filename: z.string(),
        mime_type: z.string(),
        byte_size: z.number(),
        status: z.string(),
        references: z.number(),
        replaces_id: z.string().nullable(),
      }),
    )
    .safeParse(r.data);
  return (
    <>
      <header className="cms-page-heading">
        <div>
          <p className="eyebrow">EDUCATIONAL ASSETS</p>
          <h1>Media library</h1>
          <p>Private uploads, human review and controlled publication.</p>
        </div>
      </header>
      <form className="cms-filters">
        <label>
          Search
          <input name="q" maxLength={100} defaultValue={s.q} />
        </label>
        <label>
          Type
          <select name="type" defaultValue={s.type ?? ""}>
            <option value="">All media</option>
            <option value="image">Images</option>
            <option value="audio">Listening audio</option>
            <option value="application">PDF documents</option>
          </select>
        </label>
        <button type="submit" className="cms-primary">
          Filter
        </button>
      </form>
      {rows.success ? (
        <MediaLibrary
          rows={rows.data}
          canEdit={ctx.permissions.edit}
          canPublish={ctx.permissions.publish}
          configured={!!process.env.SUPABASE_SECRET_KEY}
        />
      ) : (
        <p role="alert">
          Media library unavailable. Check the CMS media migration and
          connection.
        </p>
      )}
    </>
  );
}
