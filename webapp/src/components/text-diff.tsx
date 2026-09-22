"use client";

import { useState } from "react";
import {
  createLineDiff,
  prepareDiffInput,
  type DiffInputMode,
  type DiffResult,
  type PreparedDiffInput,
} from "@/lib/diff";
import { ToolHeader } from "./tool-header";

type Comparison = {
  result: DiffResult;
  before: PreparedDiffInput;
  after: PreparedDiffInput;
  mode: DiffInputMode;
};

const INPUT_MODES: Array<{ value: DiffInputMode; label: string }> = [
  { value: "json", label: "JSON" },
  { value: "text", label: "Text" },
];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The input could not be prepared.";
}

function preparedLabel(mode: DiffInputMode, decodedJsonString: boolean): string {
  if (mode === "text") return "Plain text";
  return decodedJsonString
    ? "JSON string · decoded, formatted & sorted"
    : "JSON · formatted & sorted";
}

export function TextDiff() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [inputMode, setInputMode] = useState<DiffInputMode>("json");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState("");

  function compare() {
    if (!before && !after) {
      setComparison(null);
      setError("Enter at least one value to compare.");
      return;
    }

    let preparedBefore: PreparedDiffInput;
    let preparedAfter: PreparedDiffInput;

    try {
      preparedBefore = prepareDiffInput(before, inputMode);
    } catch (caughtError) {
      setComparison(null);
      setError(`Original: ${errorMessage(caughtError)}`);
      return;
    }

    try {
      preparedAfter = prepareDiffInput(after, inputMode);
    } catch (caughtError) {
      setComparison(null);
      setError(`Changed: ${errorMessage(caughtError)}`);
      return;
    }

    setComparison({
      result: createLineDiff(preparedBefore.value, preparedAfter.value),
      before: preparedBefore,
      after: preparedAfter,
      mode: inputMode,
    });
    setError("");
  }

  function clear() {
    setBefore("");
    setAfter("");
    setComparison(null);
    setError("");
  }

  function swap() {
    setBefore(after);
    setAfter(before);
    setComparison(null);
    setError("");
  }

  function handleShortcut(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") compare();
  }

  const identical = comparison &&
    comparison.result.additions === 0 &&
    comparison.result.removals === 0;

  return (
    <section>
      <ToolHeader
        category="Comparison utilities"
        title="Text & JSON Diff"
        description="Compare text, JSON, or escaped JSON strings. Structured inputs are decoded, formatted, and sorted before comparison."
      />

      <div className="utility-card diff-input-card">
        <div className="diff-mode-bar">
          <label className="diff-mode-control">
            <span className="option-label">Comparison type</span>
            <select
              className="diff-format-select"
              value={inputMode}
              onChange={(event) => {
                setInputMode(event.target.value as DiffInputMode);
                setComparison(null);
                setError("");
              }}
              aria-label="Input format"
            >
              {INPUT_MODES.map((mode) => (
                <option value={mode.value} key={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>
          <span className="diff-mode-hint">
            {inputMode === "json"
              ? "Escaped JSON strings are decoded automatically."
              : "Inputs are compared exactly as entered."}
          </span>
        </div>
        <div className="diff-editors">
          <div className="diff-pane">
            <div className="panel-heading">
              <span className="panel-title"><span className="diff-dot before" /> Original</span>
              <span className="panel-meta">{before.length.toLocaleString()} characters</span>
            </div>
            <textarea
              className="editor-input"
              value={before}
              onChange={(event) => {
                setBefore(event.target.value);
                setComparison(null);
                setError("");
              }}
              onKeyDown={handleShortcut}
              placeholder={`Paste the original ${inputMode === "json" ? "JSON or JSON string" : "text"}…`}
              spellCheck="false"
              aria-label="Original text"
            />
          </div>
          <div className="diff-pane">
            <div className="panel-heading">
              <span className="panel-title"><span className="diff-dot after" /> Changed</span>
              <span className="panel-meta">{after.length.toLocaleString()} characters</span>
            </div>
            <textarea
              className="editor-input"
              value={after}
              onChange={(event) => {
                setAfter(event.target.value);
                setComparison(null);
                setError("");
              }}
              onKeyDown={handleShortcut}
              placeholder={`Paste the changed ${inputMode === "json" ? "JSON or JSON string" : "text"}…`}
              spellCheck="false"
              aria-label="Changed text"
            />
          </div>
        </div>
        <div className="diff-actions">
          <span className={`status-message${error ? " error" : ""}`} role="status">
            {error || "Tip: press ⌘ / Ctrl + Enter to compare"}
          </span>
          <div>
            <button className="secondary-button" type="button" onClick={clear}>Clear</button>
            <button className="secondary-button" type="button" onClick={swap}>Swap sides</button>
            <button className="format-button" type="button" onClick={compare}>Compare</button>
          </div>
        </div>
      </div>

      {inputMode === "json" && (
        <div className="utility-card diff-prepared-card">
          <div className="diff-summary">
            <div>
              <span className="card-title">Prepared for comparison</span>
              <span className="card-subtitle">Decoded and formatted without changing your original input</span>
            </div>
          </div>
          {!comparison ? (
            <div className="utility-empty prepared-empty">
              The decoded and formatted inputs will appear here.
            </div>
          ) : (
            <div className="prepared-grid">
              {([
                { title: "Original", prepared: comparison.before },
                { title: "Changed", prepared: comparison.after },
              ] as const).map((prepared) => (
                <div className="prepared-pane" key={prepared.title}>
                  <div className="prepared-heading">
                    <span className="panel-title">{prepared.title}</span>
                    <span className="comparison-mode json">
                      {preparedLabel("json", prepared.prepared.decodedJsonString)}
                    </span>
                  </div>
                  <pre className="prepared-output">{prepared.prepared.value || "(empty input)"}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="utility-card diff-result-card">
        <div className="diff-summary">
          <div>
            <span className="card-title">Comparison result</span>
            {comparison && (
              <span className={`comparison-mode ${comparison.mode}`}>
                {comparison.mode === "json" ? "Prepared JSON" : "Plain text"}
              </span>
            )}
          </div>
          {comparison && (
            <div className="diff-stats" aria-label="Diff statistics">
              <span className="removed">−{comparison.result.removals}</span>
              <span className="added">+{comparison.result.additions}</span>
              <span>{comparison.result.unchanged} unchanged</span>
            </div>
          )}
        </div>

        {!comparison ? (
          <div className="utility-empty diff-empty">The line-by-line difference will appear here.</div>
        ) : identical ? (
          <div className="identical-result">No differences found.</div>
        ) : (
          <div className="diff-viewer" role="table" aria-label="Line-by-line difference">
            {comparison.result.lines.map((line, index) => (
              <div className={`diff-line ${line.type}`} role="row" key={`${line.type}-${index}`}>
                <span className="line-number" role="cell">{line.oldLine ?? ""}</span>
                <span className="line-number" role="cell">{line.newLine ?? ""}</span>
                <span className="line-marker" role="cell">
                  {line.type === "added" ? "+" : line.type === "removed" ? "−" : ""}
                </span>
                <code role="cell">
                  {line.segments
                    ? line.segments.map((segment, segmentIndex) => (
                        <span
                          className={segment.type === "equal" ? undefined : "character-change"}
                          key={`${segment.type}-${segmentIndex}`}
                        >
                          {segment.text}
                        </span>
                      ))
                    : line.text || "\u00a0"}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
