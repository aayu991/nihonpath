import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import {
  GuideAdminEditor,
  type GuideAdminRow,
} from "@/components/guides/admin-editor";
export default async function GuideAdmin({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const admin = await getAdminContext(),
    t = await getTranslations("Platform");
  if (!admin)
    return (
      <section className="container guide-page-heading">
        <h1>Japan Guide studio</h1>
        <p role="alert">{t("accessDenied")}</p>
      </section>
    );
  const c = admin.client,
    [
      categories,
      articles,
      translations,
      sources,
      templates,
      items,
      links,
      revisions,
      reviews,
      feedback,
    ] = await Promise.all([
      c.from("guide_categories").select("*").order("position"),
      c
        .from("guide_articles")
        .select("*")
        .order("updated_at", { ascending: false }),
      c
        .from("guide_translations")
        .select("*")
        .order("updated_at", { ascending: false }),
      c.from("official_resources").select("*").eq("category", "guide"),
      c
        .from("visa_checklist_templates")
        .select("*")
        .not("guide_category_id", "is", null),
      c.from("visa_checklist_items").select("*"),
      c.from("guide_source_links").select("*"),
      c
        .from("article_revisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      c
        .from("article_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      c
        .from("article_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
  if (
    [
      categories,
      articles,
      translations,
      sources,
      templates,
      items,
      links,
      revisions,
      reviews,
      feedback,
    ].some((r) => r.error)
  )
    return (
      <section className="container guide-page-heading">
        <h1>Japan Guide studio</h1>
        <p role="alert">
          Apply the Task 8 migration before editing. No content has been saved
          by this page.
        </p>
      </section>
    );
  const library = {
    category: categories.data ?? [],
    article: (articles.data ?? []).map((a) => ({
      ...a,
      source_ids: (links.data ?? [])
        .filter((l) => l.article_id === a.id)
        .map((l) => l.source_id),
    })),
    translation: translations.data ?? [],
    source: sources.data ?? [],
    template: templates.data ?? [],
    item: (items.data ?? []).filter((i) =>
      templates.data?.some((t) => t.id === i.template_id),
    ),
  };
  return (
    <section className="container guide-admin-page">
      <p className="eyebrow">NIHONPATH / EDITORIAL</p>
      <h1>Japan Guide studio</h1>
      <GuideAdminEditor
        library={
          library as unknown as Record<keyof typeof library, GuideAdminRow[]>
        }
        revisions={(revisions.data ?? []) as unknown as GuideAdminRow[]}
        reviews={(reviews.data ?? []) as unknown as GuideAdminRow[]}
        feedback={(feedback.data ?? []) as unknown as GuideAdminRow[]}
      />
    </section>
  );
}
