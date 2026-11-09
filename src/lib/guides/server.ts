import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { guidePreview, guideCards, guideQuizKeys } from "./catalog";
import {
  guideCatalogSchema,
  guidePreferencesSchema,
  defaultGuidePreferences,
  type ChecklistProgress,
} from "./schema";
import type { StudyCard, QuizPrompt } from "@/lib/learning/types";
export const loadGuides = cache(async () => {
  // Unreviewed legal/administrative drafts are a local development preview only.
  const preview =
    process.env.NODE_ENV === "production"
      ? {
          ...guidePreview,
          categories: [],
          articles: [],
          translations: [],
          sources: [],
          templates: [],
          items: [],
        }
      : guidePreview;
  const client = await createClient();
  if (!client) return { catalog: preview, demo: true };
  const response = await client.rpc("guide_catalog");
  const parsed = guideCatalogSchema.safeParse(response.data);
  return response.error || !parsed.success
    ? { catalog: preview, demo: true }
    : { catalog: parsed.data, demo: false };
});
export async function guideUser() {
  const user = await getCurrentUser(),
    client = await createClient();
  if (!user || !client)
    return {
      member: false,
      preferences: defaultGuidePreferences,
      progress: [] as ChecklistProgress[],
      error: false,
      hasPlan: false,
    };
  const [plan, progress] = await Promise.all([
    client
      .from("user_checklists")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    client.from("user_checklist_progress").select("*").eq("user_id", user.id),
  ]);
  return {
    member: true,
    preferences:
      guidePreferencesSchema.safeParse(plan.data).data ??
      defaultGuidePreferences,
    progress: progress.data ?? [],
    error: !!(plan.error || progress.error),
    hasPlan: !!plan.data,
  };
}
export async function guideLearning(articleId: string) {
  const { catalog, demo } = await loadGuides(),
    a = catalog.articles.find((a) => a.id === articleId);
  let cards: StudyCard[] = [],
    questions: QuizPrompt[] = [];
  if (!a)
    return {
      cards,
      questions,
      demo,
      lessons: [] as { id: string; title: string }[],
    };
  if (demo)
    return {
      cards: a.deck_id ? guideCards(a.deck_id) : [],
      questions: a.bank_id
        ? guideQuizKeys(a.bank_id).map(({ id, prompt, options }) => ({
            id,
            prompt,
            options,
          }))
        : [],
      demo,
      lessons: [] as { id: string; title: string }[],
    };
  const client = await createClient();
  if (!client)
    return {
      cards,
      questions,
      demo,
      lessons: [] as { id: string; title: string }[],
    };
  if (a.deck_id) {
    const deck = await client
      .from("flashcard_decks")
      .select("id")
      .eq("id", a.deck_id)
      .eq("published", true)
      .maybeSingle();
    if (deck.data) {
      const rows = await client
        .from("flashcards")
        .select("*")
        .eq("deck_id", a.deck_id)
        .order("position");
      cards = (rows.data ?? []).map((c) => ({
        id: c.id,
        term: c.term,
        reading: c.reading,
        translations: c.translations as StudyCard["translations"],
        example: c.example,
        exampleTranslation: c.example_translation,
        category: c.category,
        level: "japan-life",
        programLabel: "Japan Life Guide",
      }));
    }
  }
  if (a.bank_id) {
    const bank = await client
      .from("question_banks")
      .select("id")
      .eq("id", a.bank_id)
      .eq("published", true)
      .maybeSingle();
    if (bank.data) {
      const rows = await client
        .from("questions")
        .select("id,prompt")
        .eq("bank_id", a.bank_id)
        .order("position");
      const ids = rows.data?.map((q) => q.id) ?? [];
      if (ids.length) {
        const options = await client
          .from("question_options")
          .select("id,question_id,text")
          .in("question_id", ids)
          .order("position");
        questions = (rows.data ?? []).map((q) => ({
          ...q,
          options: (options.data ?? [])
            .filter((o) => o.question_id === q.id)
            .map(({ id, text }) => ({ id, text })),
        }));
      }
    }
  }
  const lessons = a.lesson_ids.length
    ? await client
        .from("lessons")
        .select("id,title")
        .in("id", a.lesson_ids)
        .eq("published", true)
    : { data: [] };
  return { cards, questions, demo, lessons: lessons.data ?? [] };
}
