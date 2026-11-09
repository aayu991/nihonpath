import type { MetadataRoute } from "next";
import { environmentReport } from "@/lib/launch/environment";
import { seoLocales } from "@/lib/seo/catalog";
export default function robots(): MetadataRoute.Robots {
  const c = environmentReport();
  return {
    rules: c.indexing
      ? {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/api/",
            ...seoLocales.flatMap((l) =>
              [
                "admin",
                "dashboard",
                "billing",
                "checkout",
                "tutor",
                "organization",
                "onboarding",
                "login",
                "register",
                "forgot-password",
                "reset-password",
                "auth",
                "contact?",
              ].map((p) => `/${l}/${p}`),
            ),
            "/*?*",
          ],
        }
      : { userAgent: "*", disallow: "/" },
    ...(c.indexing ? { sitemap: `${c.origin}/sitemap.xml` } : {}),
  };
}
