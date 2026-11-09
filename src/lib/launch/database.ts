import type { Json } from "@/lib/supabase/database.types";
type Fn<A, R = Json> = { Args: A; Returns: R };
export type LaunchFunctions = {
  support_submit: Fn<
    { p_id: string; p_category: string; p_subject: string; p_body: string },
    string
  >;
  support_review: Fn<{ p_id: string; p_status: string; p_expected: string }>;
  notification_preferences_save: Fn<{
    p_learning: boolean;
    p_renewal: boolean;
  }>;
  launch_admin_snapshot: Fn<Record<string, never>>;
  launch_client_count: Fn<{ p_event: string; p_locale: string }>;
  launch_monitor: Fn<{ p_event: string }>;
  launch_vital: Fn<{ p_metric: string; p_bucket: string }>;
  launch_email_claim: Fn<Record<string, never>>;
  launch_email_finish: Fn<{
    p_id: string;
    p_lease: string;
    p_result: string;
    p_reference?: string | null;
  }>;
  launch_renewal_notifications: Fn<Record<string, never>>;
  launch_schema_health: Fn<Record<string, never>, boolean>;
};
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
export type LaunchTables = {
  support_requests: Table<{
    id: string;
    user_id: string;
    category: string;
    subject: string;
    body: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  notification_preferences: Table<{
    user_id: string;
    learning_updates: boolean;
    renewal_reminders: boolean;
    updated_at: string;
  }>;
};
