import "server-only";
import fs from "node:fs";
import path from "node:path";
// solc ships as CommonJS without types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const solc = require("solc");

export type CompiledContract = { name: string; abi: unknown[]; bytecode: `0x${string}`; size: number };
export type Diagnostic = { severity: "error" | "warning"; message: string; line?: number };
export type CompileResult = { ok: boolean; contracts: CompiledContract[]; diagnostics: Diagnostic[]; version: string };

const OZ_ROOT = path.join(process.cwd(), "node_modules");

// Only OpenZeppelin imports are allowed, read from the installed package.
function findImports(p: string) {
  if (!p.startsWith("@openzeppelin/contracts/") || p.includes("..")) return { error: `Import not available: ${p}. Only @openzeppelin/contracts is supported.` };
  try {
    return { contents: fs.readFileSync(path.join(OZ_ROOT, p), "utf8") };
  } catch {
    return { error: `File not found: ${p}` };
  }
}

export function compile(source: string): CompileResult {
  const input = {
    language: "Solidity",
    sources: { "Contract.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      outputSelection: { "Contract.sol": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const diagnostics: Diagnostic[] = (out.errors ?? []).map((e: any) => ({
    severity: e.severity === "error" ? "error" : "warning",
    message: (e.formattedMessage ?? e.message).replace(/\n\s*\|[\s\S]*$/, "").trim(),
    line: e.sourceLocation?.file === "Contract.sol" ? lineAt(source, e.sourceLocation.start) : undefined,
  }));
  const ok = !diagnostics.some((d) => d.severity === "error");
  const contracts: CompiledContract[] = ok
    ? Object.entries(out.contracts?.["Contract.sol"] ?? {})
        .map(([name, c]: [string, any]) => ({ name, abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` as `0x${string}`, size: c.evm.bytecode.object.length / 2 }))
        .filter((c) => c.size > 0) // skip interfaces and abstract contracts
    : [];
  return { ok, contracts, diagnostics, version: solc.version() };
}

const lineAt = (src: string, offset: number) => src.slice(0, Math.max(0, offset)).split("\n").length;
