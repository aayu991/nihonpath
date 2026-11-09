import { requireUser } from "@/lib/auth/session";
import { tutorWorkspace } from "@/lib/tutors/server";
import { TutorDashboard } from "@/components/tutors/dashboard";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireUser((await params).locale);
  return <TutorDashboard data={await tutorWorkspace()} asTutor={false} />;
}
