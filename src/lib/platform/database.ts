import type { Json } from "@/lib/supabase/database.types";
type RowTable<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
type ReviewFields = {
  id: string;
  review_status: "draft" | "in_review" | "approved";
  published: boolean;
  created_at: string;
  updated_at: string;
};
export type PlatformTables = FutureTables & {
  learning_programs: RowTable<
    ReviewFields & {
      slug: string;
      title: string;
      summary: string;
      category: string;
    }
  >;
  course_modules: RowTable<
    ReviewFields & { course_id: string; title: string; position: number }
  >;
  lesson_blocks: RowTable<
    ReviewFields & {
      lesson_id: string;
      kind: string;
      content: Json;
      schema_version: number;
      position: number;
      deck_id: string | null;
      question_bank_id: string | null;
      audio_asset_id: string | null;
    }
  >;
  content_translations: RowTable<
    ReviewFields & {
      program_id: string | null;
      course_id: string | null;
      module_id: string | null;
      lesson_id: string | null;
      block_id: string | null;
      locale: string;
      title: string;
      content: Json;
    }
  >;
  user_learning_goals: RowTable<{
    user_id: string;
    goal: string;
    created_at: string;
  }>;
  audio_assets: RowTable<{
    storage_path: string | null;
    license_note: string | null;
    verified_by: string | null;
    verified_at: string | null;
    id: string;
    title: string;
    url: string | null;
    mime_type: string | null;
    status: string;
    duration_seconds: number | null;
    published: boolean;
    created_at: string;
    updated_at: string;
  }>;
};
export type PlatformFunctions = {
  course_progress: { Args: { p_course: string }; Returns: Json };
  set_learning_goals: { Args: { p_goals: string[] }; Returns: undefined };
  admin_save_content: {
    Args: {
      p_kind: string;
      p_id: string | null;
      p_data: Json;
      p_expected_updated_at: string | null;
    };
    Returns: string;
  };
  admin_review_content: {
    Args: {
      p_kind: string;
      p_id: string;
      p_action: string;
      p_expected_updated_at: string;
    };
    Returns: string;
  };
  is_organization_member: { Args: { p_org: string }; Returns: boolean };
  is_organization_staff: { Args: { p_org: string }; Returns: boolean };
};
type Times = { created_at: string; updated_at: string };
type FutureTables = {
  program_enrollments: RowTable<{
    user_id: string;
    program_id: string;
    created_at: string;
  }>;
  lesson_block_progress: RowTable<
    Times & { user_id: string; block_id: string; completed_at: string | null }
  >;
  organizations: RowTable<
    Times & {
      id: string;
      name: string;
      kind: "institute" | "employer" | "ssw_center" | "training_provider";
      contact_email: string;
      contact_phone: string;
      logo_url: string;
      preferred_language: "en" | "ja" | "ne" | "hi";
      timezone: string;
    }
  >;
  organization_members: RowTable<{
    organization_id: string;
    user_id: string;
    role: "owner" | "administrator" | "instructor" | "manager" | "learner";
    status: "active" | "inactive";
    display_name: string;
    share_progress: boolean;
    jlpt_level: string;
    jft_preparing: boolean;
    sector_id: string | null;
    updated_at: string;
    created_at: string;
  }>;
  organization_programs: RowTable<{
    organization_id: string;
    program_id: string;
    created_at: string;
  }>;
  training_sessions: RowTable<
    Times & {
      id: string;
      organization_id: string;
      program_id: string | null;
      title: string;
      starts_at: string;
      class_id: string | null;
    }
  >;
  attendance_records: RowTable<
    Times & {
      organization_id: string;
      session_id: string;
      student_id: string;
      status: "present" | "absent" | "late" | "excused";
      recorded_by: string;
    }
  >;
  training_reports: RowTable<
    Times & {
      id: string;
      organization_id: string;
      author_id: string;
      title: string;
      summary: Json;
    }
  >;
  ai_scenarios: RowTable<
    Times & {
      slug: string | null;
      title_ja: string;
      description: string;
      description_ja: string;
      suggested_level: string;
      opening: string;
      opening_translation: string;
      id: string;
      program_id: string | null;
      title: string;
      prompt_template: string;
      published: boolean;
    }
  >;
  ai_roleplay_sessions: RowTable<
    Times & {
      id: string;
      user_id: string;
      scenario_id: string;
      status: "planned" | "active" | "completed" | "failed";
      provider_reference: string | null;
    }
  >;
  tutor_bookings: RowTable<
    Times & {
      id: string;
      learner_id: string;
      tutor_id: string;
      starts_at: string;
      ends_at: string;
      status:
        | "pending"
        | "confirmed"
        | "declined"
        | "cancelled"
        | "completed"
        | "no_show";
      lesson_type_id: string | null;
      lesson_title: string;
      duration_minutes: number | null;
      price_minor: number | null;
      currency: string | null;
      learning_goals: string;
      request_expires_at: string | null;
      cancellation_requested_at: string | null;
      learner_completed_at: string | null;
      tutor_completed_at: string | null;
      request_key: string | null;
      status_reason: string;
    }
  >;
  visa_checklist_templates: RowTable<
    Times & {
      title_ja: string;
      guide_category_id: string | null;
      audiences: string[];
      stages: string[];
      source_id: string | null;
      review_status: string;
      id: string;
      program_id: string | null;
      title: string;
      informational_notice: string;
      source_url: string | null;
      reviewed_at: string | null;
      published: boolean;
    }
  >;
  visa_checklist_items: RowTable<{
    title_ja: string;
    note: string;
    note_ja: string;
    kind: string;
    circumstance: string;
    audiences: string[];
    guide_id: string | null;
    version: number;
    updated_at: string;
    id: string;
    template_id: string;
    title: string;
    position: number;
    created_at: string;
  }>;
  examinations: RowTable<
    Times & {
      id: string;
      program_id: string;
      bank_id: string;
      title: string;
      version: number;
      requires_human_review: boolean;
      published: boolean;
    }
  >;
  examination_reviews: RowTable<
    Times & {
      id: string;
      attempt_id: string;
      reviewer_id: string;
      status: "assigned" | "in_review" | "released";
      feedback: Json;
    }
  >;
};
