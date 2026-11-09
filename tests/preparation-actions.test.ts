import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/platform/admin", () => ({ getAdminContext: mocks.admin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import {
  savePreparation,
  reviewPreparation,
  uploadPreparationAudio,
  verifyPreparationAudio,
} from "@/actions/preparation-admin";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue(null);
});
describe("preparation server boundaries", () => {
  it("rejects learner editorial, upload and verification operations", async () => {
    expect(
      await savePreparation({
        kind: "sector",
        id: null,
        version: null,
        document: "{}",
      }),
    ).toHaveProperty("error");
    expect(
      await reviewPreparation({
        kind: "sector",
        id: crypto.randomUUID(),
        version: "2026-10-24",
        action: "publish",
      }),
    ).toHaveProperty("error");
    expect(await uploadPreparationAudio(new FormData())).toHaveProperty(
      "error",
    );
    expect(
      await verifyPreparationAudio(crypto.randomUUID(), 30, true),
    ).toHaveProperty("error");
  });
  it("rejects incomplete documents before calling an admin write RPC", async () => {
    const rpc = vi.fn();
    mocks.admin.mockResolvedValue({ client: { rpc } });
    expect(
      await savePreparation({
        kind: "scenario",
        id: null,
        version: null,
        document: "{}",
      }),
    ).toHaveProperty("error");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not trust claimed audio verification without actual reviewer confirmation", async () => {
    const rpc = vi.fn();
    mocks.admin.mockResolvedValue({ client: { rpc } });
    expect(
      await verifyPreparationAudio(crypto.randomUUID(), 30, false),
    ).toHaveProperty("error");
    expect(
      await verifyPreparationAudio(crypto.randomUUID(), 0, true),
    ).toHaveProperty("error");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("passes whitelisted content and expected version without role or publication flags", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: crypto.randomUUID(), error: null });
    mocks.admin.mockResolvedValue({ client: { rpc } });
    await savePreparation({
      kind: "sector",
      id: null,
      version: null,
      document: JSON.stringify({
        slug: "new-track",
        title: "Track",
        title_ja: "分野",
        summary: "A new learning track.",
        summary_ja: "日本語を学びます。",
        course_id: crypto.randomUUID(),
        is_admin: true,
        published: true,
      }),
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1].p_data).not.toHaveProperty("published");
    expect(rpc.mock.calls[0][1].p_data).not.toHaveProperty("is_admin");
  });
});
