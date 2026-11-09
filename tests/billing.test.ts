import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
vi.mock("server-only", () => ({}));
import {
  decimalAmount,
  parseAmount,
  formatExactMoney,
  purchaseInput,
  type PurchaseOrder,
} from "@/lib/billing/schema";
import { billingConfig, available } from "@/lib/billing/config";
import {
  EsewaPaymentProvider,
  KhaltiPaymentProvider,
  StripePaymentProvider,
  hmac,
  esewaCallback,
  stripeSignature,
} from "@/lib/billing/providers";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
import ne from "../messages/ne.json";
import hi from "../messages/hi.json";
const order: PurchaseOrder = {
  id: "91000000-0000-4000-8000-000000000001",
  user_id: crypto.randomUUID(),
  price_id: crypto.randomUUID(),
  provider: "esewa",
  product: "premium",
  kind: "pass",
  currency: "NPR",
  amount_minor: 12345,
  tax_minor: 345,
  country: "NP",
  days: 30,
  interval: null,
  status: "pending",
  provider_reference: "91000000-0000-4000-8000-000000000001",
  customer_reference: null,
  subscription_reference: null,
  created_at: new Date().toISOString(),
  locale: "en",
};
const reply = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200 });
beforeEach(() => {
  vi.stubEnv("BILLING_MODE", "test");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "local-test-secret");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  vi.stubEnv("ESEWA_TEST_PRODUCT_CODE", "EPAYTEST");
  vi.stubEnv("ESEWA_TEST_SECRET", "fixture-secret");
  vi.stubEnv("KHALTI_SANDBOX_SECRET", "fixture-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("billing boundaries", () => {
  it("formats exact NPR/USD minor units and zero-decimal JPY", () => {
    expect(decimalAmount(12345, "NPR")).toBe("123.45");
    expect(decimalAmount(12345, "JPY")).toBe("12345");
    expect(parseAmount("1,234.50", "NPR")).toBe(123450);
    expect(() => parseAmount("1.5", "JPY")).toThrow();
    expect(() => parseAmount("1.001", "NPR")).toThrow();
    expect(formatExactMoney("900719925474099312", "USD", "en")).toContain(
      "9,007,199,254,740,993.12",
    );
  });
  it("rejects price overrides, forged user ids and unsupported currencies", () => {
    const v = {
      price: crypto.randomUUID(),
      provider: "esewa",
      country: "NP",
      key: crypto.randomUUID(),
      locale: "ne",
    };
    expect(purchaseInput.safeParse(v).success).toBe(true);
    expect(
      purchaseInput.safeParse({ ...v, amount: 1, user_id: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });
  it("locks out live Stripe keys and live mode", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_not-permitted");
    expect(billingConfig().stripe).toBe(false);
    vi.stubEnv("BILLING_MODE", "live");
    expect(billingConfig().ready).toBe(false);
  });
  it("limits wallets to declared Nepal/NPR passes independently of language", () => {
    expect(
      available(
        { provider: "esewa", country: "NP", currency: "NPR", kind: "pass" },
        "NP",
      ),
    ).toBe(true);
    expect(
      available(
        { provider: "esewa", country: "NP", currency: "NPR", kind: "pass" },
        "US",
      ),
    ).toBe(false);
    expect(
      available(
        { provider: "khalti", country: "NP", currency: "USD", kind: "pass" },
        "NP",
      ),
    ).toBe(false);
  });
  it("generates eSewa server signatures with exact total/tax and no exposed secret", async () => {
    const c = await new EsewaPaymentProvider().initiateCheckout(order);
    expect(c.fields?.total_amount).toBe("123.45");
    expect(c.fields?.amount).toBe("120.00");
    expect(c.fields?.signature).toBe(
      hmac(
        `total_amount=123.45,transaction_uuid=${order.id},product_code=EPAYTEST`,
        "fixture-secret",
      ),
    );
    expect(JSON.stringify(c)).not.toContain("fixture-secret");
  });
  it("verifies eSewa callback signature and then queries official backend status", async () => {
    const p = {
      transaction_code: "ref1",
      status: "COMPLETE",
      total_amount: "123.45",
      transaction_uuid: order.id,
      product_code: "EPAYTEST",
      signed_field_names:
        "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    };
    const signature = hmac(
      p.signed_field_names
        .split(",")
        .map((k) => `${k}=${p[k as keyof typeof p]}`)
        .join(","),
      "fixture-secret",
    );
    const data = Buffer.from(JSON.stringify({ ...p, signature })).toString(
      "base64",
    );
    expect(
      esewaCallback(data, "fixture-secret", order, "EPAYTEST").status,
    ).toBe("COMPLETE");
    const fetcher = vi.fn().mockResolvedValue(
      reply({
        product_code: "EPAYTEST",
        transaction_uuid: order.id,
        total_amount: 123.45,
        status: "COMPLETE",
        ref_id: "ref1",
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await new EsewaPaymentProvider().processCallback(order, { data })).state,
    ).toBe("paid");
    expect(fetcher.mock.calls[0][0]).toContain("https://uat.esewa.com.np/");
    expect(() => esewaCallback(data, "wrong-key", order, "EPAYTEST")).toThrow();
  });
  it("does not accept eSewa amount mismatch or unknown statuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply({
          product_code: "EPAYTEST",
          transaction_uuid: order.id,
          total_amount: 1,
          status: "COMPLETE",
        }),
      ),
    );
    await expect(
      new EsewaPaymentProvider().verifyPayment(order),
    ).rejects.toThrow("invalid_proof");
  });
  it("initiates Khalti using paisa, trusted return URL and purchase id", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      reply({
        pidx: "pidx_fixture",
        payment_url: "https://test-pay.khalti.com/?pidx=pidx_fixture",
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const c = await new KhaltiPaymentProvider().initiateCheckout({
      ...order,
      provider: "khalti",
    });
    expect(c.reference).toBe("pidx_fixture");
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.amount).toBe(12345);
    expect(body.purchase_order_id).toBe(order.id);
    expect(body.return_url).toContain("/api/billing/return/khalti");
    expect(body.customer_info).toBeUndefined();
  });
  it.each([
    ["Completed", "paid"],
    ["Pending", "pending"],
    ["User canceled", "cancelled"],
    ["Expired", "expired"],
    ["Refunded", "reversed"],
  ])("maps verified Khalti %s safely", async (status, state) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply({
          pidx: "pidx_fixture",
          total_amount: 12345,
          status,
          transaction_id: "ref",
        }),
      ),
    );
    expect(
      (
        await new KhaltiPaymentProvider().verifyPayment({
          ...order,
          provider: "khalti",
          provider_reference: "pidx_fixture",
        })
      ).state,
    ).toBe(state);
  });
  it("rejects forged Khalti return ids and offsite checkout URLs", async () => {
    await expect(
      new KhaltiPaymentProvider().processCallback(
        { ...order, provider_reference: "real" },
        { pidx: "forged" },
      ),
    ).rejects.toThrow("invalid_proof");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          reply({ pidx: "p", payment_url: "https://evil.invalid/" }),
        ),
    );
    await expect(
      new KhaltiPaymentProvider().initiateCheckout(order),
    ).rejects.toThrow("invalid_proof");
  });
  it("verifies Stripe raw signatures, replay tolerance and tampering", () => {
    const t = Math.floor(Date.now() / 1000),
      body = '{"id":"evt_fixture"}',
      sig = createHmac("sha256", "whsec_fixture")
        .update(`${t}.${body}`)
        .digest("hex");
    expect(() =>
      stripeSignature(body, `t=${t},v1=${sig}`, "whsec_fixture"),
    ).not.toThrow();
    expect(() =>
      stripeSignature(body + " ", `t=${t},v1=${sig}`, "whsec_fixture"),
    ).toThrow();
    expect(() =>
      stripeSignature(
        body,
        `t=${t},v1=${sig}`,
        "whsec_fixture",
        Date.now() + 600000,
      ),
    ).toThrow();
  });
  it("creates Stripe subscriptions with server snapshot and idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      reply({
        id: "cs_test_fixture",
        livemode: false,
        url: "https://checkout.stripe.com/c/pay/cs_test_fixture",
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    await new StripePaymentProvider().initiateCheckout({
      ...order,
      provider: "stripe",
      kind: "subscription",
      currency: "USD",
      interval: "month",
      days: null,
    });
    const body = fetcher.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("mode")).toBe("subscription");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("12345");
    expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toBe(order.id);
  });
  it("does not grant subscription access for unpaid renewal invoices", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          reply({
            livemode: false,
            client_reference_id: order.id,
            amount_total: 12345,
            currency: "usd",
            payment_status: "paid",
            status: "complete",
            subscription: "sub_fixture",
            customer: "cus_fixture",
          }),
        )
        .mockResolvedValueOnce(
          reply({
            livemode: false,
            metadata: { order_id: order.id },
            latest_invoice: {
              id: "in_fixture",
              currency: "usd",
              amount_paid: 0,
              status: "open",
            },
            items: {
              data: [
                {
                  current_period_start: 1793000000,
                  current_period_end: 1795600000,
                },
              ],
            },
            status: "past_due",
          }),
        ),
    );
    const p = await new StripePaymentProvider().verifyPayment({
      ...order,
      kind: "subscription",
      currency: "USD",
      provider: "stripe",
      provider_reference: "cs_test_fixture",
    });
    expect(p.state).toBe("pending");
  });
  it("normalizes timeout without exposing provider response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("secret provider details", "TimeoutError"),
        ),
    );
    await expect(
      new KhaltiPaymentProvider().verifyPayment({
        ...order,
        provider_reference: "pidx_fixture",
      }),
    ).rejects.toThrow("timeout");
  });
  it("provides full billing translation parity in four languages", () => {
    for (const m of [ja, ne, hi])
      expect(Object.keys(m.Billing).sort()).toEqual(
        Object.keys(en.Billing).sort(),
      );
    expect(ne.Billing.confirm).not.toBe(en.Billing.confirm);
  });
});

it("uses the paid Stripe invoice line period rather than advanced subscription dates", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      reply({
        livemode: false,
        client_reference_id: order.id,
        amount_total: 12345,
        currency: "usd",
        payment_status: "paid",
        status: "complete",
        subscription: "sub_fixture",
        customer: "cus_fixture",
      }),
    )
    .mockResolvedValueOnce(
      reply({
        livemode: false,
        metadata: { order_id: order.id },
        latest_invoice: {
          id: "in_paid",
          currency: "usd",
          amount_paid: 12345,
          status: "paid",
          lines: {
            data: [{ period: { start: 1793000000, end: 1795600000 } }],
            has_more: false,
          },
        },
        items: {
          data: [
            {
              current_period_start: 1795600000,
              current_period_end: 1798200000,
            },
          ],
        },
        status: "active",
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const p = await new StripePaymentProvider().verifyPayment({
    ...order,
    kind: "subscription",
    currency: "USD",
    provider: "stripe",
    provider_reference: "cs_test_fixture",
  });
  expect(p.state).toBe("paid");
  expect(p.periodEnd).toBe(new Date(1795600000 * 1000).toISOString());
  expect(p.receipt).toBe("in_paid");
});
it("wallet providers expose no automatic cancellation, recurrence or refund promise", async () => {
  for (const p of [new EsewaPaymentProvider(), new KhaltiPaymentProvider()]) {
    expect(p.capabilities.recurring).toBe(false);
    expect(p.capabilities.refund).toBe(false);
    await expect(p.cancelPayment(order)).rejects.toThrow("unsupported");
    await expect(p.requestRefund(order, "fixture")).rejects.toThrow(
      "unsupported",
    );
  }
});
