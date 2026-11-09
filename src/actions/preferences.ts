"use server";
import { cookies } from "next/headers";
import { localeSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
export async function setPreferredLanguage(value: string) {
  const locale = localeSchema.parse(value);
  const client = await createClient();
  if (client) {
    try {
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (error && error.name !== "AuthSessionMissingError") return false;
      if (user) {
        const result = await client
          .from("profiles")
          .update({ preferred_language: locale })
          .eq("id", user.id)
          .select("id")
          .single();
        if (result.error) return false;
      }
    } catch {
      return false;
    }
  }
  (await cookies()).set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 31536000,
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}
