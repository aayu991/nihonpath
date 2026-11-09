"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { bankId } from "@/lib/learning/content";
import { demoQuizKeys } from "@/lib/learning/study-catalog";
import { preparationKeys } from "@/lib/preparation/catalog";
import { guideQuizKeys } from "@/lib/guides/catalog";
import { quizKeys } from "@/lib/learning/quiz-server";
import { gradeQuiz } from "@/lib/learning/scoring";
import type { ActionResult, QuizResult } from "@/lib/learning/types";
const reviewSchema = z.object({
  id: z.uuid(),
  cardId: z.uuid(),
  rating: z.enum(["known", "again"]),
});
const quizSchema = z.object({
  bankId: z.uuid().optional(),
  attemptId: z.uuid(),
  answers: z
    .array(z.object({ questionId: z.uuid(), optionId: z.uuid() }))
    .min(1)
    .max(100),
  member: z.boolean(),
  demo: z.boolean().optional(),
});
export async function saveReview(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "session" };
  const client = await createClient();
  if (!client) return { ok: false, error: "network" };
  try {
    const { data, error } = await client.rpc("record_review", {
      p_id: parsed.data.id,
      p_card: parsed.data.cardId,
      p_rating: parsed.data.rating,
    });
    if (error || !data) return { ok: false, error: "network" };
    revalidatePath("/", "layout");
    return { ok: true, data: { id: data } };
  } catch {
    return { ok: false, error: "network" };
  }
}
export async function submitQuiz(
  input: unknown,
): Promise<ActionResult<QuizResult>> {
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { attemptId, answers, member } = parsed.data;
  if (parsed.data.demo) {
    if (process.env.NODE_ENV === "production")
      return { ok: false, error: "invalid" };
    if (member || !parsed.data.bankId) return { ok: false, error: "invalid" };
    const keys = guideQuizKeys(parsed.data.bankId);
    if (!keys.length) return { ok: false, error: "invalid" };
    try {
      return { ok: true, data: gradeQuiz(keys, answers, attemptId) };
    } catch {
      return { ok: false, error: "invalid" };
    }
  }
  if (parsed.data.bankId) {
    const selectedBank = parsed.data.bankId;
    const user = await getCurrentUser();
    if (member && !user) return { ok: false, error: "session" };
    const client = await createClient();
    const bank = client
      ? await client
          .from("question_banks")
          .select("id")
          .eq("id", selectedBank)
          .eq("published", true)
          .maybeSingle()
      : null;
    if (!client || bank?.error) {
      if (member) return { ok: false, error: "network" };
      try {
        const studyKeys = demoQuizKeys(selectedBank);
        const keys = studyKeys.length
          ? studyKeys
          : preparationKeys(selectedBank);
        if (!keys.length) return { ok: false, error: "invalid" };
        return { ok: true, data: gradeQuiz(keys, answers, attemptId) };
      } catch {
        return { ok: false, error: "invalid" };
      }
    }
    if (!bank?.data) return { ok: false, error: "invalid" };
    const response = user
      ? await client.rpc("submit_quiz", {
          p_id: attemptId,
          p_bank: selectedBank,
          p_answers: answers,
        })
      : await client.rpc("practice_quiz", {
          p_bank: selectedBank,
          p_answers: answers,
        });
    const result = z
      .object({
        attemptId: z.uuid(),
        score: z.number().int().nonnegative(),
        total: z.number().int().positive(),
        saved: z.boolean(),
        answers: z.array(
          z.object({
            questionId: z.uuid(),
            selectedOptionId: z.uuid(),
            correctOptionId: z.uuid(),
            correct: z.boolean(),
            explanation: z.string(),
            japaneseExplanation: z.string(),
            translation: z.string(),
          }),
        ),
      })
      .safeParse(response.data);
    if (!response.error && result.success) {
      revalidatePath("/", "layout");
      return { ok: true, data: result.data };
    }
    return { ok: false, error: "network" };
  }
  let result: QuizResult;
  try {
    result = gradeQuiz(quizKeys, answers, attemptId);
  } catch {
    return { ok: false, error: "invalid" };
  }
  const user = await getCurrentUser();
  if (member && !user) return { ok: false, error: "session" };
  if (!user) return { ok: true, data: result };
  const client = await createClient();
  if (!client) return { ok: false, error: "network" };
  try {
    const { data, error } = await client.rpc("submit_quiz", {
      p_id: attemptId,
      p_bank: bankId,
      p_answers: answers,
    });
    if (error || !data) return { ok: false, error: "network" };
    const value = z
      .object({
        attemptId: z.uuid(),
        score: z.number().int().min(0).max(20),
        total: z.literal(20),
        saved: z.literal(true),
        answers: z
          .array(
            z.object({
              questionId: z.uuid(),
              selectedOptionId: z.uuid(),
              correctOptionId: z.uuid(),
              correct: z.boolean(),
              explanation: z.string(),
              japaneseExplanation: z.string(),
              translation: z.string(),
            }),
          )
          .length(20),
      })
      .safeParse(data);
    if (value.success) revalidatePath("/", "layout");
    return value.success
      ? { ok: true, data: value.data }
      : { ok: false, error: "network" };
  } catch {
    return { ok: false, error: "network" };
  }
}
