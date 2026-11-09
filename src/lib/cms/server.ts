import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cmsRoles } from "./schema";
const session = z.object({
  role: z.enum(cmsRoles).nullable(),
  permissions: z.object({
    read: z.boolean(),
    edit: z.boolean(),
    review: z.boolean(),
    publish: z.boolean(),
    users: z.boolean(),
  }),
});
export const getCmsContext = cache(async () => {
  const user = await getCurrentUser();
  if (!user || !user.email_confirmed_at || user.is_anonymous) return null;
  const client = await createClient();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc("cms_session");
    if (error) {
      const legacy = await client.rpc("is_admin");
      return !legacy.error && legacy.data === true
        ? {
            user,
            client,
            role: "super_admin" as const,
            ready: false,
            permissions: {
              read: true,
              edit: true,
              review: true,
              publish: true,
              users: true,
            },
          }
        : null;
    }
    const parsed = session.safeParse(data);
    return parsed.success && parsed.data.permissions.read
      ? { user, client, ...parsed.data, ready: true }
      : null;
  } catch {
    return null;
  }
});
