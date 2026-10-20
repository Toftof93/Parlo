import { aiReady, launchKit } from "@/lib/ai";
import { allow } from "@/lib/limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!aiReady()) return Response.json({ error: "The Launch Kit needs Parlo's AI, which isn't switched on yet." }, { status: 503 });
  const { source, name } = (await req.json().catch(() => ({}))) as { source?: string; name?: string };
  if (!source || source.length > 60000) return Response.json({ error: "Write or pick a contract first." }, { status: 400 });
  if (!allow(req)) return Response.json({ error: "You've hit today's free limit. Come back tomorrow." }, { status: 429 });
  try {
    return Response.json({ text: await launchKit(source, (name || "My project").slice(0, 60)) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Couldn't write the Launch Kit." }, { status: 502 });
  }
}
