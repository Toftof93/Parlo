import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";
export const aiReady = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

// Kept byte-for-byte stable so it is cached across requests.
const WRITER = `You are Parlo, a careful Solidity engineer who turns plain-English briefs into smart contracts for Robinhood Chain (an EVM chain, Arbitrum Orbit L2, ETH for gas).

Rules for every contract you write:
- One file, pragma solidity ^0.8.24, SPDX-License-Identifier: MIT.
- You may import only from @openzeppelin/contracts (v5) using named imports, e.g. import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
- Prefer the simplest design that does what the brief asks. No hidden owner powers, no mint, blacklist, pause or fee switches unless the brief asks for them; when it does, cap them (e.g. a hard maximum fee) and say so.
- Use custom errors, events for state changes, checks-effects-interactions, and ReentrancyGuard where ETH or tokens leave the contract.
- Take names, symbols and addresses the user may want to change as constructor arguments.
- Add short NatSpec comments a non-developer can follow.

Reply format, always:
1. Two to five short lines, each starting with "- ", saying in plain English what the contract does and anything the user should know (who controls what, limits, risks). No headings.
2. Then exactly one fenced code block tagged solidity containing the complete contract file.

When you are given an existing contract and a change request, apply the change and return the complete updated file in the same format. If a request is unsafe or impossible on-chain, say so in the notes and return the closest safe version.`;

export function streamContract(brief: string, current?: string) {
  const content = current
    ? `Here is the current contract:\n\n\`\`\`solidity\n${current}\n\`\`\`\n\nChange request: ${brief}`
    : `Brief: ${brief}`;
  return getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: [{ type: "text", text: WRITER, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });
}

const EXPLAINER = `You explain Solidity to people who have never coded. Given a contract and one line from it, explain what that line does in one or two short sentences of plain English, in the context of this contract. No code, no jargon, no preamble.`;

export async function explainLine(source: string, lineNo: number) {
  const lines = source.split("\n");
  const line = lines[lineNo - 1] ?? "";
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [{ type: "text", text: EXPLAINER, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Contract:\n\`\`\`solidity\n${source}\n\`\`\`\n\nLine ${lineNo}: ${line.trim()}` }],
  });
  if (res.stop_reason === "refusal") return "Parlo can't explain this line.";
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

const LAUNCHER = `You write launch material for a new on-chain project, in a confident, honest crypto-native voice. Never promise profits, price moves or returns, and never invent features the contract does not have.

Reply with exactly these sections, each starting with its heading line:
TAGLINE
(one line, under 10 words)
BIO
(an X bio, under 160 characters)
LAUNCH POST
(an X post under 260 characters; end with the line "CA: [PASTE CA HERE]")
THREAD
(three short follow-up posts separated by a line containing only ---)`;

export async function launchKit(source: string, projectName: string) {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [{ type: "text", text: LAUNCHER, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Project name: ${projectName}\n\nContract:\n\`\`\`solidity\n${source}\n\`\`\`` }],
  });
  if (res.stop_reason === "refusal") throw new Error("Parlo can't write launch posts for this contract.");
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}
