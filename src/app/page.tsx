import { HeroPrompt } from "@/components/HeroPrompt";
import { LivePlayground } from "@/components/LivePlayground";

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

const TYPES = ["Tokens", "Tax tokens", "NFT drops", "Vesting", "Vaults", "Airdrops", "Robinhood Chain", "Your wallet, your keys", "No code"];

export default function Home() {
  const ai = Boolean(process.env.ANTHROPIC_API_KEY);
  return (
    <main className="home">
      <div className="aurora" aria-hidden>
        <i className="a1" />
        <i className="a2" />
        <i className="a3" />
      </div>

      <section className="hero">
        <div className="hero-copy">
          <p className="pill-eyebrow">
            <span className="spark" /> Smart contract studio · Robinhood Chain
          </p>
          <h1>
            Speak your
            <br />
            contract <em>into existence.</em>
          </h1>
          <p className="lead">
            {ai
              ? "Describe what you want in plain English. Parlo writes the Solidity, explains every line and gets it ready for your wallet."
              : "Launch tokens, NFT drops and vesting on Robinhood Chain without writing a line of code. Fill in a few boxes, watch the contract write itself, deploy from your own wallet."}
          </p>
          {ai ? (
            <HeroPrompt aiEnabled />
          ) : (
            <div className="cta-row">
              <a href="/studio?template=token" className="btn primary big glow-btn">
                Build a token free →
              </a>
              <a href="#how" className="btn big ghost-btn">
                See how it works
              </a>
            </div>
          )}
          <p className="trust">
            <span className="dot" /> Your keys stay in your wallet. Nothing goes on-chain until you sign.
          </p>
        </div>
        <div className="hero-visual">
          <LivePlayground />
          <p className="try-it">↑ Try it. Edit the boxes and the contract rewrites itself.</p>
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div className="track">
          {[...TYPES, ...TYPES].map((t, i) => (
            <span key={i}>
              {t} <b>✦</b>
            </span>
          ))}
        </div>
      </div>

      <section className="stats">
        <div>
          <b>6</b>
          <span>tested contract templates</span>
        </div>
        <div>
          <b>0</b>
          <span>lines of code to write</span>
        </div>
        <div>
          <b>1</b>
          <span>click to compile</span>
        </div>
        <div>
          <b>100%</b>
          <span>your keys, your contract</span>
        </div>
      </section>

      <section id="how" className="how">
        <p className="eyebrow">How it works</p>
        <h2>
          From an idea <em>to a live contract.</em>
        </h2>
        <ol className="steps">
          <li>
            <span className="num">01</span>
            <h3>Pick it</h3>
            <p>Token, tax token, NFT drop, vesting, vault or airdrop. Every template is tested and built on OpenZeppelin.</p>
          </li>
          <li>
            <span className="num">02</span>
            <h3>Shape it</h3>
            <p>Name, supply, fee, price. Fill in plain boxes and watch clean, commented Solidity write itself.</p>
          </li>
          <li>
            <span className="num">03</span>
            <h3>Ship it</h3>
            <p>Compile in one click and deploy from your own wallet. Testnet first, mainnet when you’re ready.</p>
          </li>
        </ol>
      </section>

      <section className="demo">
        <div className="demo-head">
          <p className="eyebrow">{ai ? "Plain-English mode" : "Coming next"}</p>
          <h2>
            Or just <em>say it.</em>
          </h2>
          <p className="lead small-lead">
            {ai ? "Type what you want. Parlo writes it, then explains any line you tap." : "Soon you’ll describe any contract in a sentence. Parlo writes it, then explains any line you tap."}
          </p>
        </div>
        <div className="window" aria-hidden>
          <div className="window-bar">
            <span className="lights">
              <i />
              <i />
              <i />
            </span>
            <span className="mono">parlo / studio</span>
            {!ai && <span className="soon-tag">Coming soon</span>}
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
                <span key={i} className="ln" style={{ animationDelay: `${0.4 + i * 0.12}s` }}>
                  <em>{i + 1}</em>
                  {segs.map(([k, t], j) => (
                    <span key={j} className={k}>
                      {t}
                    </span>
                  ))}
                </span>
              ))}
              <span className="explain-pop" style={{ animationDelay: "2.4s" }}>
                <b>Line 9</b> Sends the unlocked tokens to your team’s wallet.
              </span>
            </pre>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature big">
          <span className="tag">Free</span>
          <h3>Launch Kit</h3>
          <p>Your contract is only half a launch. Parlo writes your tagline, X bio, launch post and follow-up thread. Honest copy, no price promises.</p>
        </div>
        <div className="feature">
          <span className="ico">🛡</span>
          <h3>Safe by default</h3>
          <p>No hidden mint, blacklist or tax switches. Fees are hard-capped in the code.</p>
        </div>
        <div className="feature">
          <span className="ico">✓</span>
          <h3>Templates that compile</h3>
          <p>Every template is tested to compile, even with strange inputs.</p>
        </div>
        <div className="feature">
          <span className="ico">🔑</span>
          <h3>Your keys, your contract</h3>
          <p>Parlo never touches your wallet. You review everything and sign yourself.</p>
        </div>
        <div className="feature">
          <span className="ico">↗</span>
          <h3>Share the moment</h3>
          <p>Deployed? Post it on X with one tap and a link to your live contract.</p>
        </div>
      </section>

      <section className="closing">
        <div className="closing-card">
          <h2>
            Bring an idea. <em>Leave with a contract.</em>
          </h2>
          <p>Free to use. Deploy in minutes.</p>
          <a href="/studio" className="btn big light-btn">
            Open the studio →
          </a>
        </div>
      </section>
    </main>
  );
}
