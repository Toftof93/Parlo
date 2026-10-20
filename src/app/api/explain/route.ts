import { aiReady, explainLine } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!aiReady()) return Response.json({ error: "Explanations need Parlo's AI, which isn't switched on yet." }, { status: 503 });
  const { source, line } = (await req.json().catch(() => ({}))) as { source?: string; line?: number };
  if (!source || !line || source.length > 60000) return Response.json({ error: "Nothing to explain." }, { status: 400 });
  try {
    return Response.json({ text: await explainLine(source, line) });
  } catch {
    return Response.json({ error: "Couldn't explain that line. Try again." }, { status: 502 });
  }
}
