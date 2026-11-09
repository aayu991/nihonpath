import { beforeEach, describe, it, expect, vi } from "vitest";
const mocked = vi.hoisted(() => ({
  admin: vi.fn(),
  user: vi.fn(),
  client: vi.fn(),
  redirect: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/platform/admin", () => ({ getAdminContext: mocked.admin }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocked.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocked.client }));
vi.mock("next/cache", () => ({ revalidatePath: mocked.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocked.redirect }));
import { saveContent, reviewContent } from "../src/actions/content";
import { saveLearningGoals } from "../src/actions/goals";
beforeEach(() => {
  vi.resetAllMocks();
  mocked.admin.mockResolvedValue(null);
  mocked.user.mockResolvedValue(null);
  mocked.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});
describe("server authorization boundaries", () => {
  it("rejects unauthenticated or learner content writes before contacting the content RPC", async () => {
    const form = new FormData();
    form.set("title", "Forged");
    expect(await saveContent("program", "en", {}, form)).toEqual({
      error: "accessDenied",
    });
    expect(mocked.client).not.toHaveBeenCalled();
    expect(await reviewContent("program", "en", {}, form)).toEqual({
      error: "accessDenied",
    });
  });
  it("rejects preference writes when there is no verified user", async () => {
    const form = new FormData();
    form.append("goals", "tourist");
    expect(await saveLearningGoals("en", {}, form)).toEqual({
      error: "saveError",
    });
    expect(mocked.client).not.toHaveBeenCalled();
  });
  it("rejects invalid goals even when the user is authenticated", async () => {
    mocked.user.mockResolvedValue({ id: "owner" });
    const form = new FormData();
    form.append("goals", "superadmin");
    expect(await saveLearningGoals("en", {}, form)).toEqual({
      error: "goalRequired",
    });
    expect(mocked.client).not.toHaveBeenCalled();
  });
  it("passes only allowed preferences to the owner-derived database RPC", async () => {
    mocked.user.mockResolvedValue({ id: "verified-user" });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mocked.client.mockResolvedValue({ rpc });
    const form = new FormData();
    form.append("goals", "organization_admin");
    form.set("user_id", "victim");
    form.set("is_admin", "true");
    await expect(saveLearningGoals("en", {}, form)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(rpc).toHaveBeenCalledExactlyOnceWith("set_learning_goals", {
      p_goals: ["organization_admin"],
    });
  });
  it("does not accept publication flags in a draft save", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      error: null,
    });
    mocked.admin.mockResolvedValue({ client: { rpc } });
    const form = new FormData();
    for (const [key, value] of Object.entries({
      title: "A path",
      slug: "a-path",
      summary: "A summary",
      category: "learn",
      published: "true",
      review_status: "approved",
    }))
      form.set(key, value);
    await expect(saveContent("program", "en", {}, form)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(rpc.mock.calls[0][1].p_data).not.toHaveProperty("published");
    expect(rpc.mock.calls[0][1].p_data).not.toHaveProperty("review_status");
  });
});
