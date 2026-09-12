"use client";

import { useState } from "react";
import { createLineDiff, prepareDiffInput, type DiffResult } from "@/lib/diff";
import { ToolHeader } from "./tool-header";

type Comparison = {
  result: DiffResult;
  json: boolean;
};

export function TextDiff() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState("");

  function compare() {
    if (!before && !after) {
      setComparison(null);
      setError("Enter at least one value to compare.");
      return;
    }

    const prepared = prepareDiffInput(before, after);
    setComparison({
      result: createLineDiff(prepared.before, prepared.after),
      json: prepared.json,
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
        description="Compare two texts line by line. JSON inputs are formatted and sorted automatically."
      />

      <div className="utility-card diff-input-card">
        <div className="diff-editors">
          <div className="diff-pane">
            <div className="panel-heading">
              <span className="panel-title"><span className="diff-dot before" /> Original</span>
              <span className="panel-meta">{before.length.toLocaleString()} characters</span>
            </div>
            <textarea
              className="editor-input"
              value={before}
              onChange={(event) => setBefore(event.target.value)}
              onKeyDown={handleShortcut}
              placeholder="Paste the original text or JSON…"
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
              onChange={(event) => setAfter(event.target.value)}
              onKeyDown={handleShortcut}
              placeholder="Paste the changed text or JSON…"
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

      <div className="utility-card diff-result-card">
        <div className="diff-summary">
          <div>
            <span className="card-title">Comparison result</span>
            {comparison && (
              <span className={`comparison-mode${comparison.json ? " json" : ""}`}>
                {comparison.json ? "JSON · formatted & sorted" : "Plain text"}
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
