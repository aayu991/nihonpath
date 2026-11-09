"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { localeSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
export type LessonState = { status: "idle" | "saved" | "error" };
export async function completeLesson(
  idInput: string,
  localeInput: string,
  _previous: LessonState,
): Promise<LessonState> {
  void _previous;
  const locale = localeSchema.parse(localeInput);
  const parsed = z.uuid().safeParse(idInput);
  const user = await getCurrentUser();
  if (!parsed.success || !user) return { status: "error" };
  const client = await createClient();
  if (!client) return { status: "error" };
  try {
    const lesson = await client
      .from("lessons")
      .select("id")
      .eq("id", parsed.data)
      .eq("published", true)
      .single();
    if (lesson.error) return { status: "error" };
    const { error } = await client.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: parsed.data,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) return { status: "error" };
  } catch {
    return { status: "error" };
  }
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/courses`, "layout");
  revalidatePath(`/${locale}/lessons/${parsed.data}`);
  revalidatePath(`/${locale}/programs`, "layout");
  return { status: "saved" };
}
