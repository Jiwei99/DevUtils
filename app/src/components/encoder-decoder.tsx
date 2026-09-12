"use client";

import { useMemo, useState } from "react";
import { convertJsonEncoding } from "@/lib/json-encoding";
import { CopyButton } from "./copy-button";
import { ToolHeader } from "./tool-header";

type Format = "json-string" | "form-urlencoded";
type Direction = "encode" | "decode";

const FORMATS = [
  { id: "json-string", label: "JSON string" },
  { id: "form-urlencoded", label: "Form URL-encoded" },
] as const;

export function EncoderDecoder() {
  const [format, setFormat] = useState<Format>("json-string");
  const [direction, setDirection] = useState<Direction>("encode");
  const [sortKeys, setSortKeys] = useState(false);
  const [input, setInput] = useState("");

  const result = useMemo(
    () => convertJsonEncoding(input, format, direction, sortKeys),
    [direction, format, input, sortKeys],
  );

  const directionLabels = format === "json-string"
    ? { encode: "JSON → string", decode: "String → JSON" }
    : { encode: "JSON → form", decode: "Form → JSON" };

  const inputLabel = direction === "encode"
    ? "JSON input"
    : format === "json-string"
      ? "Escaped JSON string"
      : "Form URL-encoded input";

  const outputLabel = direction === "encode"
    ? format === "json-string" ? "JSON string" : "Form URL-encoded result"
    : "Decoded JSON";

  const placeholder = direction === "encode"
    ? "Paste valid JSON…"
    : format === "json-string"
      ? 'Paste an escaped string, e.g. "{\\"name\\":\\"Ada\\"}"'
      : "Paste form data, e.g. user%5Bname%5D=Ada&active=true";

  return (
    <section>
      <ToolHeader
        category="Encoding utilities"
        title="JSON Encoder / Decoder"
        description="Convert JSON to escaped JSON strings or form URL-encoded data—and back again."
      />

      <div className="formatter-card utility-editor-card">
        <div className="options-bar wrap-options">
          <div className="option">
            <span className="option-label">Format</span>
            <div className="segmented-control" role="group" aria-label="Encoding format">
              {FORMATS.map((item) => (
                <button
                  className={`segment${format === item.id ? " active" : ""}`}
                  type="button"
                  onClick={() => setFormat(item.id)}
                  key={item.id}
                  aria-pressed={format === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="option">
            <span className="option-label">Direction</span>
            <div className="segmented-control" role="group" aria-label="Conversion direction">
              {(["encode", "decode"] as const).map((item) => (
                <button
                  className={`segment${direction === item ? " active" : ""}`}
                  type="button"
                  onClick={() => setDirection(item)}
                  key={item}
                  aria-pressed={direction === item}
                >
                  {directionLabels[item]}
                </button>
              ))}
            </div>
          </div>
          <div className="option">
            <span className="option-label">Sort fields A–Z</span>
            <button
              type="button"
              className={`switch${sortKeys ? " on" : ""}`}
              onClick={() => setSortKeys((current) => !current)}
              aria-pressed={sortKeys}
              aria-label="Sort JSON fields alphabetically"
            />
          </div>
          {format === "form-urlencoded" && (
            <span className="encoding-hint">Nested values use bracket notation.</span>
          )}
        </div>

        <div className="editor-grid">
          <div className="editor-panel">
            <div className="panel-heading">
              <span className="panel-title">{inputLabel}</span>
              <button className="clear-button" type="button" onClick={() => setInput("")}>Clear</button>
            </div>
            <textarea
              className="editor-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              spellCheck="false"
              aria-label={inputLabel}
            />
          </div>
          <div className="editor-panel">
            <div className="panel-heading">
              <span className="panel-title">{outputLabel}</span>
              <CopyButton value={result.kind === "success" ? result.output : ""} compact />
            </div>
            <div className="result-wrap">
              {result.kind === "success" ? (
                <pre className="result" aria-label={outputLabel}>{result.output || "(empty string)"}</pre>
              ) : (
                <div className={`empty-result${result.kind === "error" ? " error" : ""}`}>
                  {result.kind === "error" ? result.message : "The converted result will appear here."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
