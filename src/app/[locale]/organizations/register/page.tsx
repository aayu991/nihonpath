import { requireUser } from "@/lib/auth/session";
import { OrganizationEntry } from "@/components/organizations/entry";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireUser((await params).locale);
  return <OrganizationEntry mode="register" />;
}
