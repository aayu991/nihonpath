import { tutorWorkspace } from "@/lib/tutors/server";
import { TutorApplication } from "@/components/tutors/application";
export default async function Page() {
  return <TutorApplication data={await tutorWorkspace()} />;
}
