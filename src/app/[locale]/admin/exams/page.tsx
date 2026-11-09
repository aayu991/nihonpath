import { CmsCatalogPage, type CmsSearch } from "@/components/cms/catalog-page";
import { Link } from "@/i18n/navigation";
import { getCmsContext } from "@/lib/cms/server";
export default async function Page({
  searchParams,
}: {
  searchParams: CmsSearch;
}) {
  const ctx = await getCmsContext();
  return (
    <>
      <nav className="cms-actions" aria-label="Content management">
        <Link href="/admin/questions">Question banks</Link>
        <Link href="/admin/editor/guide_category">Guide categories</Link>
        <Link href="/admin/editor/guide_source">Official sources</Link>
        {ctx?.permissions.users && (
          <Link href="/admin/exams/legacy">Existing exams studio</Link>
        )}
      </nav>
      <CmsCatalogPage
        kind="exam"
        title="Examination assembly"
        searchParams={searchParams}
      />
    </>
  );
}
