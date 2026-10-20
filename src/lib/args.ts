// Turns the text a user typed into a constructor argument of the right type.
export type AbiInput = { name: string; type: string };

export function parseArg(input: AbiInput, raw: string): unknown {
  const v = raw.trim();
  const t = input.type;
  if (t.endsWith("]")) {
    const arr = JSON.parse(v.startsWith("[") ? v : `[${v.split(",").map((s) => JSON.stringify(s.trim())).join(",")}]`);
    const inner = { name: input.name, type: t.slice(0, t.lastIndexOf("[")) };
    return (arr as unknown[]).map((x) => parseArg(inner, String(x)));
  }
  if (/^u?int\d*$/.test(t)) {
    if (!/^-?\d+$/.test(v)) throw new Error(`${input.name || t} must be a whole number`);
    return BigInt(v);
  }
  if (t === "bool") return v === "true" || v === "1" || v.toLowerCase() === "yes";
  if (t === "address") {
    if (!/^0x[0-9a-fA-F]{40}$/.test(v)) throw new Error(`${input.name || "address"} must be a 0x address`);
    return v;
  }
  return v;
}
