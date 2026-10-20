import { HeroPrompt } from "@/components/HeroPrompt";

// Each line is a list of [style, text] segments.
const CODE: [string, string][][] = [
  [["k", "contract "], ["t", "TeamVesting"], ["p", " {"]],
  [],
  [["c", "    /// Unlocks a little every day for 12 months"]],
  [["k", "    uint64 public immutable "], ["v", "duration = 365 days;"]],
  [],
  [["k", "    function "], ["f", "release"], ["p", "() external {"]],
  [["p", "        uint256 amount = vested() - released;"]],
  [["p", "        released += amount;"]],
  [["p", "        token.safeTransfer(beneficiary, amount);"]],
  [["p", "    }"]],
  [["p", "}"]],
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <p className="eyebrow">Smart contract studio · Robinhood Chain</p>
        <h1>
          Speak your contract
          <br />
          <em>into existence.</em>
        </h1>
        <p className="lead">Describe what you want in plain English. Parlo writes the Solidity, explains every line, compiles it and gets it ready for your wallet to deploy.</p>
        <HeroPrompt aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />
        <p className="trust">
          <span className="dot" /> Your keys stay in your wallet. Nothing goes on-chain until you sign.
        </p>
      </section>

      <section className="demo" aria-hidden>
        <div className="window">
          <div className="window-bar">
            <span className="lights">
              <i />
              <i />
              <i />
            </span>
            <span className="mono">parlo / studio</span>
          </div>
          <div className="window-body">
            <div className="demo-chat">
              <div className="bubble you">Release my team’s tokens slowly over 12 months, after a 1 month wait.</div>
              <div className="bubble parlo">
                <ul className="notes">
                  <li>Locks the tokens in a vesting contract</li>
                  <li>Nothing unlocks for the first 30 days</li>
                  <li>Then they release evenly until month 12</li>
                </ul>
              </div>
            </div>
            <pre className="demo-code">
              {CODE.map((segs, i) => (
                <span key={i} className="ln" style={{ animationDelay: `${0.9 + i * 0.14}s` }}>
                  <em>{i + 1}</em>
                  {segs.map(([k, t], j) => (
                    <span key={j} className={k}>
                      {t}
                    </span>
                  ))}
                </span>
              ))}
              <span className="explain-pop" style={{ animationDelay: "3.2s" }}>
                <b>Line 9</b> Sends the unlocked tokens to your team’s wallet.
              </span>
            </pre>
          </div>
        </div>
      </section>

      <section id="how" className="how">
        <p className="eyebrow">How it works</p>
        <h2>
          From a sentence <em>to a live contract.</em>
        </h2>
        <ol className="steps">
          <li>
            <span className="num">01</span>
            <h3>Say it</h3>
            <p>Describe your token, vault, drop or vesting plan the way you’d text a developer. Change it by chatting: “make the fee 3%”.</p>
          </li>
          <li>
            <span className="num">02</span>
            <h3>Understand it</h3>
            <p>Parlo writes clean, commented Solidity. Tap any line and it explains what it does in plain English.</p>
          </li>
          <li>
            <span className="num">03</span>
            <h3>Ship it</h3>
            <p>Compile in one click, fill in the settings, and deploy from your own wallet. Testnet first, mainnet when you’re ready.</p>
          </li>
        </ol>
      </section>

      <section className="features">
        <div className="feature big">
          <span className="tag">New</span>
          <h3>Launch Kit</h3>
          <p>Your contract is only half a launch. Parlo reads it and writes your tagline, X bio, launch post and follow-up thread. Honest copy, no price promises.</p>
        </div>
        <div className="feature">
          <h3>Safe by default</h3>
          <p>No hidden mint, blacklist or tax switches unless you ask. When you do, Parlo caps them and tells you.</p>
        </div>
        <div className="feature">
          <h3>Templates that compile</h3>
          <p>Token, tax token, vault, airdrop, vesting, NFT drop. Every one tested and built on OpenZeppelin.</p>
        </div>
        <div className="feature">
          <h3>Your keys, your contract</h3>
          <p>Parlo never touches your wallet. You review everything and sign the deployment yourself.</p>
        </div>
        <div className="feature">
          <h3>Share the moment</h3>
          <p>Deployed? Post it on X with one tap and a link to your live contract.</p>
        </div>
      </section>

      <section className="closing">
        <h2>
          Bring an idea. <em>Leave with a contract.</em>
        </h2>
        <a href="/studio" className="btn primary big">
          Open the studio
        </a>
      </section>
    </main>
  );
}
