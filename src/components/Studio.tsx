"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, type Abi, type Address, type EIP1193Provider, type Hex } from "viem";
import { TEMPLATES, offlineLaunchKit, type Values } from "@/lib/templates";
import { splitReply, contractName } from "@/lib/extract";
import { NETWORKS } from "@/lib/chains";
import { parseArg, type AbiInput } from "@/lib/args";

type Msg = { role: "you" | "parlo"; text: string };
type Compiled = { name: string; abi: Abi; bytecode: Hex; size: number };
type Diagnostic = { severity: "error" | "warning"; message: string; line?: number };
type Tab = "code" | "deploy" | "launch";
type Tpl = { id: string; values: Values };

const STORE = "parlo:project:v2"; // bump when the saved shape changes

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export function Studio({ initialBrief, initialTemplate, aiEnabled }: { initialBrief?: string; initialTemplate?: string; aiEnabled: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [source, setSource] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("code");
  const [explain, setExplain] = useState<{ line: number; text?: string; error?: string } | null>(null);
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const started = useRef(false);

  // Restore the last project, or start from the brief passed in the URL.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (saved?.source && !initialBrief && !initialTemplate) {
        setSource(saved.source);
        setMessages(saved.messages ?? []);
        setTpl(saved.tpl ?? null);
      }
    } catch {}
    if (initialTemplate && TEMPLATES.some((t) => t.id === initialTemplate)) applyTemplate(initialTemplate);
    else if (initialBrief) void send(initialBrief, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ source, messages, tpl }));
    } catch {}
  }, [source, messages, tpl]);

  async function send(text: string, current = source) {
    const brief = text.trim();
    if (!brief || busy) return;
    if (!aiEnabled) {
      setInput("");
      setMessages((m) => [...m, { role: "you", text: brief }, { role: "parlo", text: "- Writing from plain English switches on soon.\n- For now, start from a template and set it up with simple boxes. It's free." }]);
      return;
    }
    setInput("");
    setBusy(true);
    setTab("code");
    setExplain(null);
    setTpl(null);
    setMessages((m) => [...m, { role: "you", text: brief }, { role: "parlo", text: "" }]);
    const update = (t: string) => setMessages((m) => [...m.slice(0, -1), { role: "parlo", text: t }]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief, current: current || undefined }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        update(j.error ?? "Parlo couldn't respond. Try again.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let all = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        all += dec.decode(value, { stream: true });
        const { notes, code } = splitReply(all);
        update(notes || "Writing…");
        if (code) setSource(code);
      }
    } catch {
      update("Lost the connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setTpl({ id, values: { ...t.defaults } });
    setSource(t.build(t.defaults));
    const next = t.fields.length ? "Set it up with the boxes above the code." : "It works as it is. No settings needed.";
    setMessages((m) => [...m, { role: "you", text: `Start from: ${t.name}` }, { role: "parlo", text: `- ${t.blurb}\n- ${next}${aiEnabled ? "\n- Or ask me to change anything." : ""}` }]);
    setTab("code");
  }

  function reset() {
    setTpl(null);
    setSource("");
    setMessages([]);
    setExplain(null);
  }

  async function explainLine(line: number) {
    if (!source) return;
    if (!aiEnabled) return setExplain({ line, error: "Line-by-line explanations switch on soon, with Parlo AI." });
    setExplain({ line });
    try {
      const res = await fetch("/api/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, line }) });
      const j = await res.json();
      setExplain({ line, text: j.text, error: j.error });
    } catch {
      setExplain({ line, error: "Couldn't explain that line." });
    }
  }

  const name = contractName(source);

  return (
    <div className="studio">
      <section className="chat">
        <div className="chat-head">
          <span className="eyebrow">Conversation</span>
          {messages.length > 0 && (
            <button className="link" onClick={reset} disabled={busy}>
              New contract
            </button>
          )}
        </div>
        <div className="chat-log">
          {messages.length === 0 ? (
            <div className="empty">
              <p className="empty-title">What should your contract do?</p>
              <p className="muted">{aiEnabled ? "Describe it like you'd text a developer, or start from one of these." : "Pick a starting point and set it up with simple boxes. Free, no code needed."}</p>
              <div className="templates">
                {TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => applyTemplate(t.id)}>
                    <b>{t.name}</b>
                    <span>{t.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role}`}>
                  {m.role === "parlo" ? <Notes text={m.text || "Thinking…"} /> : m.text}
                </div>
              ))}
              {!aiEnabled && !source && (
                <div className="templates">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => applyTemplate(t.id)}>
                      <b>{t.name}</b>
                      <span>{t.blurb}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {!aiEnabled && (
          <p className="soon">
            <b>Coming soon:</b> describe any contract in plain English and Parlo writes it.
          </p>
        )}
        <form
          className={`composer ${aiEnabled ? "" : "off"}`}
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={source ? "Ask for a change, e.g. “make the fee 3%”" : "e.g. A token with 1B supply and a 2% fee to my wallet"}
            rows={3}
          />
          <button className="btn primary" disabled={busy || !input.trim()}>
            {busy ? "Writing…" : source ? "Update" : "Write it"}
          </button>
        </form>
      </section>

      <section className="work">
        <div className="tabs">
          <button className={tab === "code" ? "on" : ""} onClick={() => setTab("code")}>
            {name ? `${name}.sol` : "Contract"}
          </button>
          <button className={tab === "deploy" ? "on" : ""} onClick={() => setTab("deploy")} disabled={!source}>
            Compile &amp; deploy
          </button>
          <button className={tab === "launch" ? "on" : ""} onClick={() => setTab("launch")} disabled={!source}>
            Launch kit
          </button>
        </div>
        {tab === "code" && tpl && (
          <Settings
            tpl={tpl}
            onChange={(values) => {
              const t = TEMPLATES.find((x) => x.id === tpl.id)!;
              setTpl({ id: tpl.id, values });
              setSource(t.build(values));
            }}
          />
        )}
        {tab === "code" && <Editor source={source} onChange={setSource} busy={busy} onExplain={explainLine} explain={explain} onCloseExplain={() => setExplain(null)} />}
        {tab === "deploy" && <Deploy source={source} />}
        {tab === "launch" && <LaunchKit source={source} defaultName={tpl?.values.name ?? name} aiEnabled={aiEnabled} tpl={tpl} />}
      </section>
    </div>
  );
}

function Settings({ tpl, onChange }: { tpl: Tpl; onChange: (v: Values) => void }) {
  const t = TEMPLATES.find((x) => x.id === tpl.id)!;
  if (!t.fields.length) return null;
  return (
    <div className="settings">
      <div className="row">
        <span className="eyebrow">Settings · {t.name}</span>
        <span className="muted small">Changing these rewrites the code</span>
      </div>
      <div className="settings-grid">
        {t.fields.map((f) => (
          <label key={f.key} className="field">
            <span>{f.label}</span>
            <input
              value={tpl.values[f.key] ?? ""}
              inputMode={f.kind === "text" ? "text" : "decimal"}
              placeholder={f.hint ?? `Default: ${t.defaults[f.key]}`}
              onChange={(e) => onChange({ ...tpl.values, [f.key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function Notes({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <ul className="notes">
      {lines.map((l, i) => (
        <li key={i}>{l.replace(/^[-•]\s*/, "")}</li>
      ))}
    </ul>
  );
}

function Editor({
  source,
  onChange,
  busy,
  onExplain,
  explain,
  onCloseExplain,
}: {
  source: string;
  onChange: (s: string) => void;
  busy: boolean;
  onExplain: (line: number) => void;
  explain: { line: number; text?: string; error?: string } | null;
  onCloseExplain: () => void;
}) {
  const gutter = useRef<HTMLDivElement>(null);
  const lines = Math.max(1, source.split("\n").length);
  if (!source && !busy)
    return (
      <div className="placeholder">
        <p>Your contract will appear here.</p>
        <p className="muted">Tap any line number to have it explained in plain English.</p>
      </div>
    );
  return (
    <div className="editor-wrap">
      <div className="editor">
        <div className="gutter" ref={gutter} aria-hidden>
          {Array.from({ length: lines }, (_, i) => (
            <button key={i} className={explain?.line === i + 1 ? "on" : ""} onClick={() => onExplain(i + 1)} tabIndex={-1} title="Explain this line">
              {i + 1}
            </button>
          ))}
        </div>
        <textarea
          value={source}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
          }}
          spellCheck={false}
          readOnly={busy}
          aria-label="Contract source"
        />
      </div>
      {explain && (
        <div className="explain">
          <span className="eyebrow">Line {explain.line}</span>
          <p>{explain.error ?? explain.text ?? "Reading…"}</p>
          <button className="link" onClick={onCloseExplain}>
            Close
          </button>
        </div>
      )}
      <p className="hint">Tap a line number to explain it. You can also edit the code directly.</p>
    </div>
  );
}

function Deploy({ source }: { source: string }) {
  const [result, setResult] = useState<{ ok: boolean; contracts: Compiled[]; diagnostics: Diagnostic[]; version: string } | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [pick, setPick] = useState(0);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [netId, setNetId] = useState<number>(NETWORKS[0].id);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [deployed, setDeployed] = useState<{ address: Address; tx: Hex; chainId: number } | null>(null);
  const [deploying, setDeploying] = useState(false);

  async function run() {
    setCompiling(true);
    setDeployed(null);
    setStatus(null);
    try {
      const res = await fetch("/api/compile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source }) });
      const j = await res.json();
      setResult(j);
      setPick(Math.max(0, (j.contracts?.length ?? 1) - 1)); // the main contract is usually last
    } catch {
      setStatus({ text: "Couldn't reach the compiler.", error: true });
    } finally {
      setCompiling(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const target = result?.contracts?.[pick];
  const ctorInputs: AbiInput[] = useMemo(
    () => ((target?.abi.find((x) => x.type === "constructor") as { inputs?: AbiInput[] } | undefined)?.inputs ?? []),
    [target],
  );
  const net = NETWORKS.find((n) => n.id === netId)!;

  async function deploy() {
    if (!target || deploying) return;
    setDeployed(null);
    setStatus(null);
    if (!window.ethereum) return setStatus({ text: "No wallet found. Open this page in your wallet's browser or install Rabby/MetaMask.", error: true });
    setDeploying(true);
    try {
      const values = ctorInputs.map((inp, i) => parseArg(inp, args[`${i}`] ?? ""));
      const wallet = createWalletClient({ chain: net, transport: custom(window.ethereum) });
      const [account] = await wallet.requestAddresses();
      setStatus({ text: "Switching network…" });
      try {
        await wallet.switchChain({ id: net.id });
      } catch (e) {
        // Only add the network when the wallet doesn't know it; a cancelled switch stops here.
        const code = (e as { code?: number; cause?: { code?: number } }).code ?? (e as { cause?: { code?: number } }).cause?.code;
        if (code !== 4902) throw e;
        await wallet.addChain({ chain: net });
      }
      setStatus({ text: "Confirm the deployment in your wallet…" });
      const hash = await wallet.deployContract({ abi: target.abi, bytecode: target.bytecode, args: values, account, chain: net });
      setStatus({ text: "Deploying… waiting for the network." });
      const receipt = await createPublicClient({ chain: net, transport: http() }).waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error("The deployment transaction didn't create a contract.");
      setDeployed({ address: receipt.contractAddress, tx: hash, chainId: net.id });
      setStatus(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setStatus({ text: /reject|denied/i.test(msg) ? "You cancelled in your wallet." : msg, error: true });
    } finally {
      setDeploying(false);
    }
  }

  const explorer = net.blockExplorers.default.url;
  const share = deployed
    ? `https://x.com/intent/post?text=${encodeURIComponent(`Just deployed ${target?.name} on ${net.name}, written by AI in plain English with Parlo 🗣\n\n${explorer}/address/${deployed.address}`)}`
    : "";

  return (
    <div className="deploy">
      <div className="row">
        <span className="eyebrow">Compiler</span>
        <span className="muted mono">{result?.version?.split("+")[0] ? `solc ${result.version.split("+")[0]}` : ""}</span>
        <button className="btn" onClick={run} disabled={compiling}>
          {compiling ? "Compiling…" : "Recompile"}
        </button>
      </div>

      {result && (
        <div className={`compile ${result.ok ? "ok" : "bad"}`}>
          <b>{result.ok ? "✓ Compiles" : "✕ Doesn't compile yet"}</b>
          {result.diagnostics.length > 0 && (
            <ul>
              {result.diagnostics.slice(0, 8).map((d, i) => (
                <li key={i} className={d.severity}>
                  {d.line ? <span className="mono">Line {d.line} · </span> : null}
                  {d.message.replace(/^(Error|Warning): /, "")}
                </li>
              ))}
            </ul>
          )}
          {!result.ok && <p className="muted">Tip: paste the error into the chat and ask Parlo to fix it.</p>}
        </div>
      )}

      {result?.ok && target && (
        <>
          {result.contracts.length > 1 && (
            <label className="field">
              <span>Contract</span>
              <select value={pick} onChange={(e) => setPick(Number(e.target.value))}>
                {result.contracts.map((c, i) => (
                  <option key={c.name} value={i}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {ctorInputs.map((inp, i) => (
            <label key={i} className="field">
              <span>
                {inp.name || `Argument ${i + 1}`} <em className="mono">{inp.type}</em>
              </span>
              <input value={args[`${i}`] ?? ""} onChange={(e) => setArgs({ ...args, [`${i}`]: e.target.value })} placeholder={inp.type === "address" ? "0x…" : inp.type.endsWith("]") ? "comma, separated" : ""} />
            </label>
          ))}
          <label className="field">
            <span>Network</span>
            <select value={netId} onChange={(e) => setNetId(Number(e.target.value))}>
              {NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
          {netId === 4663 && <p className="warn-note">Mainnet uses real ETH. Parlo writes careful code, but it isn't audited. Test on testnet first.</p>}
          <button className="btn primary wide" onClick={deploy} disabled={deploying}>
            {deploying ? "Deploying…" : `Deploy ${target.name}`}
          </button>
          <p className="muted small">Your keys stay in your wallet. Nothing is deployed until you sign.</p>
        </>
      )}

      {status && <p className={`status ${status.error ? "err" : ""}`}>{status.text}</p>}
      {deployed && (
        <div className="done">
          <b>Live on {net.name} 🎉</b>
          <code className="mono">{deployed.address}</code>
          <div className="row">
            <a className="btn" href={`${explorer}/address/${deployed.address}`} target="_blank" rel="noreferrer">
              View on explorer
            </a>
            <a className="btn primary" href={share} target="_blank" rel="noreferrer">
              Share on X
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function LaunchKit({ source, defaultName, aiEnabled, tpl }: { source: string; defaultName?: string; aiEnabled: boolean; tpl: Tpl | null }) {
  const [name, setName] = useState(defaultName ?? "");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setError("");
    if (!aiEnabled) {
      const t = tpl && TEMPLATES.find((x) => x.id === tpl.id);
      if (!t) return setError("Without Parlo AI, the Launch Kit works for templates. Start from a template first.");
      return setText(offlineLaunchKit(name, t, tpl!.values));
    }
    setBusy(true);
    try {
      const res = await fetch("/api/launchkit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, name }) });
      const j = await res.json();
      if (j.error) setError(j.error);
      else setText(j.text);
    } catch {
      setError("Couldn't reach Parlo.");
    } finally {
      setBusy(false);
    }
  }

  const sections = useMemo(() => {
    const out: { title: string; body: string }[] = [];
    let cur: { title: string; body: string } | null = null;
    for (const line of text.split("\n")) {
      if (/^(TAGLINE|BIO|LAUNCH POST|THREAD)\s*$/.test(line.trim())) {
        cur = { title: line.trim(), body: "" };
        out.push(cur);
      } else if (cur) cur.body += line + "\n";
    }
    return out.map((s) => ({ ...s, body: s.body.trim() }));
  }, [text]);

  return (
    <div className="launch">
      <p className="muted">{aiEnabled ? "Parlo reads your contract and writes your tagline, X bio and launch posts." : "Parlo writes your tagline, X bio and launch posts from your template settings."} Honest copy: no price promises.</p>
      <div className="row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
        <button className="btn primary" onClick={run} disabled={busy}>
          {busy ? "Writing…" : text ? "Rewrite" : "Write my launch kit"}
        </button>
      </div>
      {error && <p className="status err">{error}</p>}
      {sections.map((s) => (
        <div key={s.title} className="kit">
          <div className="row">
            <span className="eyebrow">{s.title}</span>
            <CopyButton text={s.body} />
          </div>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? "Copied ✓" : "Copy"}
    </button>
  );
}
