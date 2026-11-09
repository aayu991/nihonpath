import { tutorWorkspace } from "@/lib/tutors/server";
import { TutorAvailability } from "@/components/tutors/availability";
export default async function Page() {
  return <TutorAvailability data={await tutorWorkspace()} />;
}
