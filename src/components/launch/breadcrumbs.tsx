import { breadcrumbData } from "@/lib/seo/metadata";
import type { SeoLocale } from "@/lib/seo/catalog";
export function BreadcrumbMetadata({
  path,
  locale,
}: {
  path: string;
  locale: SeoLocale;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbData(path, locale)).replace(
          /</g,
          "\\u003c",
        ),
      }}
    />
  );
}
