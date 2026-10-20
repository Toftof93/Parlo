"use client";

import { useEffect, useState } from "react";

const IDEAS = [
  "A token with 1B supply and a 2% fee to my wallet",
  "A vault where my friends deposit ETH and withdraw their own share",
  "An NFT drop of 1,000 pieces at 0.001 ETH each",
  "Release my team's tokens slowly over 12 months",
];

export function HeroPrompt() {
  const [value, setValue] = useState("");
  const [ph, setPh] = useState(IDEAS[0]);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => setPh(IDEAS[(i = (i + 1) % IDEAS.length)]), 3200);
    return () => clearInterval(id);
  }, []);

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
