import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ client: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.client }));
import { tutorCatalog, tutorWorkspace } from "@/lib/tutors/server";
beforeEach(() => {
  vi.resetAllMocks();
  m.client.mockResolvedValue({ rpc: m.rpc });
});
it("never replaces an unavailable tutor catalog with fictitious tutors or ratings", async () => {
  m.rpc.mockResolvedValue({ error: { message: "Missing migration" } });
  expect(await tutorCatalog()).toEqual({ tutors: [], unavailable: true });
});
it("preserves a real empty marketplace and an unavailable private workspace", async () => {
  m.rpc.mockResolvedValue({ error: null, data: [] });
  expect(await tutorCatalog()).toEqual({ tutors: [], unavailable: false });
  expect(await tutorWorkspace()).toBe(null);
});
