import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
const m = vi.hoisted(() => ({
  request: vi.fn(),
  cancel: vi.fn(),
  order: vi.fn(),
  apply: vi.fn(),
  verify: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/billing/config", () => ({
  billingConfig: () => ({ stripe: true }),
}));
vi.mock("@/lib/billing/server", () => ({
  trustedOrder: m.order,
  applyProof: m.apply,
  verifyOrder: m.verify,
  billingService: () => ({ rpc: m.rpc }),
}));
vi.mock("@/lib/billing/providers", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/billing/providers")>();
  return {
    ...original,
    StripePaymentProvider: class {
      request(...args: unknown[]) {
        return m.request(...args);
      }
      cancelPayment(...args: unknown[]) {
        return m.cancel(...args);
      }
    },
  };
});
import { POST } from "@/app/api/billing/webhook/stripe/route";
const id = crypto.randomUUID();
function event(type: string, object: unknown, valid = true) {
  const body = JSON.stringify({
      id: "evt_fixture",
      type,
      livemode: false,
      data: { object },
    }),
    time = Math.floor(Date.now() / 1000),
    sig = createHmac("sha256", "whsec_fixture")
      .update(`${time}.${body}`)
      .digest("hex");
  return new Request("http://localhost:3000/api/billing/webhook/stripe", {
    method: "POST",
    headers: { "stripe-signature": `t=${time},v1=${valid ? sig : "invalid"}` },
    body,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  m.order.mockResolvedValue({
    id,
    provider: "stripe",
    provider_reference: "cs_test_fixture",
    subscription_reference: null,
    amount_minor: 1500,
    currency: "USD",
  });
  m.rpc.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
it("rechecks signed Checkout events against backend state rather than event status", async () => {
  const r = await POST(
    event("checkout.session.completed", {
      metadata: { order_id: id },
      payment_status: "paid",
    }),
  );
  expect(r.status).toBe(200);
  expect(m.verify).toHaveBeenCalledWith(
    expect.objectContaining({ id }),
    undefined,
    true,
  );
  expect(m.apply).not.toHaveBeenCalled();
});
it("rejects unsigned or tampered webhook bodies before any trusted state change", async () => {
  expect(
    (
      await POST(
        event(
          "checkout.session.completed",
          { metadata: { order_id: id } },
          false,
        ),
      )
    ).status,
  ).toBe(500);
  expect(m.order).not.toHaveBeenCalled();
  expect(m.apply).not.toHaveBeenCalled();
});
it("cancels renewal when a verified refund races the initial subscription activation", async () => {
  m.request
    .mockResolvedValueOnce({ data: [] })
    .mockResolvedValueOnce({ data: [{ invoice: "in_fixture" }] })
    .mockResolvedValueOnce({
      parent: { subscription_details: { subscription: "sub_fixture" } },
    })
    .mockResolvedValueOnce({ metadata: { order_id: id } })
    .mockResolvedValueOnce({ subscription: "sub_fixture" });
  const r = await POST(
    event("charge.refunded", {
      id: "ch_fixture",
      payment_intent: "pi_fixture",
      amount_refunded: 1500,
    }),
  );
  expect(r.status).toBe(200);
  expect(m.apply).toHaveBeenCalledWith(
    expect.objectContaining({ id }),
    expect.objectContaining({
      state: "reversed",
      refundReference: "charge:ch_fixture",
    }),
  );
  expect(m.cancel).toHaveBeenCalledWith(
    expect.objectContaining({ subscription_reference: "sub_fixture" }),
  );
});
it("subscription deletion expires access without recording a financial refund", async () => {
  const r = await POST(
    event("customer.subscription.deleted", { metadata: { order_id: id } }),
  );
  expect(r.status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("billing_subscription_end", {
    p_order: id,
    p_event: "evt_fixture",
  });
  expect(m.apply).not.toHaveBeenCalled();
});
