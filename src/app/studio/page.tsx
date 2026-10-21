import type { Metadata } from "next";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = { title: "Studio · Parlo" };

export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { brief, template, ...rest } = await searchParams;
  const values = Object.fromEntries(Object.entries(rest).filter((e): e is [string, string] => typeof e[1] === "string"));
  return (
    <main className="studio-page">
      <Studio initialBrief={brief?.slice(0, 4000)} initialTemplate={template} initialValues={values} aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />
    </main>
  );
}
