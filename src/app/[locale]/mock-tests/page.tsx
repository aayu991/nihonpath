import { redirect } from "@/i18n/navigation";
export default async function MockTests({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/exams", locale: locale === "ja" ? "ja" : "en" });
}
