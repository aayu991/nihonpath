export const notificationKinds = [
  "registration",
  "verification",
  "password_reset",
  "enrollment",
  "assignment",
  "booking_request",
  "booking_confirmed",
  "booking_cancelled",
  "payment_confirmed",
  "renewal_reminder",
  "membership_expired",
  "organization_invitation",
] as const;
export type NotificationKind = (typeof notificationKinds)[number];
const subjects = {
  en: [
    "Welcome to NihonPath",
    "Verify your email",
    "Reset your password",
    "Course enrollment update",
    "Course assignment update",
    "New lesson request",
    "Lesson booking confirmed",
    "Lesson booking cancelled",
    "Payment verified",
    "Access renewal reminder",
    "Access period expired",
    "Organization invitation",
  ],
  ja: [
    "NihonPathへようこそ",
    "メールアドレスの確認",
    "パスワードの再設定",
    "コース登録のお知らせ",
    "課題のお知らせ",
    "レッスン申込のお知らせ",
    "レッスン予約が確定しました",
    "レッスン予約がキャンセルされました",
    "決済確認のお知らせ",
    "アクセス更新のお知らせ",
    "アクセス期間が終了しました",
    "組織への招待",
  ],
  ne: [
    "NihonPath मा स्वागत छ",
    "इमेल प्रमाणित गर्नुहोस्",
    "पासवर्ड पुनः सेट गर्नुहोस्",
    "पाठ्यक्रम भर्ना सूचना",
    "पाठ्यक्रम कार्य सूचना",
    "नयाँ पाठ अनुरोध",
    "पाठ बुकिङ पुष्टि",
    "पाठ बुकिङ रद्द",
    "भुक्तानी प्रमाणित",
    "पहुँच नवीकरण सम्झना",
    "पहुँच अवधि सकियो",
    "संस्थाको निमन्त्रणा",
  ],
  hi: [
    "NihonPath में स्वागत है",
    "ईमेल सत्यापित करें",
    "पासवर्ड रीसेट करें",
    "पाठ्यक्रम नामांकन सूचना",
    "पाठ्यक्रम कार्य सूचना",
    "नया पाठ अनुरोध",
    "पाठ बुकिंग की पुष्टि",
    "पाठ बुकिंग रद्द",
    "भुगतान सत्यापित",
    "पहुँच नवीकरण अनुस्मारक",
    "पहुँच अवधि समाप्त",
    "संस्थान का आमंत्रण",
  ],
};
const bodies = {
  en: "An account update is available. Sign in to NihonPath to review the current status. This email contains no private lesson, payment or conversation details.",
  ja: "アカウントの更新があります。NihonPathにログインして現在の状況をご確認ください。このメールに個人の授業・決済・会話の詳細は含まれません。",
  ne: "खातामा नयाँ सूचना छ। हालको स्थिति हेर्न NihonPath मा लग इन गर्नुहोस्। यस इमेलमा निजी पाठ, भुक्तानी वा कुराकानी विवरण छैन।",
  hi: "खाते में नई सूचना उपलब्ध है। वर्तमान स्थिति देखने के लिए NihonPath में लॉग इन करें। इस ईमेल में निजी पाठ, भुगतान या बातचीत का विवरण नहीं है।",
};
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ]!,
  );
export function renderNotification(
  kind: NotificationKind,
  locale: "en" | "ja" | "ne" | "hi",
  origin: string,
) {
  const u = new URL(origin);
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
    throw new Error("invalid_origin");
  const subject = subjects[locale][notificationKinds.indexOf(kind)];
  if (!subject) throw new Error("invalid_kind");
  const path = kind.startsWith("booking")
    ? "/dashboard/lessons"
    : kind === "payment_confirmed" ||
        kind === "renewal_reminder" ||
        kind === "membership_expired"
      ? "/billing"
      : "/dashboard";
  const url = `${u.origin}/${locale}${path}`;
  return {
    subject,
    text: `${subject}\n\n${bodies[locale]}\n\n${url}`,
    html: `<!doctype html><html lang="${locale}"><body style="font-family:Arial,sans-serif;color:#142c46"><h1>${escape(subject)}</h1><p>${escape(bodies[locale])}</p><p><a href="${escape(url)}">NihonPath</a></p></body></html>`,
  };
}
