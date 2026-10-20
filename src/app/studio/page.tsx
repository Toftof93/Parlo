import type { Metadata } from "next";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = { title: "Studio · Parlo" };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const { brief } = await searchParams;
  return (
    <main className="studio-page">
      <Studio initialBrief={brief?.slice(0, 4000)} />
    </main>
  );
}
