import type { Metadata } from "next";
import { loadGuides } from "@/lib/guides/server";
export async function generateMetadata(): Promise<Metadata> {
  const { demo } = await loadGuides();
  return demo ? { robots: { index: false, follow: false } } : {};
}
export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
