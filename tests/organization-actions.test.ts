import { beforeEach, describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
const m = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
  set: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: m.set }) }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.client }));
import {
  organizationCommand,
  selectOrganization,
  inviteOrganization,
  acceptOrganizationInvite,
  registerOrganization,
} from "@/actions/organizations";
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: crypto.randomUUID() });
  m.client.mockResolvedValue({ rpc: m.rpc });
});
describe("organization action security", () => {
  it("denies expired sessions before calling a tenant RPC", async () => {
    m.user.mockResolvedValue(null);
    expect(
      await organizationCommand(crypto.randomUUID(), "sharing", {
        share_progress: true,
      }),
    ).toEqual({ error: "session" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("does not trust a selected-organization cookie without database authorization", async () => {
    m.rpc.mockResolvedValue({ error: { message: "Forbidden" } });
    expect(await selectOrganization(crypto.randomUUID())).toEqual({
      error: "forbidden",
    });
    expect(m.set).not.toHaveBeenCalled();
  });
  it("forwards only whitelisted fields and preserves stale attendance failures", async () => {
    m.rpc.mockResolvedValue({ error: { message: "Stale attendance" } });
    const org = crypto.randomUUID();
    expect(
      await organizationCommand(org, "class", {
        id: null,
        title: "N5",
        schedule: "",
        expected: null,
        organization_id: crypto.randomUUID(),
        created_by: crypto.randomUUID(),
      }),
    ).toEqual({ error: "stale" });
    expect(m.rpc.mock.calls[0][1].p_data).toEqual({
      id: null,
      title: "N5",
      schedule: "",
      expected: null,
    });
  });
  it("creates unique random invitation secrets and stores only their SHA-256 hashes", async () => {
    m.rpc.mockResolvedValue({ error: null, data: crypto.randomUUID() });
    const r = await inviteOrganization({
      org: crypto.randomUUID(),
      role: "instructor",
      emails: ["a@example.test", "b@example.test"],
    });
    expect(r.invitations).toHaveLength(2);
    const token = r.invitations![0].token;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(r.invitations![1].token).not.toBe(token);
    expect(m.rpc.mock.calls[0][1].p_hash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(m.rpc.mock.calls[0][1]).not.toHaveProperty("token");
  });
  it("rejects malformed tokens and registration payloads without database writes", async () => {
    expect(await acceptOrganizationInvite("bad", true)).toEqual({
      error: "invalid",
    });
    expect(
      await registerOrganization({ name: "", role: "platform_admin" }),
    ).toEqual({ error: "invalid" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
