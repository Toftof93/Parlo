import OpenAI from "openai";
import { aiReady, streamContract } from "@/lib/ai";
import { allow } from "@/lib/limit";

export const maxDuration = 300;

// Streams plain text: the notes, then the fenced contract.
export async function POST(req: Request) {
  if (!aiReady()) return Response.json({ error: "Parlo's AI isn't switched on yet. Start from a template in the meantime." }, { status: 503 });
  const { brief, current } = (await req.json().catch(() => ({}))) as { brief?: string; current?: string };
  if (!brief || brief.trim().length < 4) return Response.json({ error: "Tell Parlo what the contract should do." }, { status: 400 });
  if (brief.length > 4000 || (current?.length ?? 0) > 60000) return Response.json({ error: "That's too long. Keep the brief under 4,000 characters." }, { status: 400 });
  if (!allow(req)) return Response.json({ error: "You've hit today's free limit. Come back tomorrow." }, { status: 429 });

  const abort = new AbortController();
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const t of streamContract(brief.trim(), current, abort.signal)) ctrl.enqueue(enc.encode(t));
      } catch (err) {
        if (abort.signal.aborted) return;
        const msg = err instanceof OpenAI.RateLimitError ? "Parlo is busy right now. Try again in a minute." : "Something went wrong writing the contract. Try again.";
        ctrl.enqueue(enc.encode(`\n\n- ${msg}`));
      }
      ctrl.close();
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
