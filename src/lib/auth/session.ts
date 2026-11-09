import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const getCurrentUser = cache(async () => {
  const client = await createClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
});
export async function requireUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?notice=session`);
  return user;
}
