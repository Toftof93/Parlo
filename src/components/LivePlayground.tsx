"use client";

import { useMemo, useState } from "react";
import { TEMPLATES } from "@/lib/templates";

const TAX = TEMPLATES.find((t) => t.id === "tax-token")!;
const KEYWORDS = /\b(contract|import|from|function|uint256|public|constant|address|mapping|constructor|returns?|if|external|internal|override|is|pragma|solidity|error|revert|bool|true|false|ether|memory|string)\b/g;

// A tiny Solidity highlighter: comments, strings, numbers and keywords.
function Line({ text }: { text: string }) {
  const comment = text.indexOf("//");
  const code = comment >= 0 ? text.slice(0, comment) : text;
  const parts: { t: string; c?: string }[] = [];
  const re = /("[^"]*")|(\b\d[\d_]*\b)|([A-Za-z_]\w*)/g;
  let last = 0;
  for (const m of code.matchAll(re)) {
    if (m.index! > last) parts.push({ t: code.slice(last, m.index) });
    const c = m[1] ? "s" : m[2] ? "n" : new RegExp(`^${KEYWORDS.source}$`).test(m[3]) ? "k" : /^[A-Z]/.test(m[3]) ? "t" : undefined;
    parts.push({ t: m[0], c });
    last = m.index! + m[0].length;
  }
  parts.push({ t: code.slice(last) });
  if (comment >= 0) parts.push({ t: text.slice(comment), c: "c" });
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className={p.c}>
          {p.t}
        </span>
      ))}
    </>
  );
}

export function LivePlayground() {
  const [v, setV] = useState<Record<string, string>>({ ...TAX.defaults, name: "Moon Coin", symbol: "MOON", fee: "3" });
  const source = useMemo(() => TAX.build(v), [v]);
  // Show the part people care about: the title down to the end of the constructor.
  const lines = useMemo(() => {
    const all = source.split("\n");
    const start = all.findIndex((l) => l.startsWith("/// @title"));
    const end = all.findIndex((l, i) => i > start && l.trim() === "}" && all[i - 1].includes("_mint"));
    return all.slice(start, end + 1).filter((l) => !/feeExempt\[/.test(l));
  }, [source]);
  const open = `/studio?${new URLSearchParams({ template: "tax-token", ...v }).toString()}`;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <div className="play">
      <div className="play-bar">
        <span className="lights">
          <i />
          <i />
          <i />
        </span>
        <span className="mono">parlo / studio · live</span>
        <span className="live-dot">LIVE</span>
      </div>
      <div className="play-fields">
        <label>
          <span>Token name</span>
          <input value={v.name} onChange={set("name")} maxLength={40} />
        </label>
        <label>
          <span>Symbol</span>
          <input value={v.symbol} onChange={set("symbol")} maxLength={11} />
        </label>
        <label>
          <span>Supply</span>
          <input value={v.supply} onChange={set("supply")} inputMode="numeric" />
        </label>
        <label>
          <span>Fee %</span>
          <input value={v.fee} onChange={set("fee")} inputMode="decimal" />
        </label>
      </div>
      <pre className="play-code" aria-label="Generated contract">
        {lines.map((l, i) => (
          <span key={`${i}:${l}`} className="pl">
            <em>{i + 1}</em>
            <Line text={l} />
          </span>
        ))}
      </pre>
      <div className="play-foot">
        <span className="ok">✓ Ready to compile</span>
        <a className="btn primary" href={open}>
          Open in studio →
        </a>
      </div>
    </div>
  );
}
