"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { localeSchema } from "@/lib/auth/validation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { goalsSchema } from "@/lib/platform/validation";
export type GoalsState = { error?: "goalRequired" | "saveError" };
export async function saveLearningGoals(
  localeInput: string,
  _previous: GoalsState,
  form: FormData,
): Promise<GoalsState> {
  const locale = localeSchema.parse(localeInput);
  const parsed = goalsSchema.safeParse(form.getAll("goals"));
  if (!parsed.success) return { error: "goalRequired" };
  const user = await getCurrentUser();
  if (!user) return { error: "saveError" };
  const client = await createClient();
  if (!client) return { error: "saveError" };
  try {
    const { error } = await client.rpc("set_learning_goals", {
      p_goals: parsed.data,
    });
    if (error) return { error: "saveError" };
  } catch {
    return { error: "saveError" };
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/dashboard?goals=saved`);
}
