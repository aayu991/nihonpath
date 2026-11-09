"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth/session";
import { reportFailure } from "@/lib/launch/server";
import {
  credentialsSchema,
  registrationSchema,
  profileSchema,
  resetSchema,
  localeSchema,
} from "@/lib/auth/validation";
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
}
function message(locale: string, en: string, ja: string) {
  return locale === "ja" ? ja : en;
}
export async function accountAction(
  mode: string,
  localeInput: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeSchema.parse(localeInput);
  const client = await createClient();
  if (!client)
    return {
      status: "error",
      message: message(
        locale,
        "Supabase is not configured yet. Demo learning is available.",
        "Supabaseの設定が必要です。デモ学習は利用できます。",
      ),
    };
  const input = Object.fromEntries(form);
  const protectedUser =
    mode === "reset-password" || mode === "profile"
      ? await requireUser(locale)
      : null;
  let destination: string | null = null;
  try {
    if (mode === "register") {
      const parsed = registrationSchema.safeParse(input);
      if (!parsed.success)
        return {
          status: "error",
          message: message(
            locale,
            "Check all fields. Use 12–128 characters with uppercase, lowercase and a number; passwords must match.",
            "入力を確認してください。パスワードは12〜128文字で英大文字・小文字・数字を含み、一致する必要があります。",
          ),
        };
      const { email, password, confirmPassword: _, ...profile } = parsed.data;
      void _;
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: profile,
          emailRedirectTo: `${siteUrl()}/${locale}/auth/confirm`,
        },
      });
      if (error)
        return {
          status: "error",
          message: message(
            locale,
            "Registration could not be completed. Try again later or log in if you already have an account.",
            "登録できませんでした。時間をおいて再試行するか、既存のアカウントでログインしてください。",
          ),
        };
      return {
        status: "success",
        message: message(
          locale,
          "Check your inbox for a confirmation email. If this address already has an account, log in or reset your password.",
          "確認メールをご確認ください。すでに登録済みの場合はログインまたはパスワード再設定を行ってください。",
        ),
      };
    }
    if (mode === "login") {
      const parsed = credentialsSchema.safeParse(input);
      if (!parsed.success)
        return {
          status: "error",
          message: message(
            locale,
            "Enter a valid email and password.",
            "メールアドレスとパスワードを確認してください。",
          ),
        };
      const { error } = await client.auth.signInWithPassword(parsed.data);
      if (error) {
        await reportFailure("auth_failure");
        return {
          status: "error",
          message: message(
            locale,
            "Unable to sign in. Check your credentials and verify your email, or try again later.",
            "ログインできません。入力内容とメール認証をご確認のうえ、再試行してください。",
          ),
        };
      }
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user)
        return { status: "error", message: "Session verification failed." };
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("preferred_language,onboarding_completed_at")
        .eq("id", user.id)
        .single();
      if (profileError) {
        await reportFailure("database_failure");
        await client.auth.signOut();
        return {
          status: "error",
          message: message(
            locale,
            "Your profile could not be loaded. Check the database setup and try again.",
            "プロフィールを読み込めません。データベース設定をご確認ください。",
          ),
        };
      }
      const preferred = profile.preferred_language;
      (await cookies()).set("NEXT_LOCALE", preferred, {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
        secure: process.env.NODE_ENV === "production",
      });
      destination = profile.onboarding_completed_at
        ? `/${preferred}/dashboard`
        : `/${preferred}/onboarding`;
    } else if (mode === "forgot-password") {
      const email = z.email().max(254).safeParse(input.email);
      if (!email.success)
        return {
          status: "error",
          message: message(
            locale,
            "Enter a valid email address.",
            "有効なメールアドレスを入力してください。",
          ),
        };
      const { error } = await client.auth.resetPasswordForEmail(email.data, {
        redirectTo: `${siteUrl()}/${locale}/auth/confirm`,
      });
      if (error)
        return {
          status: "error",
          message: message(
            locale,
            "We could not process the request. Please try again later.",
            "処理できませんでした。時間をおいて再試行してください。",
          ),
        };
      return {
        status: "success",
        message: message(
          locale,
          "If an account exists, a password-reset email will arrive shortly.",
          "登録されたアドレスの場合、再設定メールが届きます。",
        ),
      };
    } else if (mode === "reset-password") {
      const parsed = resetSchema.safeParse(input);
      if (!parsed.success)
        return {
          status: "error",
          message: message(
            locale,
            "Passwords must match and contain 12–128 characters, uppercase, lowercase and a number.",
            "パスワードは12〜128文字で英大文字・小文字・数字を含み、一致する必要があります。",
          ),
        };
      const { error } = await client.auth.updateUser({
        password: parsed.data.password,
      });
      if (error)
        return {
          status: "error",
          message: message(
            locale,
            "Password update failed. Request a new reset email and try again.",
            "更新できませんでした。再設定メールを再度送信してください。",
          ),
        };
      const { error: logoutError } = await client.auth.signOut({
        scope: "global",
      });
      if (logoutError)
        return {
          status: "success",
          message: message(
            locale,
            "Password updated. Please log out to close this session.",
            "パスワードを更新しました。ログアウトしてください。",
          ),
        };
      destination = `/${locale}/login?notice=password-updated`;
    } else if (mode === "profile") {
      const user = protectedUser;
      if (!user)
        return { status: "error", message: "Session verification failed." };
      const parsed = profileSchema.safeParse(input);
      if (!parsed.success)
        return {
          status: "error",
          message: message(
            locale,
            "Check your profile fields.",
            "プロフィールの入力を確認してください。",
          ),
        };
      const { error, data } = await client
        .from("profiles")
        .update(parsed.data)
        .eq("id", user.id)
        .select("id")
        .single();
      if (error || !data)
        return {
          status: "error",
          message: message(
            locale,
            "Profile could not be saved. Please try again.",
            "保存できませんでした。再試行してください。",
          ),
        };
      (await cookies()).set("NEXT_LOCALE", parsed.data.preferred_language, {
        path: "/",
        sameSite: "lax",
        maxAge: 31536000,
        secure: process.env.NODE_ENV === "production",
      });
      destination = `/${parsed.data.preferred_language}/dashboard/profile?saved=1`;
    } else if (mode !== "login")
      return { status: "error", message: "Invalid action." };
  } catch {
    return {
      status: "error",
      message: message(
        locale,
        "The service is unavailable. Check your connection and try again.",
        "サービスに接続できません。接続をご確認のうえ、再試行してください。",
      ),
    };
  }
  if (destination) {
    revalidatePath("/", "layout");
    redirect(destination);
  }
  return { status: "error", message: "Unable to complete request." };
}
export async function logout(localeInput: string) {
  const locale = localeSchema.parse(localeInput);
  const client = await createClient();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) redirect(`/${locale}/dashboard?notice=logout-error`);
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}
export async function confirmEmail(localeInput: string, form: FormData) {
  const locale = localeSchema.parse(localeInput);
  const token = form.get("token_hash");
  const type = form.get("type");
  if (
    typeof token !== "string" ||
    token.length > 1024 ||
    !["signup", "recovery"].includes(String(type))
  )
    redirect(`/${locale}/login?notice=invalid-link`);
  const client = await createClient();
  if (!client) redirect(`/${locale}/login?notice=configuration`);
  let valid = false;
  try {
    const { error } = await client.auth.verifyOtp({
      token_hash: token,
      type: type as "signup" | "recovery",
    });
    valid = !error;
  } catch {
    /* Generic invalid-link message below. */
  }
  if (!valid) redirect(`/${locale}/login?notice=invalid-link`);
  revalidatePath("/", "layout");
  redirect(
    type === "recovery" ? `/${locale}/reset-password` : `/${locale}/onboarding`,
  );
}
