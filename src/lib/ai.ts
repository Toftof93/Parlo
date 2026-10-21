import "server-only";
import OpenAI from "openai";

// Any OpenAI chat model works; set OPENAI_MODEL in Vercel to change it.
export const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
export const aiReady = () => Boolean(process.env.OPENAI_API_KEY);

let client: OpenAI | undefined;
const getClient = () => (client ??= new OpenAI());

// Reasoning models take an effort level; older models reject it.
const effort = (level: "low" | "medium") => (/^(gpt-5|o\d)/.test(MODEL) ? { reasoning_effort: level } : {});

async function ask(system: string, user: string, maxTokens: number) {
  const res = await getClient().chat.completions.create({
    model: MODEL,
    max_completion_tokens: maxTokens,
    ...effort("low"),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const choice = res.choices[0];
  return { text: (choice?.message.content ?? "").trim(), refused: Boolean(choice?.message.refusal) };
}

// Kept stable so the provider can cache it across requests.
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

// Yields the reply as it is written, then a closing note if it was cut short.
export async function* streamContract(brief: string, current?: string, signal?: AbortSignal) {
  const content = current
    ? `Here is the current contract:\n\n\`\`\`solidity\n${current}\n\`\`\`\n\nChange request: ${brief}`
    : `Brief: ${brief}`;
  const stream = await getClient().chat.completions.create(
    {
      model: MODEL,
      max_completion_tokens: 32000,
      ...effort("medium"),
      stream: true,
      messages: [
        { role: "system", content: WRITER },
        { role: "user", content },
      ],
    },
    { signal },
  );
  let finish: string | null = null;
  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    if (choice?.delta.content) yield choice.delta.content;
    if (choice?.delta.refusal) finish = "refusal";
    if (choice?.finish_reason) finish ??= choice.finish_reason;
  }
  if (finish === "refusal" || finish === "content_filter") yield "\n\n- Parlo can't write this one. Try describing it differently.";
  else if (finish === "length") yield "\n\n- The contract got too long and was cut off. Ask for a simpler version.";
}

const EXPLAINER = `You explain Solidity to people who have never coded. Given a contract and one line from it, explain what that line does in one or two short sentences of plain English, in the context of this contract. No code, no jargon, no preamble.`;

export async function explainLine(source: string, lineNo: number) {
  const lines = source.split("\n");
  const line = lines[lineNo - 1] ?? "";
  const res = await ask(EXPLAINER, `Contract:\n\`\`\`solidity\n${source}\n\`\`\`\n\nLine ${lineNo}: ${line.trim()}`, 4000);
  return res.refused || !res.text ? "Parlo can't explain this line." : res.text;
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
  const res = await ask(LAUNCHER, `Project name: ${projectName}\n\nContract:\n\`\`\`solidity\n${source}\n\`\`\``, 8000);
  if (res.refused || !res.text) throw new Error("Parlo can't write launch posts for this contract.");
  return res.text;
}
