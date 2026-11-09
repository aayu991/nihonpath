import type { Json } from "@/lib/supabase/database.types";
import type { ContentKind } from "./validation";
export const contentTables = {
  program: "learning_programs",
  course: "courses",
  module: "course_modules",
  lesson: "lessons",
  block: "lesson_blocks",
  translation: "content_translations",
} as const;
export type AdminRecord = Record<string, Json | undefined> & {
  id: string;
  review_status: "draft" | "in_review" | "approved";
  published: boolean;
  updated_at: string;
};
export type ContentReference = {
  id: string;
  title: string;
  course_id?: string;
};
export type ContentReferences = Record<ContentKind, ContentReference[]> & {
  deck: ContentReference[];
  bank: ContentReference[];
  audio: ContentReference[];
};
export function referenceId(
  record: AdminRecord | undefined,
  kind: ContentKind,
) {
  if (!record) return "";
  const value = record[`${kind}_id`];
  return typeof value === "string" ? value : "";
}
