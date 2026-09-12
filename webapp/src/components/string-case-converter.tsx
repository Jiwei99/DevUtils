"use client";

import { useMemo, useState } from "react";
import { CASE_STYLES, convertStringCase } from "@/lib/string-case";
import { CopyButton } from "./copy-button";
import { ToolHeader } from "./tool-header";

export function StringCaseConverter() {
  const [input, setInput] = useState("");
  const conversions = useMemo(() => convertStringCase(input), [input]);

  return (
    <section>
      <ToolHeader
        category="Text utilities"
        title="String Case Converter"
        description="Convert text into common code and prose casing styles."
      />

      <div className="utility-layout case-layout">
        <div className="utility-card input-card">
          <div className="card-heading">
            <div>
              <span className="card-title">Source text</span>
              <span className="card-subtitle">Mixed casing and separators are supported</span>
            </div>
            <button className="clear-button" type="button" onClick={() => setInput("")}>Clear</button>
          </div>
          <textarea
            className="utility-textarea case-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enter text to convert…"
            spellCheck="false"
          />
        </div>

        <div className="utility-card case-results">
          <div className="card-heading">
            <div>
              <span className="card-title">Converted styles</span>
              <span className="card-subtitle">Copy any result with one click</span>
            </div>
          </div>
          <div>
            {CASE_STYLES.map((style) => (
              <div className="case-row" key={style.id}>
                <span>{style.label}</span>
                <code>{conversions[style.id] || "—"}</code>
                <CopyButton value={conversions[style.id]} compact />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
