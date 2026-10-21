# Parlo

**Speak your contract into existence.** An AI smart contract studio for Robinhood Chain.

Describe a contract in plain English. Parlo writes the Solidity, explains any line on tap, compiles it, and deploys it from your own wallet. Then it writes your launch posts.

## Features

- **Chat to build:** a brief becomes a commented contract; follow-up messages edit it ("make the fee 3%")
- **Explain mode:** tap a line number to have that line explained in plain English
- **Templates that compile:** token, tax token (capped fee), vault, airdrop, vesting, NFT drop, all on OpenZeppelin 5
- **Compile in one click:** solc 0.8.28 on the server, errors shown by line
- **Deploy from your wallet:** constructor form, Robinhood Chain testnet or mainnet, keys never leave the wallet
- **Launch Kit:** tagline, X bio, launch post and thread written from the contract
- **Share on X** after deploying

## Setup

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
npm test
```

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Turns on writing, explanations and the Launch Kit. Without it, templates, compile and deploy still work. |
| `PARLO_DAILY_LIMIT` | Free AI requests per visitor per day (default 10) |
| `NEXT_PUBLIC_SITE_URL` | Public URL for share links (default https://useparlo.xyz) |

The AI runs on Claude Opus 5.5 with server-side refusal fallbacks and prompt caching on the fixed system prompts.

AI-written code is not audited. Review and test on testnet before using real funds.
