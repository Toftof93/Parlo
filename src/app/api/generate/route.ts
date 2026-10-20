import Anthropic from "@anthropic-ai/sdk";
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

  const stream = streamContract(brief.trim(), current);
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      stream.on("text", (t) => ctrl.enqueue(enc.encode(t)));
      try {
        const msg = await stream.finalMessage();
        if (msg.stop_reason === "refusal") ctrl.enqueue(enc.encode("\n\n- Parlo can't write this one. Try describing it differently."));
        else if (msg.stop_reason === "max_tokens") ctrl.enqueue(enc.encode("\n\n- The contract got too long and was cut off. Ask for a simpler version."));
      } catch (err) {
        const msg = err instanceof Anthropic.RateLimitError ? "Parlo is busy right now. Try again in a minute." : "Something went wrong writing the contract. Try again.";
        ctrl.enqueue(enc.encode(`\n\n- ${msg}`));
      }
      ctrl.close();
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
