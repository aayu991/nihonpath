import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { choicesSchema, workspaceSchema } from "./schema";
export const organizationContext = cache(async () => {
  const client = await createClient();
  if (!client) return { choices: [], workspace: null, unavailable: true };
  const list = await client.rpc("org_list");
  const choices = choicesSchema.safeParse(list.data);
  if (list.error || !choices.success)
    return { choices: [], workspace: null, unavailable: true };
  const selected = (await cookies()).get("nihonpath_org")?.value;
  const current =
    choices.data.find((o) => o.id === selected) ?? choices.data[0];
  if (!current)
    return { choices: choices.data, workspace: null, unavailable: false };
  const result = await client.rpc("org_workspace", { p_org: current.id });
  const workspace = workspaceSchema.safeParse(result.data);
  return {
    choices: choices.data,
    workspace: workspace.success ? workspace.data : null,
    unavailable: !!result.error || !workspace.success,
  };
});
