"use server";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  organizationSchema,
  commandSchemas,
  type OrgAction,
} from "@/lib/organizations/schema";
async function context() {
  const user = await getCurrentUser();
  return user ? await createClient() : null;
}
async function select(id: string) {
  (await cookies()).set("nihonpath_org", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31536000,
  });
  revalidatePath("/", "layout");
}
export async function selectOrganization(id: string) {
  if (!z.uuid().safeParse(id).success) return { error: "invalid" };
  const client = await context();
  if (!client) return { error: "session" };
  const result = await client.rpc("org_workspace", { p_org: id });
  if (result.error) return { error: "forbidden" };
  await select(id);
  return { ok: true };
}
export async function registerOrganization(input: unknown) {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const client = await context();
  if (!client) return { error: "session" };
  const result = await client.rpc("org_register", { p_data: parsed.data });
  if (result.error) return { error: "saveError" };
  await select(result.data);
  return { id: result.data };
}
export async function organizationCommand(
  org: string,
  action: OrgAction,
  input: unknown,
) {
  if (
    !z.uuid().safeParse(org).success ||
    !Object.hasOwn(commandSchemas, action)
  )
    return { error: "invalid" };
  const parsed = commandSchemas[action].safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const client = await context();
  if (!client) return { error: "session" };
  const result = await client.rpc("org_command", {
    p_org: org,
    p_action: action,
    p_data: parsed.data,
  });
  if (result.error)
    return {
      error: result.error.message.includes("Stale") ? "stale" : "saveError",
    };
  revalidatePath("/", "layout");
  return { id: result.data };
}
export async function inviteOrganization(input: unknown) {
  const parsed = z
    .object({
      org: z.uuid(),
      emails: z.array(z.email().max(254)).min(1).max(20),
      role: z.enum(["administrator", "instructor", "manager", "learner"]),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const client = await context();
  if (!client) return { error: "session" };
  const invitations: { email: string; token: string }[] = [];
  for (const email of [
    ...new Set(parsed.data.emails.map((e) => e.toLowerCase())),
  ]) {
    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const r = await client.rpc("org_invite", {
      p_org: parsed.data.org,
      p_email: email,
      p_role: parsed.data.role,
      p_hash: hash,
    });
    if (r.error) return { error: "saveError", invitations };
    invitations.push({ email, token });
  }
  revalidatePath("/", "layout");
  return { invitations };
}
export async function acceptOrganizationInvite(token: string, share: boolean) {
  if (!/^[a-f0-9]{64}$/.test(token) || typeof share !== "boolean")
    return { error: "invalid" };
  const client = await context();
  if (!client) return { error: "session" };
  const r = await client.rpc("org_accept_invite", {
    p_token: token,
    p_share: share,
  });
  if (r.error) return { error: "inviteError" };
  await select(r.data);
  return { id: r.data };
}
