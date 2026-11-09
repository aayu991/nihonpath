import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("tutors");
import { tutorCatalog } from "@/lib/tutors/server";
import { TutorDiscovery } from "@/components/tutors/discovery";
export default async function Page() {
  const data = await tutorCatalog();
  return <TutorDiscovery {...data} />;
}
