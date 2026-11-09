import type { Json } from "@/lib/supabase/database.types";
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
type Review = {
  id: string;
  review_status: "draft" | "in_review" | "approved";
  published: boolean;
  created_at: string;
  updated_at: string;
};
export type PreparationTables = {
  industry_sectors: Table<
    Review & {
      slug: string;
      title: string;
      title_ja: string;
      summary: string;
      summary_ja: string;
      course_id: string;
    }
  >;
  workplace_scenarios: Table<
    Review & {
      sector_id: string;
      lesson_id: string;
      bank_id: string;
      title: string;
      situation: string;
      situation_ja: string;
      dialogue: Json;
    }
  >;
  interview_questions: Table<
    Review & {
      sector_id: string | null;
      lesson_id: string;
      topic: string;
      prompt: string;
      suggested_answer: string;
      translation: string;
      explanation: string;
      explanation_ja: string;
    }
  >;
  official_resources: Table<
    Review & {
      jurisdiction:string;
      publication_date:string|null;
      verified_at:string|null;
      verified_by:string|null;
      sector_id: string | null;
      category: string;
      title: string;
      url: string;
      summary: string;
      summary_ja: string;
      reviewed_at: string;
    }
  >;
};
export type PreparationFunctions = {
  admin_prep_learning_save: {
    Args: {
      p_kind: string;
      p_id: string | null;
      p_data: Json;
      p_expected_updated_at: string | null;
    };
    Returns: string;
  };
  prep_dashboard: { Args: Record<never, never>; Returns: Json };
  admin_prep_save: {
    Args: {
      p_kind: string;
      p_id: string | null;
      p_data: Json;
      p_expected: string | null;
    };
    Returns: string;
  };
  admin_prep_review: {
    Args: {
      p_kind: string;
      p_id: string;
      p_action: string;
      p_expected: string;
    };
    Returns: string;
  };
  admin_prep_audit: { Args: { p_id: string }; Returns: Json };
  admin_verify_prep_audio: {
    Args: { p_id: string; p_seconds: number };
    Returns: undefined;
  };
};
