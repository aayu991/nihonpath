import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  demoLessons,
  demoBanks,
  studyCards,
  studyDecks,
  demoQuizKeys,
} from "./study-catalog";
import {
  subjects,
  type StudyLesson,
  type StudyBank,
  type StudyBody,
} from "./study-types";
import type { StudyCard, QuizPrompt } from "./types";
import { z } from "zod";
export const bodySchema = z.object({
  richText: z.array(z.object({type:z.enum(["paragraph","heading","bullet"]),text:z.string()})).optional(),
  text: z.string().optional(),
  subject: z.enum(subjects).optional(),
  explanationEn: z.string().optional(),
  explanationJa: z.string().optional(),
  examples: z
    .array(z.object({ japanese: z.string(), english: z.string() }))
    .optional(),
});
export async function getStudyCourse(level: string) {
  const client = await createClient();
  const user = await getCurrentUser();
  const course = client
    ? await client
        .from("courses")
        .select("*")
        .eq("slug", level)
        .eq("published", true)
        .maybeSingle()
    : null;
  if (!client || course?.error)
    return {
      courseId: null,
      lessons: demoLessons
        .filter((l) => l.level === level)
        .map((l) => ({ ...l, demo: true })),
      banks: demoBanks.filter((b) => b.level === level),
      demo: true,
      enrolled: false,
    };
  if (!course?.data)
    return {
      courseId: null,
      lessons: [] as StudyLesson[],
      banks: [] as StudyBank[],
      demo: false,
      enrolled: false,
    };
  const [lessons, banks, progress, enrollment] = await Promise.all([
    client!
      .from("lessons")
      .select("*")
      .eq("course_id", course.data.id)
      .eq("published", true)
      .order("position"),
    client!
      .from("question_banks")
      .select("*")
      .eq("course_id", course.data.id)
      .eq("published", true),
    user
      ? client!
          .from("lesson_progress")
          .select("lesson_id,completed_at")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
    user
      ? client!
          .from("course_enrollments")
          .select("course_id")
          .eq("user_id", user.id)
          .eq("course_id", course.data.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (lessons.error || banks.error || progress.error || enrollment.error)
    return {
      courseId: course.data.id,
      lessons: [] as StudyLesson[],
      banks: [] as StudyBank[],
      demo: false,
      error: true,
      enrolled: false,
    };
  return {
    courseId: course.data.id,
    lessons: (lessons.data ?? []).map((l) => ({
      id: l.id,
      courseId: l.course_id,
      level,
      subject: l.subject,
      title: l.title,
      position: l.position,
      body: bodySchema.safeParse(l.body).data ?? {},
      completed: !!progress.data?.find((p) => p.lesson_id === l.id)
        ?.completed_at,
    })),
    banks: (banks.data ?? []).map((b) => ({
      id: b.id,
      title: b.title,
      subject: b.subject,
      level,
    })),
    demo: false,
    enrolled: !!enrollment.data,
  };
}
export async function getStudyCards(level: string, deckId?: string) {
  const client = await createClient();
  const course = client
    ? await client
        .from("courses")
        .select("id")
        .eq("slug", level)
        .eq("published", true)
        .maybeSingle()
    : null;
  if (!client || course?.error)
    return {
      cards: studyCards.filter((c) => c.level === level),
      demo: true,
      deckId: studyDecks.find((d) => d.level === level)?.id,
    };
  if (!course?.data) return { cards: [] as StudyCard[], demo: false };
  let deckQuery = client!
    .from("flashcard_decks")
    .select("id")
    .eq("course_id", course.data.id)
    .eq("published", true);
  if (deckId) deckQuery = deckQuery.eq("id", deckId);
  const decks = await deckQuery.order("created_at");
  const cards = decks.data?.length
    ? await client!
        .from("flashcards")
        .select("*")
        .in(
          "deck_id",
          decks.data.map((d) => d.id),
        )
        .order("position")
    : null;
  if (decks.error || cards?.error)
    return { cards: [] as StudyCard[], demo: false, error: true };
  return {
    cards: (cards?.data ?? []).map((c) => ({
      id: c.id,
      level: level as StudyCard["level"],
      term: c.term,
      reading: c.reading,
      translations: z
        .object({ en: z.string(), ja: z.string() })
        .safeParse(c.translations).data ?? { en: "", ja: "" },
      example: c.example,
      exampleTranslation: c.example_translation,
      category: c.category,
    })),
    demo: false,
    deckId: decks.data?.[0]?.id,
  };
}
export async function getStudyQuiz(level: string, id: string) {
  const client = await createClient();
  const bank = client
    ? await client
        .from("question_banks")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle()
    : null;
  if (!client || bank?.error) {
    const demo = demoBanks.find((b) => b.id === id && b.level === level);
    return demo
      ? {
          bank: demo,
          questions: demoQuizKeys(id).map(({ id, prompt, options }) => ({
            id,
            prompt,
            options,
          })),
          demo: true,
        }
      : null;
  }
  if (!bank?.data) return null;
  const course = await client!
    .from("courses")
    .select("slug")
    .eq("id", bank.data.course_id)
    .eq("published", true)
    .single();
  if (course.data?.slug !== level) return null;
  const questions = await client!
    .from("questions")
    .select("*")
    .eq("bank_id", id)
    .order("position");
  const options = questions.data?.length
    ? await client!
        .from("question_options")
        .select("*")
        .in(
          "question_id",
          questions.data.map((q) => q.id),
        )
        .order("position")
    : null;
  if (questions.error || options?.error || !questions.data?.length) return null;
  return {
    bank: { id, title: bank.data.title, subject: bank.data.subject, level },
    questions: questions.data.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options:
        options?.data
          ?.filter((o) => o.question_id === q.id)
          .map((o) => ({ id: o.id, text: o.text })) ?? [],
    })) as QuizPrompt[],
    demo: false,
  };
}
export function studyBody(value: unknown): StudyBody {
  return bodySchema.safeParse(value).data ?? {};
}
