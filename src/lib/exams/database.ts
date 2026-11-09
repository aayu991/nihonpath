import type { Json } from "@/lib/supabase/database.types";
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
export type ExamTables = {
  exam_templates: Table<{
    id: string;
    title: string;
    level: string;
    mode: "quick" | "section" | "full";
    published: boolean;
    examination_id: string | null;
    created_at: string;
  }>;
  exam_sections: Table<{
    id: string;
    template_id: string;
    bank_id: string;
    title: string;
    position: number;
    question_count: number;
    duration_seconds: number;
  }>;
  question_reviews: Table<{
    id: string;
    question_id: string;
    reviewer_id: string;
    status: string;
    notes: string;
    created_at: string;
  }>;
  exam_section_attempts: Table<{
    id: string;
    attempt_id: string;
    section_id: string;
    title: string;
    position: number;
  }>;
  exam_responses: Table<{
    attempt_id: string;
    question_id: string;
    option_id: string | null;
    flagged: boolean;
    updated_at: string;
  }>;
  exam_attempts: Table<{
    id: string;
    user_id: string;
    template_id: string;
    title: string;
    level: string;
    mode: string;
    status: string;
    started_at: string;
    expires_at: string;
    submitted_at: string | null;
  }>;
  exam_results: Table<{ attempt_id: string; result: Json; created_at: string }>;
};
export type ExamFunctions = {
  exam_catalog: { Args: Record<never, never>; Returns: Json };
  start_exam: {
    Args: {
      p_id: string;
      p_template: string;
      p_count?: number | null;
      p_difficulty?: string;
    };
    Returns: string;
  };
  get_exam: { Args: { p_id: string }; Returns: Json };
  submit_exam: { Args: { p_id: string }; Returns: Json };
  save_exam_response: {
    Args: {
      p_id: string;
      p_question: string;
      p_option: string | null;
      p_flagged: boolean;
    };
    Returns: boolean;
  };
  admin_exam_question: {
    Args: { p_id: string | null; p_data: Json; p_action: string };
    Returns: string;
  };
  admin_exam_list: { Args: Record<never, never>; Returns: Json };
};
