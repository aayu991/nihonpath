import "server-only";
import { renderNotification, type NotificationKind } from "./templates";
export interface EmailTransport {
  send(input: {
    id: string;
    to: string;
    kind: NotificationKind;
    locale: "en" | "ja" | "ne" | "hi";
  }): Promise<string>;
}
export function emailEnabled() {
  return (
    process.env.EMAIL_DELIVERY_ENABLED === "true" &&
    process.env.EMAIL_PROVIDER_APPROVED === "true" &&
    process.env.EMAIL_PROVIDER === "resend" &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.EMAIL_FROM &&
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
  );
}
export class ApprovedEmailTransport implements EmailTransport {
  async send(input: Parameters<EmailTransport["send"]>[0]) {
    if (!emailEnabled()) throw new Error("email_disabled");
    const template = renderNotification(
      input.kind,
      input.locale,
      process.env.NEXT_PUBLIC_SITE_URL!,
    );
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `nihonpath-${input.id}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        ...template,
      }),
    });
    if (!r.ok) throw new Error("email_failed");
    const p = await r.json();
    if (typeof p.id !== "string" || p.id.length > 200)
      throw new Error("email_failed");
    return p.id;
  }
}
