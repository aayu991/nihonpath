import { tutorWorkspace } from "@/lib/tutors/server";
import { TutorDashboard } from "@/components/tutors/dashboard";
export default async function Page() {
  return <TutorDashboard data={await tutorWorkspace()} asTutor />;
}
