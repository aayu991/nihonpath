import type { MetadataRoute } from "next";
import { environmentReport } from "@/lib/launch/environment";
import { publicSeo } from "@/lib/seo/catalog";
import { loadGuides } from "@/lib/guides/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = environmentReport();
  if (!c.indexing) return [];
  const guides = await loadGuides();
  const client = await createClient();
  const courseRows = client
    ? await client.from("courses").select("slug").eq("published", true)
    : null;
  const levels = new Set(courseRows?.data?.map((row) => row.slug) ?? []);
  const entries: MetadataRoute.Sitemap = Object.entries(publicSeo)
    .filter(
      ([p, v]) =>
        v.indexable &&
        (p !== "japan-guide" || !guides.demo) &&
        (!/^courses\/n[1-5]$/.test(p) || levels.has(p.split("/")[1])),
    )
    .flatMap(([path, v]) =>
      v.locales.map((locale) => ({
        url: `${c.origin}/${locale}${path ? "/" + path : ""}`,
        alternates: {
          languages: Object.fromEntries(
            v.locales.map((l) => [
              l,
              `${c.origin}/${l}${path ? "/" + path : ""}`,
            ]),
          ),
        },
      })),
    );
  if (!guides.demo)
    for (const a of guides.catalog.articles) {
      const langs = [
        ...new Set([
          "en",
          ...guides.catalog.translations
            .filter((t) => t.article_id === a.id)
            .map((t) => t.locale),
        ]),
      ];
      for (const locale of langs)
        entries.push({
          url: `${c.origin}/${locale}/japan-guide/${a.slug}`,
          alternates: {
            languages: Object.fromEntries(
              langs.map((l) => [l, `${c.origin}/${l}/japan-guide/${a.slug}`]),
            ),
          },
        });
    }
  const managed = client ? await client.rpc("cms_content_sitemap") : null;
  const published = z
    .array(
      z.object({
        path: z.string(),
        updated_at: z.string(),
        indexable: z.boolean(),
        locales: z.array(z.enum(["en", "ja", "ne", "hi"])),
      }),
    )
    .safeParse(managed?.data);
  const omitted = new Set(
    published.success
      ? published.data
          .filter((row) => !row.indexable)
          .flatMap((row) =>
            row.locales.map((locale) => `${c.origin}/${locale}/${row.path}`),
          )
      : [],
  );
  const urls = new Set(entries.map((e) => e.url));
  if (published.success)
    for (const row of published.data.filter((row) => row.indexable))
      for (const locale of row.locales) {
        const url = `${c.origin}/${locale}/${row.path}`;
        if (!urls.has(url)) {
          entries.push({
            url,
            lastModified: row.updated_at,
            alternates: {
              languages: Object.fromEntries(
                row.locales.map((l) => [l, `${c.origin}/${l}/${row.path}`]),
              ),
            },
          });
          urls.add(url);
        }
      }
  return entries.filter((entry) => !omitted.has(entry.url));
}
