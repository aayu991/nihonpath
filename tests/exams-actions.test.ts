import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  admin: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/platform/admin", () => ({ getAdminContext: mocks.admin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import {
  startExam,
  updateExam,
  loadExam,
  finishExam,
  editExamQuestion,
} from "@/actions/exams";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  template = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue(null);
  mocks.client.mockResolvedValue(null);
  mocks.admin.mockResolvedValue(null);
});
describe("exam action boundaries", () => {
  it("requires a verified user before starting, saving, loading or submitting", async () => {
    expect(await startExam(id, template)).toHaveProperty("error");
    expect(await updateExam(id, template, null, true)).toHaveProperty("error");
    expect(await loadExam(id)).toBe(null);
    expect(await finishExam(id)).toHaveProperty("error");
  });
  it("rejects invalid IDs, counts and difficulty before touching the database", async () => {
    expect(await startExam("bad", template)).toHaveProperty("error");
    expect(await startExam(id, template, 0)).toHaveProperty("error");
    expect(await startExam(id, template, 1, "official-pass")).toHaveProperty(
      "error",
    );
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("passes configuration but no owner, score or deadline from the learner", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null, data: id });
    mocks.user.mockResolvedValue({ id: "verified-owner" });
    mocks.client.mockResolvedValue({ rpc });
    expect(await startExam(id, template, 3, "easy")).toEqual({ id });
    expect(rpc).toHaveBeenCalledWith("start_exam", {
      p_id: id,
      p_template: template,
      p_count: 3,
      p_difficulty: "easy",
    });
  });
  it("reports failed saves instead of claiming persistence", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ error: { message: "unavailable" }, data: null });
    mocks.user.mockResolvedValue({ id });
    mocks.client.mockResolvedValue({ rpc });
    expect(await updateExam(id, template, null, false)).toHaveProperty("error");
  });
  it("distinguishes an expired or submitted response from a saved response", async () => {
    mocks.user.mockResolvedValue({ id });
    mocks.client.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ error: null, data: false }),
    });
    expect(await updateExam(id, template, null, false)).toEqual({
      saved: false,
    });
  });
  it("blocks learner editorial actions even if they request publish", async () => {
    expect(await editExamQuestion(id, {}, "publish")).toHaveProperty("error");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("does not send malformed drafts or arbitrary actions through an admin RPC", async () => {
    const rpc = vi.fn();
    mocks.admin.mockResolvedValue({ client: { rpc } });
    expect(await editExamQuestion(null, {}, "save")).toHaveProperty("error");
    expect(await editExamQuestion(id, {}, "grant-admin")).toHaveProperty(
      "error",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
