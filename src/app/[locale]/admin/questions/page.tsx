import { CmsCatalogPage, type CmsSearch } from "@/components/cms/catalog-page";
export default function Page({ searchParams }: { searchParams: CmsSearch }) {
  return (
    <CmsCatalogPage
      kind="bank"
      title="Question banks"
      searchParams={searchParams}
    />
  );
}
