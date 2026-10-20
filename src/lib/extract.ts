// Splits a model reply into the plain-English notes and the Solidity source.
export function splitReply(text: string): { notes: string; code?: string } {
  const fence = text.match(/```(?:solidity|sol)?\s*\n([\s\S]*?)(?:```|$)/);
  if (!fence) return { notes: text.trim() };
  return { notes: text.slice(0, fence.index).trim(), code: fence[1].replace(/\s+$/, "") + "\n" };
}

/** The first contract name in a source file, for display. */
export function contractName(source: string): string | undefined {
  return source.match(/\bcontract\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
}
