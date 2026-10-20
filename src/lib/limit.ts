import "server-only";

// Soft per-IP limit to keep a viral day from becoming a big bill. In-memory, so it
// resets per server instance; good enough to stop casual abuse.
const hits = new Map<string, number[]>();
const DAY = 24 * 60 * 60 * 1000;
export const DAILY = Number(process.env.PARLO_DAILY_LIMIT ?? 10);

export function allow(req: Request, cost = 1): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < DAY);
  if (recent.length + cost > DAILY) return false;
  for (let i = 0; i < cost; i++) recent.push(now);
  hits.set(ip, recent);
  return true;
}
