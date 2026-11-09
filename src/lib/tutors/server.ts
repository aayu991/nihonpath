import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { catalogSchema, workspaceSchema } from "./schema";
export const tutorCatalog = cache(async () => {
  const client = await createClient();
  if (!client) return { tutors: [], unavailable: true };
  const r = await client.rpc("tutor_catalog");
  const p = catalogSchema.safeParse(r.data);
  return {
    tutors: p.success ? p.data : [],
    unavailable: !!r.error || !p.success,
  };
});
export const tutorWorkspace = cache(async () => {
  const client = await createClient();
  if (!client) return null;
  const r = await client.rpc("tutor_workspace");
  const p = workspaceSchema.safeParse(r.data);
  return r.error || !p.success ? null : p.data;
});
