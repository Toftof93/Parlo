import { compile } from "@/lib/compile";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { source } = (await req.json().catch(() => ({}))) as { source?: string };
  if (!source || source.length > 100000) return Response.json({ error: "Nothing to compile." }, { status: 400 });
  return Response.json(compile(source));
}
