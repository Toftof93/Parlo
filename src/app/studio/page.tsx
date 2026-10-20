import type { Metadata } from "next";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = { title: "Studio · Parlo" };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ brief?: string; template?: string }> }) {
  const { brief, template } = await searchParams;
  return (
    <main className="studio-page">
      <Studio initialBrief={brief?.slice(0, 4000)} initialTemplate={template} aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />
    </main>
  );
}
