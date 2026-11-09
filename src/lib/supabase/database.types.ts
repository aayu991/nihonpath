import type { LaunchFunctions, LaunchTables } from "@/lib/launch/database";
import type { CmsFunctions } from "@/lib/cms/database";
import type { BillingFunctions, BillingTables } from "@/lib/billing/database";
import type { TutorFunctions, TutorTables } from "@/lib/tutors/database";
import type {
  OrganizationFunctions,
  OrganizationTables,
} from "@/lib/organizations/database";
import type { ExamTables, ExamFunctions } from "@/lib/exams/database";
import type { AiTables, AiFunctions } from "@/lib/ai/database";
import type { GuideTables, GuideFunctions } from "@/lib/guides/database";
import type {
  PreparationTables,
  PreparationFunctions,
} from "@/lib/preparation/database";
import type {
  PlatformTables,
  PlatformFunctions,
} from "@/lib/platform/database";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type Profile = {
  id: string;
  display_name: string;
  preferred_language: "en" | "ja" | "ne" | "hi";
  onboarding_completed_at: string | null;
  learning_goal:
    "jlpt" | "business" | "conversation" | "study" | "work" | "travel";
  jlpt_target: "n5" | "n4" | "n3" | "n2" | "n1";
  created_at: string;
  updated_at: string;
};
export interface Database {
  public: {
    Tables: LaunchTables &
      BillingTables &
      TutorTables &
      OrganizationTables &
      GuideTables &
      AiTables &
      PreparationTables &
      ExamTables &
      PlatformTables & {
        course_enrollments: Table<{
          user_id: string;
          course_id: string;
          created_at: string;
        }>;
        flashcard_schedule: Table<{
          user_id: string;
          flashcard_id: string;
          streak: number;
          interval_days: number;
          due_at: string;
          last_reviewed_at: string;
        }>;
        vocabulary: Table<{
          sector_id: string | null;
          topic: string;
          difficulty: "basic" | "intermediate";
          id: string;
          course_id: string;
          term: string;
          reading: string;
          meaning_en: string;
          meaning_ja: string;
          example: string;
          example_translation: string;
          category: string;
          published: boolean;
          review_status: "draft" | "in_review" | "approved";
          created_at: string;
          updated_at: string;
        }>;
        profiles: Table<Profile>;
        courses: Table<{
          program_id: string | null;
          review_status: "draft" | "in_review" | "approved";
          id: string;
          slug: string;
          title: string;
          published: boolean;
          created_at: string;
          updated_at: string;
        }>;
        lessons: Table<{
          subject: import("@/lib/learning/study-types").Subject;
          module_id: string | null;
          review_status: "draft" | "in_review" | "approved";
          id: string;
          course_id: string;
          slug: string;
          title: string;
          position: number;
          published: boolean;
          created_at: string;
          updated_at: string;
          body: Json;
        }>;
        lesson_progress: Table<{
          user_id: string;
          lesson_id: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
        flashcard_decks: Table<{
          review_status: "draft" | "in_review" | "approved";
          id: string;
          course_id: string;
          title: string;
          published: boolean;
          created_at: string;
          updated_at: string;
        }>;
        flashcards: Table<{
          category: string;
          vocabulary_id: string | null;
          id: string;
          deck_id: string;
          term: string;
          reading: string;
          translations: Json;
          example: string;
          example_translation: string;
          position: number;
          created_at: string;
          updated_at: string;
        }>;
        flashcard_reviews: Table<{
          id: string;
          user_id: string;
          flashcard_id: string;
          rating: "known" | "again";
          created_at: string;
        }>;
        question_banks: Table<{
          prep_category: string | null;
          prep_mode: string | null;
          exam_only: boolean;
          review_status: "draft" | "in_review" | "approved";
          subject: import("@/lib/learning/study-types").Subject;
          id: string;
          course_id: string;
          title: string;
          published: boolean;
          created_at: string;
          updated_at: string;
        }>;
        questions: Table<{
          exam_metadata: Json;
          exam_status:
            "draft" | "in_review" | "approved" | "published" | "archived";
          related_lesson_id: string | null;
          related_deck_id: string | null;
          audio_asset_id: string | null;
          id: string;
          bank_id: string;
          prompt: string;
          position: number;
          created_at: string;
          updated_at: string;
        }>;
        question_options: Table<{
          id: string;
          question_id: string;
          text: string;
          position: number;
          created_at: string;
          updated_at: string;
        }>;
        quiz_attempts: Table<{
          subject: import("@/lib/learning/study-types").Subject;
          examination_id: string | null;
          id: string;
          user_id: string;
          bank_id: string;
          score: number;
          total: number;
          created_at: string;
        }>;
        quiz_answers: Table<{
          attempt_id: string;
          user_id: string;
          question_id: string;
          option_id: string;
          correct: boolean;
          created_at: string;
        }>;
      };
    Views: Record<never, never>;
    Functions: CmsFunctions & LaunchFunctions &
      BillingFunctions &
      TutorFunctions &
      OrganizationFunctions &
      GuideFunctions &
      AiFunctions &
      PreparationFunctions &
      ExamFunctions &
      PlatformFunctions & {
        learning_dashboard: { Args: Record<never, never>; Returns: Json };
        practice_quiz: {
          Args: { p_bank: string; p_answers: Json };
          Returns: Json;
        };
        admin_learning_save: {
          Args: {
            p_kind: string;
            p_id: string | null;
            p_data: Json;
            p_expected_updated_at: string | null;
          };
          Returns: string;
        };
        admin_learning_review: {
          Args: {
            p_kind: string;
            p_id: string;
            p_action: string;
            p_expected_updated_at: string;
          };
          Returns: string;
        };
        admin_learning_preview: {
          Args: { p_kind: string; p_id: string };
          Returns: Json;
        };
        dashboard_summary: { Args: Record<never, never>; Returns: Json };
        is_admin: { Args: Record<never, never>; Returns: boolean };
        record_review: {
          Args: { p_id: string; p_card: string; p_rating: string };
          Returns: string;
        };
        submit_quiz: {
          Args: { p_id: string; p_bank: string; p_answers: Json };
          Returns: Json;
        };
      };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
