import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { aiConfig } from "./config";
import { demoScenarios } from "./scenarios";
import {
  settingsSchema,
  validateOutput,
  type TutorSnapshot,
  type AiScenario,
} from "./schema";
import type { TutorLesson } from "./schema";
export async function recommendedLessons(): Promise<TutorLesson[]> {
  const client = await createClient();
  if (!client) return [];
  const courses = await client
    .from("courses")
    .select("id,slug")
    .eq("published", true)
    .in("slug", ["n5", "n4", "n3", "n2", "n1"]);
  if (courses.error || !courses.data.length) return [];
  const lessons = await client
    .from("lessons")
    .select("id,title,course_id")
    .eq("published", true)
    .in(
      "course_id",
      courses.data.map((c) => c.id),
    )
    .order("position")
    .limit(100);
  return (lessons.data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    level: courses.data.find((c) => c.id === l.course_id)!.slug,
  }));
}
export function aiService() {
  const c = aiConfig(),
    url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!c.secret || !url) throw new Error("AI_DISABLED");
  return createSupabaseClient<Database>(url, c.secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
export async function loadScenarios(): Promise<{
  scenarios: AiScenario[];
  database: boolean;
}> {
  const client = await createClient();
  if (!client) return { scenarios: demoScenarios, database: false };
  const { data, error } = await client
    .from("ai_scenarios")
    .select("*")
    .eq("published", true)
    .not("slug", "is", null)
    .order("created_at");
  if (error) return { scenarios: demoScenarios, database: false };
  return {
    scenarios: (data ?? [])
      .filter((s) => s.slug && s.opening)
      .map((s) => ({ ...s, slug: s.slug! })),
    database: true,
  };
}
export async function snapshot(id: string): Promise<TutorSnapshot | null> {
  const client = await createClient();
  if (!client) return null;
  const { data: s } = await client
    .from("ai_sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (!s) return null;
  const [messages, feedback] = await Promise.all([
    client
      .from("ai_messages")
      .select("*")
      .eq("session_id", id)
      .order("turn")
      .order("role"),
    client.from("ai_feedback").select("*").eq("session_id", id).order("turn"),
  ]);
  if (messages.error || feedback.error) throw new Error("STORAGE_UNAVAILABLE");
  return {
    session: { ...s, settings: settingsSchema.parse(s.settings) },
    messages: (messages.data ?? []).sort(
      (a, b) => a.turn - b.turn || (a.role === "user" ? -1 : 1),
    ),
    feedback: (feedback.data ?? []).map((f) => ({
      ...validateOutput(f.payload),
      original: f.original,
      turn: f.turn,
    })),
  };
}
