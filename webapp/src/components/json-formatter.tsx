"use client";

import { useState } from "react";
import { formatJson, type ArrayStyle } from "@/lib/json-format";
import { Icon } from "./icons";
import { ToolHeader } from "./tool-header";

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [arrayStyle, setArrayStyle] = useState<ArrayStyle>("expanded");
  const [sortKeys, setSortKeys] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function handleFormat() {
    if (!input.trim()) {
      setResult("");
      setError("Paste some JSON before formatting.");
      return;
    }

    try {
      setResult(formatJson(input, { arrayStyle, sortKeys }));
      setError("");
      setCopied(false);
    } catch (caughtError) {
      setResult("");
      const message = caughtError instanceof Error ? caughtError.message : "Invalid JSON.";
      setError(message.replace(/^Unexpected token/, "Invalid JSON — unexpected token"));
    }
  }

  async function handleCopy() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn’t copy automatically. Select the result and copy it manually.");
    }
  }

  function handleClear() {
    setInput("");
    setResult("");
    setError("");
    setCopied(false);
  }

  return (
    <section id="json-formatter" aria-labelledby="json-formatter-title">
      <ToolHeader
        category="Data utilities"
        title="JSON Formatter"
        description="Format, validate, and organize JSON without sending your data anywhere."
        titleId="json-formatter-title"
      />

      <div className="formatter-card">
        <div className="options-bar" aria-label="Format options">
          <div className="option">
            <span className="option-label">Arrays</span>
            <div className="segmented-control" role="group" aria-label="Array display style">
              <button
                className={`segment${arrayStyle === "expanded" ? " active" : ""}`}
                type="button"
                onClick={() => setArrayStyle("expanded")}
                aria-pressed={arrayStyle === "expanded"}
              >
                Expanded
              </button>
              <button
                className={`segment${arrayStyle === "inline" ? " active" : ""}`}
                type="button"
                onClick={() => setArrayStyle("inline")}
                aria-pressed={arrayStyle === "inline"}
              >
                Inline
              </button>
            </div>
          </div>
          <div className="option">
            <span className="option-label">Sort fields A–Z</span>
            <button
              type="button"
              className={`switch${sortKeys ? " on" : ""}`}
              onClick={() => setSortKeys((current) => !current)}
              aria-pressed={sortKeys}
              aria-label="Sort object fields alphabetically"
            />
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-panel">
            <div className="panel-heading">
              <span className="panel-title"><Icon name="clipboard" /> JSON input</span>
              <button className="clear-button" type="button" onClick={handleClear}>
                <Icon name="trash" /> Clear
              </button>
            </div>
            <textarea
              className="editor-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  handleFormat();
                }
              }}
              placeholder={'Paste your JSON here…\n\n{ "hello": "world" }'}
              spellCheck="false"
              aria-label="JSON input"
            />
          </div>

          <div className="editor-panel">
            <div className="panel-heading">
              <span className="panel-title"><Icon name="braces" /> Formatted result</span>
              {result && (
                <button
                  className={`copy-button${copied ? " success" : ""}`}
                  type="button"
                  onClick={handleCopy}
                >
                  <Icon name="clipboard" /> {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            <div className="result-wrap">
              {result ? (
                <pre className="result" aria-label="Formatted JSON result">{result}</pre>
              ) : (
                <div className="empty-result">Your formatted JSON will appear here.</div>
              )}
            </div>
          </div>
        </div>

        <footer className="formatter-footer">
          <span className={`status-message${error ? " error" : ""}`} role="status">
            {error || "Tip: press ⌘ / Ctrl + Enter to format"}
          </span>
          <button className="format-button" type="button" onClick={handleFormat}>
            <Icon name="format" /> Format JSON
          </button>
        </footer>
      </div>
    </section>
  );
}
