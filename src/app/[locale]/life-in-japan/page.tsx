import { redirect } from "next/navigation";
export default async function LifeGuide({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/japan-guide`);
}
