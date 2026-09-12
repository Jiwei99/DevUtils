"use client";

import { useMemo, useState } from "react";
import { explainRegex } from "@/lib/regex-explain";
import { ToolHeader } from "./tool-header";

const FLAGS = [
  { value: "g", label: "Global" },
  { value: "i", label: "Ignore case" },
  { value: "m", label: "Multiline" },
  { value: "s", label: "Dot all" },
  { value: "u", label: "Unicode" },
] as const;

type MatchResult = { value: string; index: number; groups: string[] };

export function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [testText, setTestText] = useState("");
  const [flags, setFlags] = useState("g");

  const analysis = useMemo(() => {
    if (!pattern) return { matches: [] as MatchResult[], error: "" };
    try {
      const regex = new RegExp(pattern, flags);
      const rawMatches = flags.includes("g")
        ? Array.from(testText.matchAll(regex)).slice(0, 100)
        : [regex.exec(testText)].filter((match): match is RegExpExecArray => match !== null);
      return {
        error: "",
        matches: rawMatches.map((match) => ({
          value: match[0],
          index: match.index ?? 0,
          groups: match.slice(1).map((group) => group ?? ""),
        })),
      };
    } catch (error) {
      return {
        matches: [] as MatchResult[],
        error: error instanceof Error ? error.message : "Invalid regular expression.",
      };
    }
  }, [flags, pattern, testText]);

  const explanation = useMemo(() => explainRegex(pattern), [pattern]);

  function toggleFlag(flag: string) {
    setFlags((current) => current.includes(flag)
      ? current.replace(flag, "")
      : `${current}${flag}`);
  }

  return (
    <section>
      <ToolHeader
        category="Text utilities"
        title="Regex Tester"
        description="Test JavaScript regular expressions and understand what each part does."
      />

      <div className="utility-layout two-column-wide">
        <div className="utility-card">
          <div className="card-section">
            <label className="field-label" htmlFor="regex-pattern">Regular expression</label>
            <div className={`regex-input-wrap${analysis.error ? " invalid" : ""}`}>
              <span>/</span>
              <input
                id="regex-pattern"
                className="text-input code-input"
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
                placeholder="e.g. ^[a-z]+\\d{2}$"
                spellCheck="false"
              />
              <span>/{flags}</span>
            </div>
            {analysis.error && <p className="field-error">{analysis.error}</p>}
          </div>

          <div className="card-section compact-section">
            <span className="field-label">Flags</span>
            <div className="check-list">
              {FLAGS.map((flag) => (
                <label className="check-option" key={flag.value}>
                  <input
                    type="checkbox"
                    checked={flags.includes(flag.value)}
                    onChange={() => toggleFlag(flag.value)}
                  />
                  <code>{flag.value}</code> {flag.label}
                </label>
              ))}
            </div>
          </div>

          <div className="card-section fill-section">
            <label className="field-label" htmlFor="regex-test-text">Test text</label>
            <textarea
              id="regex-test-text"
              className="utility-textarea tall"
              value={testText}
              onChange={(event) => setTestText(event.target.value)}
              placeholder="Paste the text you want to test…"
              spellCheck="false"
            />
          </div>
        </div>

        <div className="stacked-results">
          <div className="utility-card result-card">
            <div className="card-heading">
              <div>
                <span className="card-title">Matches</span>
                <span className="card-subtitle">Up to 100 results</span>
              </div>
              <span className={`count-badge${analysis.matches.length ? " found" : ""}`}>
                {analysis.matches.length}
              </span>
            </div>
            <div className="scroll-area match-list">
              {!pattern || !testText ? (
                <div className="utility-empty">Enter a pattern and test text to see matches.</div>
              ) : analysis.error ? (
                <div className="utility-empty error">Fix the expression to continue.</div>
              ) : analysis.matches.length === 0 ? (
                <div className="utility-empty">No matches found.</div>
              ) : analysis.matches.map((match, index) => (
                <div className="match-row" key={`${match.index}-${index}`}>
                  <span className="match-number">{index + 1}</span>
                  <div>
                    <code>{match.value || "(empty match)"}</code>
                    <span>Index {match.index}{match.groups.length ? ` · ${match.groups.length} capture group${match.groups.length === 1 ? "" : "s"}` : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="utility-card result-card">
            <div className="card-heading">
              <div>
                <span className="card-title">Explanation</span>
                <span className="card-subtitle">JavaScript regex syntax</span>
              </div>
            </div>
            <div className="scroll-area explanation-list">
              {explanation.length === 0 ? (
                <div className="utility-empty">Your expression will be explained token by token.</div>
              ) : explanation.map((item, index) => (
                <div className="explanation-row" key={`${item.token}-${index}`}>
                  <code>{item.token}</code>
                  <span>{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
