import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("");
import { Homepage } from "@/components/home/homepage";
export default function Page() {
  return <Homepage />;
}
