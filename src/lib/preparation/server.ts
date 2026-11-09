import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import {
  previewSectors,
  previewScenarios,
  previewInterviews,
  referenceResources,
  prepBanks,
  preparationKeys,
  previewCards,
} from "./catalog";
import {
  scenarioSchema,
  interviewSchema,
  type Sector,
  type Scenario,
  type Interview,
  type OfficialResource,
} from "./schema";
import type { QuizPrompt, StudyCard } from "@/lib/learning/types";
export const prepCatalog = cache(async function prepCatalog(): Promise<{
  sectors: Sector[];
  demo: boolean;
  error?: boolean;
}> {
  const client = await createClient();
  const result = client
    ? await client
        .from("industry_sectors")
        .select("*")
        .eq("published", true)
        .order("title")
    : null;
  if (!client || result?.error) return { sectors: previewSectors, demo: true };
  if (!result?.data?.length) return { sectors: [], demo: false };
  const courseIds = result.data.map((s) => s.course_id);
  const [decks, banks] = await Promise.all([
    client
      .from("flashcard_decks")
      .select("id,course_id")
      .in("course_id", courseIds)
      .eq("published", true)
      .order("created_at"),
    client
      .from("question_banks")
      .select("id,course_id")
      .in("course_id", courseIds)
      .eq("prep_mode", "industry")
      .eq("published", true)
      .order("created_at"),
  ]);
  const sectors: Sector[] = result.data.map((s) => {
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      titleJa: s.title_ja,
      summary: s.summary,
      summaryJa: s.summary_ja,
      courseId: s.course_id,
      deckId: decks.data?.find((d) => d.course_id === s.course_id)?.id,
      bankId: banks.data?.find((b) => b.course_id === s.course_id)?.id,
    };
  });
  return { sectors, demo: false, error: !!decks.error || !!banks.error };
});
export async function prepResources(
  category: "jft" | "ssw",
): Promise<OfficialResource[]> {
  const client = await createClient();
  const result = client
    ? await client
        .from("official_resources")
        .select("*")
        .eq("published", true)
        .eq("category", category)
    : null;
  if (!client || result?.error)
    return referenceResources.filter((r) => r.category === category);
  return (result?.data ?? []).map((r) => ({
    id: r.id,
    category,
    sectorId: r.sector_id,
    title: r.title,
    url: r.url,
    summary: r.summary,
    summaryJa: r.summary_ja,
    reviewedAt: r.reviewed_at,
  }));
}
export async function jftBanks() {
  const client = await createClient();
  const course = client
    ? await client
        .from("courses")
        .select("id")
        .eq("slug", "jft-basic-foundation")
        .eq("published", true)
        .maybeSingle()
    : null;
  if (!client || course?.error)
    return {
      banks: prepBanks.filter(
        (b) => b.courseId === "d6010000-0000-4000-8000-000000000001",
      ),
      demo: true,
    };
  if (!course?.data) return { banks: [], demo: false };
  const data = await client
    .from("question_banks")
    .select("*")
    .eq("course_id", course.data.id)
    .eq("published", true)
    .order("title");
  return {
    banks: (data.data ?? []).map((b) => ({
      id: b.id,
      title: b.title,
      category: b.prep_category ?? "",
      mode: b.prep_mode ?? "section",
      subject: b.subject,
      courseId: b.course_id,
    })),
    demo: false,
    error: !!data.error,
  };
}
export async function prepQuiz(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const client = await createClient();
  const bank = client
    ? await client
        .from("question_banks")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .not("prep_category", "is", null)
        .maybeSingle()
    : null;
  if (!client || bank?.error) {
    const b = prepBanks.find((b) => b.id === id);
    return b
      ? {
          bank: b,
          questions: preparationKeys(id).map(({ id, prompt, options }) => ({
            id,
            prompt,
            options,
          })),
          demo: true,
        }
      : null;
  }
  if (!bank?.data) return null;
  const q = await client
    .from("questions")
    .select("id,prompt")
    .eq("bank_id", id)
    .order("position");
  const opts = q.data?.length
    ? await client
        .from("question_options")
        .select("id,text,question_id")
        .in(
          "question_id",
          q.data.map((q) => q.id),
        )
        .order("position")
    : null;
  if (q.error || opts?.error || !q.data?.length) return null;
  const questions: QuizPrompt[] = q.data.map((q) => ({
    ...q,
    options: (opts?.data ?? [])
      .filter((o) => o.question_id === q.id)
      .map(({ id, text }) => ({ id, text })),
  }));
  return {
    bank: {
      id,
      title: bank.data.title,
      category: bank.data.prep_category ?? "",
      mode: bank.data.prep_mode ?? "",
      subject: bank.data.subject,
      courseId: bank.data.course_id,
    },
    questions,
    demo: false,
  };
}
export async function sectorContent(slug: string) {
  const catalog = await prepCatalog(),
    sector = catalog.sectors.find((s) => s.slug === slug);
  if (!sector) return null;
  if (catalog.demo)
    return {
      sector,
      demo: true,
      cards: previewCards(slug),
      scenarios: previewScenarios.filter((s) => s.sectorId === sector.id),
    };
  const client = await createClient();
  const [cards, scenes] = await Promise.all([
    sector.deckId
      ? client!
          .from("flashcards")
          .select("*")
          .eq("deck_id", sector.deckId)
          .order("position")
      : Promise.resolve({ data: [], error: null }),
    client!
      .from("workplace_scenarios")
      .select("*")
      .eq("sector_id", sector.id)
      .eq("published", true),
  ]);
  const studyCards: StudyCard[] = (cards.data ?? []).map((c) => ({
    id: c.id,
    level: "workplace",
    programLabel: sector.title,
    term: c.term,
    reading: c.reading,
    translations: z
      .object({ en: z.string(), ja: z.string() })
      .parse(c.translations),
    example: c.example,
    exampleTranslation: c.example_translation,
    category: c.category,
  }));
  const scenarios: Scenario[] = (scenes.data ?? []).flatMap((s) => {
    const p = scenarioSchema.safeParse({
      id: s.id,
      sectorId: s.sector_id,
      lessonId: s.lesson_id,
      bankId: s.bank_id,
      title: s.title,
      situation: s.situation,
      situationJa: s.situation_ja,
      dialogue: s.dialogue,
    });
    return p.success ? [p.data] : [];
  });
  return {
    sector,
    demo: false,
    cards: studyCards,
    scenarios,
    error: !!catalog.error || !!cards.error || !!scenes.error,
  };
}
export async function allWorkplaceScenarios() {
  const catalog = await prepCatalog();
  if (catalog.demo)
    return { scenarios: previewScenarios, demo: true, error: false };
  const client = await createClient();
  const result = await client
    ?.from("workplace_scenarios")
    .select("*")
    .eq("published", true)
    .order("created_at")
    .limit(60);
  const scenarios: Scenario[] = (result?.data ?? []).flatMap((s) => {
    const parsed = scenarioSchema.safeParse({
      id: s.id,
      sectorId: s.sector_id,
      lessonId: s.lesson_id,
      bankId: s.bank_id,
      title: s.title,
      situation: s.situation,
      situationJa: s.situation_ja,
      dialogue: s.dialogue,
    });
    return parsed.success ? [parsed.data] : [];
  });
  return { scenarios, demo: false, error: !!catalog.error || !!result?.error };
}
export async function interviews() {
  const client = await createClient();
  const result = client
    ? await client
        .from("interview_questions")
        .select("*")
        .eq("published", true)
        .order("created_at")
    : null;
  if (!client || result?.error)
    return {
      questions: previewInterviews,
      demo: true,
      completed: [] as string[],
    };
  const user = await getCurrentUser();
  const progress = user
    ? await client
        .from("lesson_progress")
        .select("lesson_id")
        .not("completed_at", "is", null)
    : null;
  const questions: Interview[] = (result?.data ?? []).flatMap((q) => {
    const p = interviewSchema.safeParse({
      id: q.id,
      lessonId: q.lesson_id,
      sectorId: q.sector_id,
      topic: q.topic,
      prompt: q.prompt,
      answer: q.suggested_answer,
      translation: q.translation,
      explanation: q.explanation,
      explanationJa: q.explanation_ja,
    });
    return p.success ? [p.data] : [];
  });
  return {
    questions,
    demo: false,
    completed: (progress?.data ?? []).map((p) => p.lesson_id),
    error: !!progress?.error,
  };
}
