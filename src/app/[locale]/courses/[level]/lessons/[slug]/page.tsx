import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Lesson from "@/app/[locale]/lessons/[id]/page";
import { publishedCmsMetadata } from "@/lib/cms/seo";
import { z } from "zod";
async function resolve(level: string, slug: string) {
  const client = await createClient();
  if (!client) return null;
  const r = await client.rpc("cms_lesson_slug", {
    p_course: level,
    p_slug: slug,
  });
  return !r.error && z.uuid().safeParse(r.data).success ? r.data : null;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string; slug: string; locale: string }>;
}) {
  const { level, slug, locale } = await params;
  const id = await resolve(level, slug);
  if (!id) return { robots: { index: false, follow: false } };
  const client = await createClient();
  const row = await client
    ?.from("lessons")
    .select("title")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  return publishedCmsMetadata(
    "lesson",
    id,
    locale,
    `courses/${level}/lessons/${slug}`,
    row?.data?.title ?? "Japanese lesson",
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ level: string; slug: string }>;
}) {
  const { level, slug } = await params;
  const id = await resolve(level, slug);
  if (!id) notFound();
  return <Lesson params={Promise.resolve({ id })} />;
}
