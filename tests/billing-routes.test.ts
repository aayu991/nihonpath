import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
  catalog: vi.fn(),
  available: vi.fn(),
  order: vi.fn(),
  verify: vi.fn(),
  log: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.client }));
vi.mock("@/lib/billing/config", () => ({
  billingConfig: () => ({
    origin: "http://localhost:3000",
    ready: false,
    stripe: false,
  }),
  available: m.available,
}));
vi.mock("@/lib/billing/server", () => ({
  billingCatalog: m.catalog,
  billingService: () => ({ rpc: m.rpc }),
  trustedOrder: m.order,
  verifyOrder: m.verify,
  logAttempt: m.log,
}));
import { POST as checkout } from "@/app/api/billing/checkout/route";
import { POST as manage } from "@/app/api/billing/manage/route";
import { POST as webhook } from "@/app/api/billing/webhook/stripe/route";
const user = crypto.randomUUID(),
  id = crypto.randomUUID();
const req = (body: unknown, origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/billing/checkout", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: user });
  m.client.mockResolvedValue({ rpc: m.rpc });
  m.catalog.mockResolvedValue({ prices: [], unavailable: false });
  m.available.mockReturnValue(false);
});
it("rejects unauthenticated checkout and account operations before provider calls", async () => {
  m.user.mockResolvedValue(null);
  expect((await checkout(req({}))).status).toBe(401);
  expect((await manage(req({}))).status).toBe(401);
  expect(m.rpc).not.toHaveBeenCalled();
  expect(m.order).not.toHaveBeenCalled();
});
it("rejects cross-origin purchase and cancellation requests", async () => {
  expect((await checkout(req({}, "https://evil.invalid"))).status).toBe(403);
  expect((await manage(req({}, "https://evil.invalid"))).status).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("rejects forged price/user data instead of forwarding it", async () => {
  const r = await checkout(
    req({
      price: id,
      provider: "esewa",
      country: "NP",
      locale: "en",
      key: crypto.randomUUID(),
      amount: 1,
      user_id: user,
    }),
  );
  expect(r.status).toBe(400);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("does not initiate a gateway without configured regional pricing", async () => {
  const r = await checkout(
    req({
      price: id,
      provider: "esewa",
      country: "NP",
      locale: "en",
      key: crypto.randomUUID(),
    }),
  );
  expect(r.status).toBe(503);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("prevents verification and cancellation of another learner purchase", async () => {
  m.order.mockResolvedValue({ id, user_id: crypto.randomUUID() });
  expect((await manage(req({ order: id, action: "verify" }))).status).toBe(403);
  expect(m.verify).not.toHaveBeenCalled();
});
it("returns unconfigured webhook state without pretending payment succeeded", async () => {
  expect(
    (await webhook(req({ type: "checkout.session.completed" }))).status,
  ).toBe(503);
  expect(m.verify).not.toHaveBeenCalled();
});
