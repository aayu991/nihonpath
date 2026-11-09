import type { Metadata } from "next";
import { environmentReport } from "@/lib/launch/environment";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "../globals.css";
export const metadata: Metadata = {
  title: {
    default: "NihonPath — Your path to Japanese",
    template: "%s | NihonPath",
  },
  description:
    "Learn Japanese and discover your path to Japan. Independent N5 and N4 vocabulary and grammar practice.",
  robots: { index: false, follow: true },
};
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Common");
  const origin = environmentReport().origin;
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <NextIntlClientProvider>
          <a href="#main" className="skip-link">
            {t("skip")}
          </a>
          <Header />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          {origin && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: "NihonPath",
                  url: `${origin}/${locale}`,
                  inLanguage: locale,
                }).replace(/</g, "\\u003c"),
              }}
            />
          )}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
