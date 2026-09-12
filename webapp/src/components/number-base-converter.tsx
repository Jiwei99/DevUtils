"use client";

import { useMemo, useState } from "react";
import { convertNumberBase, parseBigIntInBase } from "@/lib/number-base";
import { CopyButton } from "./copy-button";
import { ToolHeader } from "./tool-header";

const COMMON_BASES = [
  { base: 2, label: "Binary" },
  { base: 8, label: "Octal" },
  { base: 10, label: "Decimal" },
  { base: 16, label: "Hexadecimal" },
] as const;

export function NumberBaseConverter() {
  const [input, setInput] = useState("");
  const [fromBase, setFromBase] = useState(10);
  const [toBase, setToBase] = useState(16);

  const conversion = useMemo(() => {
    if (!input.trim()) return { result: "", common: [] as { base: number; label: string; value: string }[], error: "" };
    try {
      const parsed = parseBigIntInBase(input, fromBase);
      return {
        result: convertNumberBase(input, fromBase, toBase),
        common: COMMON_BASES.map((item) => ({ ...item, value: parsed.toString(item.base).toLocaleUpperCase() })),
        error: "",
      };
    } catch (error) {
      return {
        result: "",
        common: [] as { base: number; label: string; value: string }[],
        error: error instanceof Error ? error.message : "Invalid number.",
      };
    }
  }, [fromBase, input, toBase]);

  return (
    <section>
      <ToolHeader
        category="Number utilities"
        title="Number Base Converter"
        description="Convert whole numbers between binary, octal, decimal, and hexadecimal."
      />

      <div className="utility-card converter-card">
        <div className="converter-grid">
          <div className="converter-field">
            <label className="field-label" htmlFor="base-input">Value</label>
            <input
              id="base-input"
              className={`text-input code-input large-input${conversion.error ? " invalid" : ""}`}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Enter a whole number…"
              spellCheck="false"
            />
          </div>
          <div className="converter-field">
            <label className="field-label" htmlFor="from-base">From base</label>
            <select id="from-base" className="select-input" value={fromBase} onChange={(event) => setFromBase(Number(event.target.value))}>
              {COMMON_BASES.map((item) => <option value={item.base} key={item.base}>{item.label} (Base {item.base})</option>)}
            </select>
          </div>
          <div className="converter-arrow" aria-hidden="true">→</div>
          <div className="converter-field">
            <label className="field-label" htmlFor="to-base">To base</label>
            <select id="to-base" className="select-input" value={toBase} onChange={(event) => setToBase(Number(event.target.value))}>
              {COMMON_BASES.map((item) => <option value={item.base} key={item.base}>{item.label} (Base {item.base})</option>)}
            </select>
          </div>
        </div>
        {conversion.error && <p className="field-error conversion-error">{conversion.error}</p>}

        <div className="primary-result">
          <div>
            <span>Base {toBase} result</span>
            <code>{conversion.result || "—"}</code>
          </div>
          <CopyButton value={conversion.result} />
        </div>

        <div className="common-results">
          {COMMON_BASES.map((item) => {
            const value = conversion.common.find((result) => result.base === item.base)?.value ?? "";
            return (
              <div className="value-row" key={item.base}>
                <div><strong>{item.label}</strong><span>Base {item.base}</span></div>
                <code>{value || "—"}</code>
                <CopyButton value={value} compact />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
