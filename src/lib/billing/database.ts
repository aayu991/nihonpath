import type { Json } from "@/lib/supabase/database.types";
import type { PurchaseOrder } from "./schema";
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
export type BillingTables = {
  purchase_orders: Table<PurchaseOrder>;
  entitlements: Table<{
    order_id: string;
    user_id: string;
    feature: string;
    starts_at: string;
    ends_at: string;
    revoked_at: string | null;
  }>;
  access_passes: Table<{
    order_id: string;
    user_id: string;
    product: string;
    starts_at: string;
    ends_at: string;
    revoked_at: string | null;
  }>;
  billing_subscriptions: Table<{
    order_id: string;
    user_id: string;
    reference: string;
    customer_reference: string;
    period_start: string;
    period_end: string;
    status: string;
  }>;
};
type Fn<A> = { Args: A; Returns: Json };
export type BillingFunctions = {
  billing_verify_claim: { Args: { p_order: string }; Returns: boolean };
  billing_resource_access: {
    Args: { p_table: string; p_id: string };
    Returns: boolean;
  };
  billing_subscription_end: Fn<{ p_order: string; p_event: string }>;
  billing_catalog: Fn<Record<string, never>>;
  billing_order_create: Fn<{
    p_price: string;
    p_provider: string;
    p_country: string;
    p_key: string;
    p_locale: string;
  }>;
  billing_claim: { Args: { p_order: string }; Returns: boolean };
  billing_attach: Fn<{ p_order: string; p_reference: string }>;
  billing_attempt: Fn<{
    p_order: string;
    p_operation: string;
    p_result: string;
  }>;
  billing_apply: Fn<{ p_order: string; p_proof: Json }>;
  billing_admin_report: Fn<Record<string, never>>;
  billing_has_feature: { Args: { p_feature: string }; Returns: boolean };
};
