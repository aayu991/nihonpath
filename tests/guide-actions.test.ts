import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  user: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/platform/admin", () => ({ getAdminContext: mocks.admin }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
import {
  saveGuideContent,
  transitionGuideContent,
} from "@/actions/guide-admin";
import {
  saveGuidePreferences,
  saveGuideProgress,
  sendArticleFeedback,
} from "@/actions/guides";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue(null);
  mocks.user.mockResolvedValue(null);
  mocks.client.mockResolvedValue({ rpc: mocks.rpc });
});
describe("guide server action boundaries", () => {
  it("rejects unauthenticated persistence and learner editorial writes", async () => {
    expect(await saveGuidePreferences({})).toHaveProperty("error");
    expect(await saveGuideProgress({})).toHaveProperty("error");
    expect(await sendArticleFeedback({})).toHaveProperty("error");
    expect(await saveGuideContent({})).toHaveProperty("error");
    expect(await transitionGuideContent({})).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires actual human attestation and notes before review transitions", async () => {
    mocks.admin.mockResolvedValue({ client: { rpc: mocks.rpc } });
    const request = {
      kind: "article",
      id: crypto.randomUUID(),
      version: "2026-10-25",
      action: "approve",
      notes: "Reviewed current sources and Japanese content.",
      attested: false,
    };
    expect(await transitionGuideContent(request)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ error: null });
    expect(
      await transitionGuideContent({ ...request, attested: true }),
    ).toEqual({ ok: true });
  });
  it("does not pass a client owner ID to private progress RPCs", async () => {
    mocks.user.mockResolvedValue({ id: crypto.randomUUID() });
    const input = {
      itemId: crypto.randomUUID(),
      completed: true,
      notes: "Ask the official office.",
      dueDate: null,
      expected: null,
    };
    mocks.rpc.mockResolvedValue({
      error: null,
      data: {
        item_id: input.itemId,
        completed: true,
        notes: input.notes,
        due_date: null,
        item_version: 1,
        updated_at: "2026-10-25T00:00:00Z",
      },
    });
    expect(await saveGuideProgress(input)).toHaveProperty("data");
    expect(mocks.rpc).toHaveBeenCalledWith("save_guide_item", {
      p_item: input.itemId,
      p_completed: true,
      p_notes: input.notes,
      p_due: null,
      p_expected: null,
    });
    expect(
      await saveGuideProgress({ ...input, userId: crypto.randomUUID() }),
    ).toHaveProperty("error");
  });
  it("retains a meaningful stale-edit error and never reports an unsaved failure as success", async () => {
    mocks.user.mockResolvedValue({ id: crypto.randomUUID() });
    mocks.rpc.mockResolvedValue({
      error: { message: "Stale version" },
      data: null,
    });
    expect(
      await saveGuideProgress({
        itemId: crypto.randomUUID(),
        completed: true,
        notes: "",
        dueDate: null,
        expected: null,
      }),
    ).toEqual({ error: "stale" });
  });
});
