import type { Json } from "@/lib/supabase/database.types";
import type { TutorMessage, TutorSession } from "./schema";
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
export type AiTables = {
  ai_sessions: Table<
    Omit<TutorSession, "settings"> & {
      user_id: string;
      settings: Json;
      active_request: string | null;
      request_started_at: string | null;
    }
  >;
  ai_messages: Table<TutorMessage & { session_id: string; user_id: string }>;
  ai_feedback: Table<{
    id: string;
    session_id: string;
    user_id: string;
    turn: number;
    original: string;
    payload: Json;
  }>;
  ai_usage: Table<{
    id: string;
    user_id: string;
    session_id: string | null;
    status: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number | null;
    created_at: string;
  }>;
  ai_user_settings: Table<{
    user_id: string;
    settings: Json;
    updated_at: string;
  }>;
};
export type AiFunctions = {
  ai_start: {
    Args: { p_user: string; p_id: string; p_settings: Json };
    Returns: string;
  };
  ai_reserve: {
    Args: {
      p_user: string;
      p_session: string;
      p_request: string;
      p_text: string;
      p_model: string;
    };
    Returns: Json;
  };
  ai_finish: {
    Args: {
      p_user: string;
      p_session: string;
      p_request: string;
      p_output: Json | null;
      p_input_tokens: number;
      p_output_tokens: number;
      p_cost: number | null;
    };
    Returns: undefined;
  };
  ai_end: { Args: { p_user: string; p_session: string }; Returns: undefined };
  ai_save_settings: { Args: { p_settings: Json }; Returns: undefined };
};
