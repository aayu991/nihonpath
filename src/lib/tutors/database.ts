import type { Json } from "@/lib/supabase/database.types";
import type { z } from "zod";
import type {
  applicationRowSchema,
  publicTutorSchema,
  lessonSchema,
  reviewSchema,
} from "./schema";
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
export type TutorTables = {
  tutor_applications: Table<
    z.infer<typeof applicationRowSchema> & {
      created_at: string;
      reviewed_at: string | null;
      reviewed_by: string | null;
    }
  >;
  tutor_profiles: Table<
    Omit<z.infer<typeof publicTutorSchema>, "lesson_types" | "reviews"> & {
      created_at: string;
      updated_at: string;
    }
  >;
  tutor_lesson_types: Table<
    z.infer<typeof lessonSchema> & { created_at: string; updated_at: string }
  >;
  tutor_availability_rules: Table<{
    id: string;
    tutor_id: string;
    weekday: number;
    start_time: string;
    end_time: string;
    created_at: string;
  }>;
  tutor_availability_exceptions: Table<{
    id: string;
    tutor_id: string;
    kind: "available" | "blocked";
    starts_at: string;
    ends_at: string;
    created_at: string;
  }>;
  tutor_booking_events: Table<{
    id: string;
    booking_id: string;
    actor_id: string | null;
    event: string;
    created_at: string;
  }>;
  tutor_lesson_notes: Table<{
    booking_id: string;
    author_id: string;
    note: string;
    updated_at: string;
  }>;
  tutor_meetings: Table<{
    booking_id: string;
    url: string;
    updated_at: string;
  }>;
  tutor_reviews: Table<
    z.infer<typeof reviewSchema> & {
      booking_id: string;
      tutor_id: string;
      learner_id: string;
      moderation_status: "pending" | "published" | "hidden";
      updated_at: string;
    }
  >;
  tutor_reports: Table<{
    id: string;
    reporter_id: string;
    tutor_id: string | null;
    booking_id: string | null;
    review_id: string | null;
    reason: string;
    status: "open" | "resolved";
    created_at: string;
  }>;
  tutor_moderation_logs: Table<{
    id: string;
    admin_id: string | null;
    tutor_id: string | null;
    action: string;
    notes: string;
    created_at: string;
  }>;
  tutor_request_limits: Table<{
    user_id: string;
    day: string;
    requests: number;
  }>;
};
export type TutorFunctions = {
  tutor_local_slots: {
    Args: { p_tutor: string; p_type: string; p_day: string; p_zone: string };
    Returns: Json;
  };
  tutor_catalog: { Args: Record<never, never>; Returns: Json };
  tutor_workspace: { Args: Record<never, never>; Returns: Json };
  tutor_admin_workspace: { Args: Record<never, never>; Returns: Json };
  tutor_application_save: {
    Args: { p_data: Json; p_expected: string | null; p_submit?: boolean };
    Returns: string;
  };
  tutor_application_submit: {
    Args: { p_expected: string };
    Returns: undefined;
  };
  tutor_admin_review: {
    Args: {
      p_tutor: string;
      p_action: string;
      p_expected: string;
      p_notes: string;
      p_verified: boolean;
      p_summary: string;
    };
    Returns: undefined;
  };
  tutor_manage: { Args: { p_action: string; p_data: Json }; Returns: string };
  tutor_slots: {
    Args: { p_tutor: string; p_type: string; p_from: string; p_days: number };
    Returns: Json;
  };
  tutor_request_booking: {
    Args: {
      p_id: string;
      p_tutor: string;
      p_type: string;
      p_start: string;
      p_goals: string;
    };
    Returns: string;
  };
  tutor_booking_action: {
    Args: {
      p_booking: string;
      p_action: string;
      p_expected: string;
      p_data: Json;
    };
    Returns: undefined;
  };
  tutor_write_review: {
    Args: { p_booking: string; p_rating: number; p_body: string };
    Returns: string;
  };
  tutor_review_response: {
    Args: { p_review: string; p_response: string };
    Returns: undefined;
  };
  tutor_report: {
    Args: { p_kind: string; p_target: string; p_reason: string };
    Returns: string;
  };
  tutor_moderate: {
    Args: { p_kind: string; p_id: string; p_action: string; p_notes: string };
    Returns: undefined;
  };
  tutor_purge_private: { Args: Record<never, never>; Returns: undefined };
};
