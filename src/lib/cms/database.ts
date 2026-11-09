import type { Json } from "@/lib/supabase/database.types";
type Fn<A, R = Json> = { Args: A; Returns: R };
export type CmsFunctions = {
  cms_session: Fn<Record<string, never>>;
  cms_dashboard: Fn<Record<string, never>>;
  cms_references: Fn<Record<string, never>>;
  cms_catalog: Fn<{
    p_kind: string;
    p_query?: string;
    p_state?: string;
    p_offset?: number;
  }>;
  cms_document: Fn<{ p_kind: string; p_id: string }>;
  cms_save: Fn<
    {
      p_kind: string;
      p_id: string | null;
      p_document: Json;
      p_version: number;
      p_base?: string | null;
    },
    string
  >;
  cms_transition: Fn<{
    p_kind: string;
    p_id: string;
    p_version: number;
    p_action: string;
    p_notes?: string;
    p_when?: string | null;
  }>;
  cms_history: Fn<{ p_kind: string; p_id: string }>;
  cms_restore: Fn<
    { p_kind: string; p_id: string; p_revision: number; p_version: number },
    string
  >;
  cms_assign_role: Fn<{ p_user: string; p_role: string | null }>;
  cms_users: Fn<{ p_query?: string; p_offset?: number }>;
  cms_run_scheduled: Fn<Record<string, never>>;
  cms_public_metadata: Fn<{ p_kind: string; p_id: string }>;
  cms_import_vocabulary: Fn<{
    p_course: string;
    p_rows: Json;
    p_preview: boolean;
  }>;
  cms_media_register: Fn<{ p_actor: string; p_id: string; p_data: Json }>;
  cms_media_list: Fn<{ p_query?: string; p_type?: string }>;
  cms_media_update: Fn<{
    p_id: string;
    p_action: string;
    p_title?: string;
    p_notes?: string;
  }>;
  cms_media_resolve: Fn<{ p_id: string }>;
  cms_user_detail: Fn<{ p_user: string }>;
  cms_user_operation: Fn<{ p_user: string; p_action: string }>;
  cms_published_media: Fn<{ p_kind: string; p_id: string }>;
  cms_guide_references: Fn<Record<string, never>>;
  cms_translation_overview: Fn<{ p_lesson: string }>;
  cms_public_course: Fn<{ p_slug: string }>;
  cms_lesson_slug: Fn<{ p_course: string; p_slug: string }, string | null>;
  cms_kanji: Fn<{ p_level?: string }>;
  cms_content_sitemap: Fn<Record<string, never>>;
  cms_media_prepare_delete: Fn<{ p_actor: string; p_id: string }, string>;
  cms_media_delete_result: Fn<{
    p_actor: string;
    p_id: string;
    p_success: boolean;
  }>;
};
