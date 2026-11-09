import { getCmsContext } from "@/lib/cms/server";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
export async function TranslationOverview({ id }: { id: string }) {
  const ctx = await getCmsContext();
  if (!ctx) return null;
  const r = await ctx.client.rpc("cms_translation_overview", { p_lesson: id });
  const p = z
    .array(
      z.object({
        locale: z.string(),
        id: z.string().nullable(),
        status: z.string(),
        published: z.boolean(),
      }),
    )
    .safeParse(r.data);
  return (
    <section className="cms-panel">
      <h2>Lesson translations</h2>
      <p>
        Incomplete translations stay private. Each language has its own review
        workflow.
      </p>
      {p.success ? (
        p.data.map((row) => (
          <div className="cms-list-row" key={row.locale}>
            <strong>
              {
                (
                  {
                    en: "English",
                    ja: "Japanese",
                    ne: "Nepali",
                    hi: "Hindi",
                  } as Record<string, string>
                )[row.locale]
              }
            </strong>
            <span>
              {row.status.replaceAll("_", " ")}
              {row.published && row.status !== "published"
                ? " · earlier version published"
                : ""}
            </span>
            <Link
              href={
                row.id
                  ? `/admin/editor/translation?id=${row.id}`
                  : `/admin/editor/translation?new=1&target=${id}&language=${row.locale}`
              }
            >
              Open translation →
            </Link>
          </div>
        ))
      ) : (
        <p role="alert">Translation status unavailable.</p>
      )}
    </section>
  );
}
