import type { Json } from "@/lib/supabase/database.types";
import type {
  GuideArticle,
  GuideCategory,
  GuidePreferences,
  GuideSource,
  ChecklistProgress,
} from "./schema";
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
export type GuideTables = {
  guide_categories: Table<
    GuideCategory & {
      published: boolean;
      review_status: string;
      updated_at: string;
    }
  >;
  guide_articles: Table<
    Omit<GuideArticle, "content" | "source_ids"> & { content: Json }
  >;
  guide_translations: Table<{
    article_version: number;
    id: string;
    article_id: string;
    locale: string;
    title: string;
    summary: string;
    content: Json;
    review_status: string;
    updated_at: string;
  }>;
  guide_source_links: Table<{ article_id: string; source_id: string }>;
  article_reviews: Table<{
    id: string;
    article_id: string;
    article_version: number;
    kind: string;
    reviewer_id: string | null;
    notes: string;
    created_at: string;
  }>;
  article_revisions: Table<{
    id: string;
    article_id: string;
    entity_kind: string;
    entity_id: string;
    snapshot: Json;
    editor_id: string | null;
    created_at: string;
  }>;
  article_feedback: Table<{
    id: string;
    article_id: string;
    user_id: string;
    kind: string;
    notes: string;
    created_at: string;
  }>;
  user_checklists: Table<
    GuidePreferences & { user_id: string; updated_at: string }
  >;
  user_checklist_progress: Table<ChecklistProgress & { user_id: string }>;
};
export type GuideFunctions = {
  guide_catalog: { Args: Record<never, never>; Returns: Json };
  set_guide_preferences: { Args: { p_data: Json }; Returns: undefined };
  save_guide_item: {
    Args: {
      p_item: string;
      p_completed: boolean;
      p_notes: string;
      p_due: string | null;
      p_expected: string | null;
    };
    Returns: Json;
  };
  submit_guide_feedback: {
    Args: { p_article: string; p_kind: string; p_notes: string };
    Returns: undefined;
  };
  admin_guide_save: {
    Args: {
      p_kind: string;
      p_id: string | null;
      p_data: Json;
      p_expected: string | null;
    };
    Returns: string;
  };
  admin_guide_transition: {
    Args: {
      p_kind: string;
      p_id: string;
      p_action: string;
      p_expected: string;
      p_notes: string;
    };
    Returns: undefined;
  };
};
export type GuideSourceRow = GuideSource;
