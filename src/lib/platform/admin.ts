import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
export const getAdminContext = cache(async () => {
  const user = await getCurrentUser();
  if (!user || !user.email_confirmed_at || user.is_anonymous) return null;
  const client = await createClient();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc("is_admin");
    return !error && data === true ? { user, client } : null;
  } catch {
    return null;
  }
});
