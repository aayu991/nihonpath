import { z } from "zod";
export const audiences = [
  "tourist",
  "student",
  "ssw",
  "professional",
  "resident",
] as const;
export const stages = ["before", "arriving", "settling"] as const;
export const ruleKinds = [
  "suggestion",
  "law",
  "municipal",
  "workplace",
  "culture",
] as const;
export const guidePreferencesSchema = z
  .object({
    audiences: z
      .array(z.enum(audiences))
      .min(1)
      .max(5)
      .refine((v) => new Set(v).size === v.length),
    stage: z.enum(stages),
    renting: z.boolean(),
    banking: z.boolean(),
  })
  .strict();
export type GuidePreferences = z.infer<typeof guidePreferencesSchema>;
export const defaultGuidePreferences: GuidePreferences = {
  audiences: ["tourist"],
  stage: "before",
  renting: false,
  banking: false,
};
const text = z.string().trim().min(1).max(10000),
  title = z.string().trim().min(2).max(200);
export const guideBodySchema = z.object({
  roleplays: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9-]+$/),
        title,
        title_ja: title,
        scenario_id: z.uuid(),
        dialogue: z
          .array(z.object({ speaker: title, ja: text, en: text }))
          .min(2)
          .max(12),
      }),
    )
    .max(10)
    .default([]),
  sections: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        title,
        text,
        kind: z.enum(ruleKinds),
      }),
    )
    .min(1)
    .max(20),
  steps: z.array(text).min(1).max(15),
  documents: z.array(z.object({ name: title, note: text })).max(15),
  deadline: z.string().max(1000).nullable(),
  phrases: z.array(z.object({ ja: text, en: text })).max(10),
  dialogue: z.array(z.object({ speaker: title, ja: text, en: text })).max(10),
});
export type GuideBody = z.infer<typeof guideBodySchema>;
export const categorySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  title_ja: z.string(),
  icon: z.string(),
  position: z.number(),
});
export const sourceSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  url: z.url(),
  jurisdiction: z.string(),
  publication_date: z.string().nullable(),
  reviewed_at: z.string(),
  verified_at: z.string().nullable(),
  review_status: z.string(),
  published: z.boolean(),
});
export const articleSchema = z.object({
  format: z.enum(["guide", "lesson"]).default("guide"),
  id: z.uuid(),
  slug: z.string(),
  category_id: z.uuid(),
  title,
  summary: text,
  content: guideBodySchema,
  audiences: z.array(z.enum(audiences)),
  stages: z.array(z.enum(stages)),
  risk: z.enum(["general", "administrative", "legal", "safety"]),
  deck_id: z.uuid().nullable(),
  bank_id: z.uuid().nullable(),
  lesson_ids: z.array(z.uuid()),
  ai_scenario_id: z.uuid().nullable(),
  source_ids: z.array(z.uuid()),
  last_reviewed_at: z.string().nullable(),
  version: z.number(),
  review_status: z.string(),
  published: z.boolean(),
  outdated: z.boolean(),
  updated_at: z.string(),
});
export const translationSchema = z.object({
  id: z.uuid(),
  article_id: z.uuid(),
  locale: z.enum(["ja", "ne", "hi"]),
  title,
  summary: text,
  content: guideBodySchema,
  review_status: z.string(),
  updated_at: z.string(),
});
export const templateSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  title_ja: z.string(),
  guide_category_id: z.uuid().nullable(),
  audiences: z.array(z.enum(audiences)),
  stages: z.array(z.enum(stages)),
  source_id: z.uuid().nullable(),
  review_status: z.string(),
  published: z.boolean(),
  updated_at: z.string(),
});
export const itemSchema = z.object({
  id: z.uuid(),
  template_id: z.uuid(),
  title: z.string(),
  title_ja: z.string(),
  note: z.string(),
  note_ja: z.string(),
  kind: z.enum(ruleKinds),
  circumstance: z.enum(["all", "renting", "banking"]),
  audiences: z.array(z.enum(audiences)),
  position: z.number(),
  guide_id: z.uuid().nullable(),
  version: z.number().default(1),
});
export const guideCatalogSchema = z.object({
  categories: z.array(categorySchema),
  articles: z.array(articleSchema),
  translations: z.array(translationSchema),
  sources: z.array(sourceSchema),
  templates: z.array(templateSchema),
  items: z.array(itemSchema),
});
export type GuideCatalog = z.infer<typeof guideCatalogSchema>;
export type GuideArticle = z.infer<typeof articleSchema>;
export type GuideCategory = z.infer<typeof categorySchema>;
export type GuideSource = z.infer<typeof sourceSchema>;
export type ChecklistItem = z.infer<typeof itemSchema>;
export type ChecklistProgress = {
  item_id: string;
  completed: boolean;
  notes: string;
  due_date: string | null;
  item_version: number;
  updated_at: string;
};
export function relevantArticles(
  catalog: GuideCatalog,
  prefs: GuidePreferences,
) {
  return catalog.articles.filter(
    (a) =>
      a.audiences.some((g) => prefs.audiences.includes(g)) &&
      a.stages.includes(prefs.stage),
  );
}
export function relevantItems(catalog: GuideCatalog, prefs: GuidePreferences) {
  const templates = catalog.templates.filter(
    (t) =>
      t.audiences.some((g) => prefs.audiences.includes(g)) &&
      t.stages.includes(prefs.stage),
  );
  return catalog.items.filter(
    (i) =>
      templates.some((t) => t.id === i.template_id) &&
      i.audiences.some((g) => prefs.audiences.includes(g)) &&
      (i.circumstance === "all" || prefs[i.circumstance]),
  );
}
export const guideKinds = [
  "category",
  "article",
  "translation",
  "source",
  "template",
  "item",
] as const;
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
export const officialGuideUrl = z.url().refine((value) => {
  const u = new URL(value);
  return (
    u.protocol === "https:" &&
    !u.username &&
    !u.password &&
    !u.port &&
    [
      "www.moj.go.jp",
      "www.studyinjapan.go.jp",
      "www.japan.travel",
      "www.jnto.go.jp",
      "www.mhlw.go.jp",
      "www.mofa.go.jp",
      "www.npa.go.jp",
      "www.jma.go.jp",
    ].includes(u.hostname)
  );
});
export const guideDraftSchemas = {
  category: categorySchema.omit({ id: true }).extend({ slug }),
  article: articleSchema
    .omit({
      id: true,
      last_reviewed_at: true,
      version: true,
      review_status: true,
      published: true,
      outdated: true,
      updated_at: true,
    })
    .extend({ slug }),
  translation: translationSchema.omit({
    id: true,
    review_status: true,
    updated_at: true,
  }),
  source: z.object({
    title,
    url: officialGuideUrl,
    summary: text,
    summary_ja: text,
    jurisdiction: title,
    publication_date: z.iso.date().nullable(),
    verified_at: z.iso.date().nullable(),
  }),
  template: templateSchema.omit({
    id: true,
    review_status: true,
    published: true,
    updated_at: true,
  }),
  item: itemSchema.omit({ id: true, version: true }),
};
export const progressSchema = z
  .object({
    itemId: z.uuid(),
    completed: z.boolean(),
    notes: z.string().max(2000),
    dueDate: z.iso.date().nullable(),
  })
  .strict();
