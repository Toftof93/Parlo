"use client";

import { useEffect, useState } from "react";

const IDEAS = [
  "A token with 1B supply and a 2% fee to my wallet",
  "A vault where my friends deposit ETH and withdraw their own share",
  "An NFT drop of 1,000 pieces at 0.001 ETH each",
  "Release my team's tokens slowly over 12 months",
];

const QUICK = [
  ["token", "Token"],
  ["tax-token", "Token with a tax"],
  ["nft", "NFT drop"],
  ["vesting", "Vesting"],
  ["vault", "Vault"],
  ["airdrop", "Airdrop"],
];

export function HeroPrompt({ aiEnabled }: { aiEnabled: boolean }) {
  const [value, setValue] = useState("");
  const [ph, setPh] = useState(IDEAS[0]);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => setPh(IDEAS[(i = (i + 1) % IDEAS.length)]), 3200);
    return () => clearInterval(id);
  }, []);

  if (!aiEnabled)
    return (
      <div className="hero-prompt quick">
        <p className="quick-title">Start from a template, set it up in plain boxes, deploy from your wallet.</p>
        <div className="hero-templates">
          {QUICK.map(([id, label]) => (
            <a key={id} href={`/studio?template=${id}`}>
              {label}
            </a>
          ))}
        </div>
        <p className="muted small quick-note">Writing any contract from a sentence is coming soon.</p>
      </div>
    );

  return (
    <form action="/studio" className="hero-prompt">
      <textarea name="brief" value={value} onChange={(e) => setValue(e.target.value)} placeholder={ph} rows={2} aria-label="Describe your contract" />
      <div className="hero-prompt-bar">
        <span className="muted small">Plain English. No code needed.</span>
        <button className="btn primary">Write my contract →</button>
      </div>
    </form>
  );
}
