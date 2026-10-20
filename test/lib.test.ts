import { test } from "node:test";
import assert from "node:assert/strict";
import { splitReply, contractName } from "../src/lib/extract.ts";
import { parseArg } from "../src/lib/args.ts";

test("splits notes from the contract, even mid-stream", () => {
  const r = splitReply("- Makes a token\n- No owner\n\n```solidity\ncontract A {}\n```\nextra");
  assert.equal(r.notes, "- Makes a token\n- No owner");
  assert.equal(r.code, "contract A {}\n");
  const partial = splitReply("- Note\n```solidity\npragma solidity ^0.8.24;\ncontract B {");
  assert.equal(partial.code, "pragma solidity ^0.8.24;\ncontract B {\n");
  assert.equal(splitReply("just words").code, undefined);
  assert.equal(contractName("// x\ncontract TaxToken is ERC20 {"), "TaxToken");
});

test("parses constructor arguments by type", () => {
  assert.equal(parseArg({ name: "n", type: "uint256" }, " 42 "), 42n);
  assert.deepEqual(parseArg({ name: "a", type: "address[]" }, "0x0000000000000000000000000000000000000001, 0x0000000000000000000000000000000000000002"), [
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002",
  ]);
  assert.deepEqual(parseArg({ name: "x", type: "uint256[]" }, "[1,2]"), [1n, 2n]);
  assert.equal(parseArg({ name: "b", type: "bool" }, "yes"), true);
  assert.throws(() => parseArg({ name: "owner", type: "address" }, "nope"), /0x address/);
  assert.throws(() => parseArg({ name: "fee", type: "uint256" }, "1.5"), /whole number/);
});
