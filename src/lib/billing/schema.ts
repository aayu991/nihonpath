import { z } from "zod";
export const currencies = ["NPR", "JPY", "USD"] as const;
export const providers = ["stripe", "esewa", "khalti"] as const;
export const features = [
  "jlpt",
  "mock_exams",
  "flashcards",
  "ai_tutor",
  "business",
  "jft_ssw",
  "organizations",
] as const;
export const purchaseInput = z
  .object({
    price: z.uuid(),
    provider: z.enum(providers),
    country: z.string().regex(/^[A-Z]{2}$/),
    key: z.uuid(),
    locale: z.enum(["en", "ja", "ne", "hi"]),
  })
  .strict();
export const priceSchema = z.object({
  id: z.uuid(),
  product: z.string(),
  kind: z.enum(["subscription", "pass"]),
  interval: z.enum(["month", "year"]).nullable(),
  days: z.number().int().nullable(),
  country: z.string(),
  currency: z.enum(currencies),
  amount_minor: z.number().int().positive().max(1000000000),
  tax_minor: z.number().int().nonnegative(),
  provider: z.enum(providers),
  tax_label: z.string(),
  version: z.number().int(),
});
export type RegionalPrice = z.infer<typeof priceSchema>;
export const orderSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  price_id: z.uuid(),
  provider: z.enum(providers),
  product: z.string(),
  kind: z.enum(["subscription", "pass"]),
  currency: z.enum(currencies),
  amount_minor: z.number().int(),
  tax_minor: z.number().int(),
  country: z.string(),
  days: z.number().int().nullable(),
  interval: z.enum(["month", "year"]).nullable(),
  status: z.enum([
    "created",
    "pending",
    "paid",
    "failed",
    "cancelled",
    "expired",
    "reversed",
  ]),
  provider_reference: z.string().nullable(),
  customer_reference: z.string().nullable(),
  subscription_reference: z.string().nullable(),
  created_at: z.string(),
  locale: z.enum(["en", "ja", "ne", "hi"]),
});
export type PurchaseOrder = z.infer<typeof orderSchema>;
export function decimalAmount(minor: number, currency: string) {
  if (!Number.isSafeInteger(minor) || minor < 0)
    throw new Error("invalid_amount");
  return currency === "JPY"
    ? String(minor)
    : `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}
export function parseAmount(value: unknown, currency: string) {
  const s = String(value).replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("invalid_amount");
  const [a, b = ""] = s.split(".");
  const n =
    currency === "JPY"
      ? b && +b !== 0
        ? NaN
        : Number(a)
      : Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n < 0 || n > 1000000000)
    throw new Error("invalid_amount");
  return n;
}
export function formatMoney(minor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    minor / (currency === "JPY" ? 1 : 100),
  );
}
export function formatExactMoney(
  minor: string,
  currency: string,
  locale: string,
) {
  const n = BigInt(minor),
    factor = currency === "JPY" ? BigInt(1) : BigInt(100);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
  return formatter
    .formatToParts(n / factor)
    .map((p) =>
      p.type === "fraction"
        ? new Intl.NumberFormat(locale, {
            minimumIntegerDigits: 2,
            useGrouping: false,
          }).format(Number((n < BigInt(0) ? -n : n) % factor))
        : p.value,
    )
    .join("");
}
export type VerifiedPayment = {
  reference: string;
  event: string;
  state: "pending" | "paid" | "failed" | "cancelled" | "expired" | "reversed";
  amount: number;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  customer?: string;
  subscription?: string;
  receipt?: string;
  refundAmount?: number;
  refundReference?: string;
};
export type Checkout = {
  reference: string;
  url: string;
  fields?: Record<string, string>;
};
