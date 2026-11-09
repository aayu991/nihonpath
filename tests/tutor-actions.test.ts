import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  user: vi.fn(),
  admin: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.user }));
vi.mock("@/lib/platform/admin", () => ({ getAdminContext: m.admin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.client }));
import {
  requestTutorBooking,
  loadTutorSlots,
  tutorBookingAction,
  reviewTutorApplication,
  manageTutor,
  writeTutorReview,
  moderateTutorContent,
  purgeTutorPrivate,
} from "@/actions/tutors";
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: crypto.randomUUID() });
  m.admin.mockResolvedValue(null);
  m.client.mockResolvedValue({ rpc: m.rpc });
});
describe("tutor action boundaries", () => {
  it("denies expired sessions before attempting booking writes", async () => {
    m.user.mockResolvedValue(null);
    expect(
      await requestTutorBooking({
        id: crypto.randomUUID(),
        tutor: crypto.randomUUID(),
        type: crypto.randomUUID(),
        start: "2026-11-01T09:00:00Z",
        goals: "",
      }),
    ).toEqual({ error: "session" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("does not allow a client learner id or price override in a request", async () => {
    expect(
      await requestTutorBooking({
        id: crypto.randomUUID(),
        tutor: crypto.randomUUID(),
        type: crypto.randomUUID(),
        start: "2026-11-01T09:00:00Z",
        goals: "",
        learner_id: crypto.randomUUID(),
        price_minor: 0,
      }),
    ).toEqual({ error: "invalid" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("uses the server local-day slot endpoint and validates returned data", async () => {
    m.rpc.mockResolvedValue({ error: null, data: [] });
    const tutor = crypto.randomUUID(),
      type = crypto.randomUUID();
    expect(
      await loadTutorSlots({
        tutor,
        type,
        day: "2026-11-01",
        timezone: "America/New_York",
      }),
    ).toEqual({ slots: [] });
    expect(m.rpc).toHaveBeenCalledWith("tutor_local_slots", {
      p_tutor: tutor,
      p_type: type,
      p_day: "2026-11-01",
      p_zone: "America/New_York",
    });
  });
  it("reports a lost slot rather than a fake saved booking", async () => {
    m.rpc.mockResolvedValue({ error: { message: "Slot unavailable" } });
    expect(
      await requestTutorBooking({
        id: crypto.randomUUID(),
        tutor: crypto.randomUUID(),
        type: crypto.randomUUID(),
        start: "2026-11-01T09:00:00Z",
        goals: "",
      }),
    ).toEqual({ error: "slotGone" });
    expect(m.refresh).not.toHaveBeenCalled();
  });
  it("rejects arbitrary meeting URLs before database mutation", async () => {
    expect(
      await tutorBookingAction({
        id: crypto.randomUUID(),
        action: "meeting",
        expected: "2026-10-25T00:00:00Z",
        text: "https://evil.example/call",
      }),
    ).toEqual({ error: "invalid" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("keeps qualification verification behind independent admin membership and actual review attestation", async () => {
    const input = {
      tutor: crypto.randomUUID(),
      action: "approved",
      expected: "2026-10-25T00:00:00Z",
      notes: "Reviewed source evidence carefully.",
      verified: true,
      summary: "Reviewed qualification summary.",
      attested: false,
    };
    expect(await reviewTutorApplication(input)).toEqual({ error: "invalid" });
    expect(await reviewTutorApplication({ ...input, attested: true })).toEqual({
      error: "forbidden",
    });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("denies moderation and retention operations to ordinary accounts", async () => {
    expect(
      await moderateTutorContent({
        kind: "report",
        id: crypto.randomUUID(),
        action: "resolved",
        notes: "Trying an unauthorized moderation operation.",
      }),
    ).toEqual({ error: "forbidden" });
    expect(await purgeTutorPrivate()).toEqual({ error: "forbidden" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed ratings and unknown tutor commands without writes", async () => {
    expect(
      await writeTutorReview({
        booking: crypto.randomUUID(),
        rating: 6,
        body: "Not an allowed score",
      }),
    ).toEqual({ error: "invalid" });
    expect(await manageTutor("__proto__" as never, {})).toEqual({
      error: "invalid",
    });
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
