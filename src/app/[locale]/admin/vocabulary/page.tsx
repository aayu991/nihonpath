import { CmsCatalogPage, type CmsSearch } from "@/components/cms/catalog-page";
export default function Page({ searchParams }: { searchParams: CmsSearch }) {
  return (
    <CmsCatalogPage
      kind="vocabulary"
      title="Vocabulary"
      searchParams={searchParams}
    />
  );
}
