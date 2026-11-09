"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { examSchema, questionDraftSchema } from "@/lib/exams/schema";
import { revalidatePath } from "next/cache";
export async function startExam(
  id: string,
  template: string,
  count: number | null = null,
  difficulty: string = "mixed",
) {
  if (
    !z.uuid().safeParse(id).success ||
    !z.uuid().safeParse(template).success ||
    !z.number().int().min(1).max(100).nullable().safeParse(count).success ||
    !z.enum(["mixed", "easy", "medium", "hard"]).safeParse(difficulty).success
  )
    return { error: "Invalid configuration." };
  const user = await getCurrentUser(),
    client = await createClient();
  if (!user || !client)
    return { error: "Please sign in to start a saved examination." };
  const { error } = await client.rpc("start_exam", {
    p_id: id,
    p_template: template,
    p_count: count,
    p_difficulty: difficulty,
  });
  return error
    ? {
        error:
          "Unable to start. Resume your active attempt, or check reviewed content availability.",
      }
    : { id };
}
export async function updateExam(
  id: string,
  question: string,
  option: string | null,
  flagged: boolean,
) {
  if (
    !z
      .object({
        id: z.uuid(),
        question: z.uuid(),
        option: z.uuid().nullable(),
        flagged: z.boolean(),
      })
      .safeParse({ id, question, option, flagged }).success
  )
    return { error: "Invalid response." };
  const user = await getCurrentUser(),
    client = await createClient();
  if (!user || !client)
    return {
      error: "Session expired. Sign in again; your saved answers are retained.",
    };
  const { data, error } = await client.rpc("save_exam_response", {
    p_id: id,
    p_question: question,
    p_option: option,
    p_flagged: flagged,
  });
  return error
    ? { error: "Answer was not saved. Check your connection and retry." }
    : { saved: data === true };
}
export async function loadExam(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const user = await getCurrentUser(),
    client = await createClient();
  if (!user || !client) return null;
  const { data, error } = await client.rpc("get_exam", { p_id: id });
  return error ? null : (examSchema.safeParse(data).data ?? null);
}
export async function finishExam(id: string) {
  if (!z.uuid().safeParse(id).success) return { error: "Invalid attempt." };
  const user = await getCurrentUser(),
    client = await createClient();
  if (!user || !client)
    return { error: "Sign in again to submit this attempt." };
  const { error } = await client.rpc("submit_exam", { p_id: id });
  if (error)
    return {
      error: "Submission failed. Your saved answers remain available; retry.",
    };
  revalidatePath("/[locale]/exams", "layout");
  return { exam: await loadExam(id) };
}
export async function editExamQuestion(
  id: string | null,
  input: unknown,
  action: string,
) {
  const admin = await getAdminContext();
  if (!admin) return { error: "Administrator access required." };
  if (id !== null && !z.uuid().safeParse(id).success)
    return { error: "Invalid question." };
  if (!["save", "review", "approve", "publish", "archive"].includes(action))
    return { error: "Invalid action." };
  const parsed = questionDraftSchema.safeParse(input);
  if (action === "save" && !parsed.success)
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  const { data, error } = await admin.client.rpc("admin_exam_question", {
    p_id: id,
    p_data: action === "save" ? parsed.data! : {},
    p_action: action,
  });
  if (error)
    return {
      error:
        "Save failed. Check the review transition and required fields. Change level/subject using a new revision.",
    };
  revalidatePath("/[locale]/exams", "layout");
  revalidatePath("/[locale]/admin/exams", "page");
  return { id: data };
}
