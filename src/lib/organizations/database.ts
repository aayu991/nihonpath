import type { Json } from "@/lib/supabase/database.types";
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
type Owned = { organization_id: string; created_at: string };
export type OrganizationTables = {
  organization_invitations: Table<
    Owned & {
      id: string;
      email: string;
      role: string;
      token_hash: string;
      invited_by: string;
      expires_at: string;
      accepted_at: string | null;
      revoked_at: string | null;
    }
  >;
  classes: Table<
    Owned & {
      id: string;
      title: string;
      schedule: string;
      created_by: string;
      updated_at: string;
    }
  >;
  class_teachers: Table<Owned & { class_id: string; user_id: string }>;
  class_enrollments: Table<Owned & { class_id: string; user_id: string }>;
  course_assignments: Table<
    Owned & {
      id: string;
      course_id: string;
      class_id: string | null;
      learner_id: string | null;
      deadline: string | null;
      created_by: string;
    }
  >;
  organization_reminders: Table<
    Owned & {
      id: string;
      assignment_id: string;
      user_id: string;
      created_by: string;
    }
  >;
  organization_audit_logs: Table<
    Owned & {
      id: string;
      actor_id: string;
      action: string;
      entity_id: string | null;
      detail: Json;
    }
  >;
};
export type OrganizationFunctions = {
  org_list: { Args: Record<never, never>; Returns: Json };
  org_workspace: { Args: { p_org: string }; Returns: Json };
  org_register: { Args: { p_data: Json }; Returns: string };
  org_command: {
    Args: { p_org: string; p_action: string; p_data: Json };
    Returns: string;
  };
  org_invite: {
    Args: { p_org: string; p_email: string; p_role: string; p_hash: string };
    Returns: string;
  };
  org_accept_invite: {
    Args: { p_token: string; p_share: boolean };
    Returns: string;
  };
};
