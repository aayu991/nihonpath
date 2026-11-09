import { CmsCatalogPage, type CmsSearch } from "@/components/cms/catalog-page";
import { cmsKind } from "@/lib/cms/schema";
import { notFound } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: CmsSearch;
}) {
  const p = cmsKind.safeParse((await params).kind);
  if (!p.success) notFound();
  return (
    <CmsCatalogPage
      kind={p.data}
      title={
        p.data === "bank"
          ? "Question banks"
          : p.data[0].toUpperCase() + p.data.slice(1)
      }
      searchParams={searchParams}
    />
  );
}
