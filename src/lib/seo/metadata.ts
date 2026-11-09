import type { Metadata } from "next";
import { environmentReport } from "@/lib/launch/environment";
import {
  seoLocales,
  seoText,
  publicSeo,
  type SeoLocale,
  type SeoKey,
} from "./catalog";
export function metadataFor(
  path: string,
  localeInput: string,
  override?: {
    title: string;
    description: string;
    translated?: readonly SeoLocale[];
    indexable?: boolean;
  },
): Metadata {
  const locale = seoLocales.includes(localeInput as SeoLocale)
      ? (localeInput as SeoLocale)
      : "en",
    config = environmentReport(),
    entry = publicSeo[path],
    text = override ?? seoText(entry?.key ?? "home", locale),
    origin = config.origin ?? "http://localhost:3000",
    url = `${origin}/${locale}${path ? "/" + path : ""}`,
    translated = override?.translated ?? entry?.locales ?? [],
    eligible = override?.indexable ?? entry?.indexable ?? false;
  const languages = Object.fromEntries(
    translated.map((l) => [l, `${origin}/${l}${path ? "/" + path : ""}`]),
  );
  if (translated.includes("en"))
    languages["x-default"] = `${origin}/en${path ? "/" + path : ""}`;
  return {
    metadataBase: new URL(origin),
    title: text.title,
    description: text.description,
    alternates: {
      canonical: url,
      ...(translated.includes(locale) ? { languages } : {}),
    },
    robots: {
      index: config.indexing && eligible && translated.includes(locale),
      follow: true,
    },
    openGraph: {
      type: "website",
      siteName: "NihonPath",
      title: text.title,
      description: text.description,
      url,
      locale: { en: "en_US", ja: "ja_JP", ne: "ne_NP", hi: "hi_IN" }[locale],
      images: [
        {
          url: `${origin}/social-card.png`,
          width: 1200,
          height: 630,
          alt: "NihonPath — Japanese learning worldwide",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: text.title,
      description: text.description,
      images: [`${origin}/social-card.png`],
    },
  };
}
export function pageMetadata(path: string) {
  return async ({ params }: { params: Promise<{ locale: string }> }) =>
    metadataFor(path, (await params).locale);
}
export function privateMetadata(key: SeoKey = "home") {
  return async ({ params }: { params: Promise<{ locale: string }> }) => {
    const l = (await params).locale as SeoLocale;
    return {
      title: seoText(key, seoLocales.includes(l) ? l : "en").title,
      robots: { index: false, follow: false },
    };
  };
}
export function breadcrumbData(path: string, locale: SeoLocale) {
  const c = environmentReport(),
    origin = c.origin ?? "http://localhost:3000",
    entry = publicSeo[path];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "NihonPath",
        item: `${origin}/${locale}`,
      },
      ...(path && entry
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: seoText(entry.key, locale).title,
              item: `${origin}/${locale}/${path}`,
            },
          ]
        : []),
    ],
  };
}
