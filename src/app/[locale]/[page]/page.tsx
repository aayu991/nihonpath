import { metadataFor } from "@/lib/seo/metadata";
import { isCategory } from "@/lib/platform/catalog";
import { CategoryLanding } from "@/components/platform/category-landing";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AccountForm, type FormMode } from "@/components/auth/account-form";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth/session";
import { Link } from "@/i18n/navigation";
import { StudyLinks } from "@/components/learning/study-links";
const authPages = [
  "login",
  "register",
  "forgot-password",
  "reset-password",
] as const;
const future = [
  "vocabulary",
  "grammar",
  "flashcards",
  "mock-tests",
  "business",
  "life-in-japan",
] as const;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; page: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale, page } = await params;
  const { notice } = await searchParams;
  const t = await getTranslations("Study");
  const p = await getTranslations("Preview");
  if (authPages.some((x) => x === page)) {
    if (page === "reset-password") await requireUser(locale);
    const mode = page as FormMode;
    const title = t(
      mode === "forgot-password"
        ? "forgot"
        : mode === "reset-password"
          ? "reset"
          : mode === "profile"
            ? "profile"
            : mode,
    );
    const noticeText =
      notice === "invalid-link"
        ? t("invalidLink")
        : notice === "password-updated"
          ? t("passwordUpdated")
          : notice === "session"
            ? t("signInRequired")
            : undefined;
    return (
      <section className="container auth-page">
        <div className="auth-story">
          <p className="eyebrow">NIHONPATH · 日本への第一歩</p>
          <h1>{title}</h1>
          <p>{t("intro")}</p>
          <div className="auth-kanji" aria-hidden="true">
            道
          </div>
          <Link href="/courses" className="text-link">
            {t("back")} →
          </Link>
        </div>
        <div className="auth-panel">
          {!supabaseConfig() && (
            <p className="form-message error">{t("unavailable")}</p>
          )}
          {noticeText && (
            <p role="status" className="form-message">
              {noticeText}
            </p>
          )}
          <AccountForm mode={mode} configured={!!supabaseConfig()} />
        </div>
      </section>
    );
  }
  if (page === "kanji") {
    const title = (await import("@/lib/seo/catalog")).seoText(
      "kanji",
      locale as "en" | "ja" | "ne" | "hi",
    ).title;
    return (
      <section className="container preview-page">
        <h1>{title}</h1>
        <p>{p("notice")}</p>
        <StudyLinks />
      </section>
    );
  }
  if (isCategory(page)) return <CategoryLanding category={page} />;
  if (!future.some((x) => x === page)) notFound();
  const key = page as (typeof future)[number];
  return (
    <section className="container preview-page">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{p(key)}</h1>
      {["vocabulary", "grammar", "flashcards", "mock-tests"].includes(page) ? (
        <StudyLinks />
      ) : (
        <>
          <p>{p("description")}</p>
          <p className="preview-notice">{p("notice")}</p>
        </>
      )}
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; page: string }>;
}) {
  const { locale, page } = await params;
  return metadataFor(page, locale);
}
