import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { TEMPLATES, offlineLaunchKit } from "../src/lib/templates.ts";

const require = createRequire(import.meta.url);
const solc = require("solc");

function compile(source: string) {
  const input = {
    language: "Solidity",
    sources: { "Contract.sol": { content: source } },
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", outputSelection: { "Contract.sol": { "*": ["evm.bytecode.object"] } } },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: (p: string) => ({ contents: readFileSync(`node_modules/${p}`, "utf8") }) }));
  return (out.errors ?? []).filter((e: { severity: string }) => e.severity === "error").map((e: { formattedMessage: string }) => e.formattedMessage);
}

const NASTY = { name: 'Moon "x"; } // 🚀', symbol: "m$o\"on", supply: "1,000,000,000,000,000,000", fee: "99", cap: "abc", max: "-5", price: "1e18", cliff: "", months: "9999" };

for (const t of TEMPLATES) {
  test(`${t.name} compiles with defaults`, () => assert.deepEqual(compile(t.build(t.defaults)), []));
  test(`${t.name} compiles with hostile settings`, () => assert.deepEqual(compile(t.build({ ...t.defaults, ...NASTY })), []));
}

test("tax settings are clamped to the cap", () => {
  const t = TEMPLATES.find((x) => x.id === "tax-token")!;
  const src = t.build({ ...t.defaults, fee: "8", cap: "3" });
  assert.match(src, /MAX_FEE_BPS = 300;/);
  assert.match(src, /feeBps = 300;/);
});

test("offline launch kit has every section and no price promises", () => {
  const t = TEMPLATES.find((x) => x.id === "token")!;
  const kit = offlineLaunchKit("Moon", t, t.defaults);
  for (const h of ["TAGLINE", "BIO", "LAUNCH POST", "THREAD", "CA: [PASTE CA HERE]"]) assert.ok(kit.includes(h), h);
  assert.doesNotMatch(kit, /moon(ing)? soon|100x|guarantee/i);
});
