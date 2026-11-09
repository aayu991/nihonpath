"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
export async function enrollCourse(courseId: string) {
  const user = await getCurrentUser();
  if (!user || !z.uuid().safeParse(courseId).success) return false;
  const client = await createClient();
  if (!client) return false;
  const { error } = await client
    .from("course_enrollments")
    .upsert(
      { user_id: user.id, course_id: courseId },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );
  if (!error) revalidatePath("/", "layout");
  return !error;
}
