import "server-only";
import { createClient } from "@/lib/supabase/server";
import { metadataFor } from "@/lib/seo/metadata";
import { seoSchema } from "./schema";
import type { Metadata } from "next";
export function applyCmsSeo(base: Metadata, raw: unknown): Metadata {
  const parsed = seoSchema.safeParse(raw);
  if (!parsed.success) return base;
  const seo = parsed.data;
  return {
    ...base,
    ...(seo.title ? { title: seo.title } : {}),
    ...(seo.description ? { description: seo.description } : {}),
    robots: {
      index:
        typeof base.robots === "object" &&
        base.robots !== null &&
        base.robots.index === true &&
        seo.index,
      follow: true,
    },
    alternates: {
      ...base.alternates,
      ...(seo.canonical ? { canonical: seo.canonical } : {}),
    },
    openGraph: {
      ...base.openGraph,
      ...(seo.title ? { title: seo.title } : {}),
      ...(seo.description ? { description: seo.description } : {}),
      ...(seo.canonical ? { url: seo.canonical } : {}),
      ...(seo.image ? { images: [{ url: `/api/media/${seo.image}` }] } : {}),
    },
  };
}
export async function publishedCmsMetadata(
  kind: "lesson" | "course",
  id: string,
  locale: string,
  path: string,
  title: string,
) {
  const client = await createClient();
  const r = client
    ? await client.rpc("cms_public_metadata", { p_kind: kind, p_id: id })
    : null;
  const seo = seoSchema.safeParse(r?.data);
  const meta = metadataFor(path, locale, {
    title: seo.success && seo.data.title ? seo.data.title : title,
    description: seo.success
      ? seo.data.description
      : "Japanese learning on NihonPath.",
    translated: ["en", "ja"],
    indexable: seo.success && seo.data.index,
  });
  const canonical =
    seo.success && seo.data.canonical
      ? seo.data.canonical
      : `https://nihonpath.org/${locale}/${path}`;
  return {
    ...meta,
    alternates: { ...meta.alternates, canonical },
    openGraph: {
      ...meta.openGraph,
      url: canonical,
      ...(seo.success && seo.data.image
        ? {
            images: [
              {
                url: `/api/media/${seo.data.image}`,
                alt: seo.data.title || title,
              },
            ],
          }
        : {}),
    },
  };
}
