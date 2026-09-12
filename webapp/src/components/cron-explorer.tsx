"use client";

import { useMemo, useState } from "react";
import { CRON_PRESETS, describeCron, nextCronRuns } from "@/lib/cron";
import { CopyButton } from "./copy-button";
import { ToolHeader } from "./tool-header";

const FIELD_GUIDE = [
  ["Minute", "0–59"],
  ["Hour", "0–23"],
  ["Day", "1–31"],
  ["Month", "1–12"],
  ["Weekday", "0–7"],
] as const;

export function CronExplorer() {
  const [expression, setExpression] = useState("");

  const analysis = useMemo(() => {
    if (!expression.trim()) return { description: "", runs: [] as Date[], error: "" };
    try {
      return {
        description: describeCron(expression),
        runs: nextCronRuns(expression),
        error: "",
      };
    } catch (error) {
      return {
        description: "",
        runs: [] as Date[],
        error: error instanceof Error ? error.message : "Invalid cron expression.",
      };
    }
  }, [expression]);

  return (
    <section>
      <ToolHeader
        category="Scheduling utilities"
        title="Cron Explorer"
        description="Build, validate, and understand standard five-field cron schedules."
      />

      <div className="utility-layout cron-layout">
        <div className="utility-card">
          <div className="card-section">
            <label className="field-label" htmlFor="cron-expression">Cron expression</label>
            <div className="input-with-action">
              <input
                id="cron-expression"
                className={`text-input code-input large-input${analysis.error ? " invalid" : ""}`}
                value={expression}
                onChange={(event) => setExpression(event.target.value)}
                placeholder="*/15 9-17 * * 1-5"
                spellCheck="false"
              />
              <CopyButton value={expression} compact />
            </div>
            {analysis.error && <p className="field-error">{analysis.error}</p>}
          </div>

          <div className="cron-field-guide" aria-label="Cron field order">
            {FIELD_GUIDE.map(([label, range]) => (
              <div key={label}><strong>{label}</strong><span>{range}</span></div>
            ))}
          </div>

          <div className="card-section">
            <span className="field-label">Quick presets</span>
            <div className="preset-list">
              {CRON_PRESETS.map((preset) => (
                <button type="button" key={preset.expression} onClick={() => setExpression(preset.expression)}>
                  <span>{preset.label}</span><code>{preset.expression}</code>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="utility-card result-card cron-result">
          <div className="card-heading">
            <div>
              <span className="card-title">Schedule details</span>
              <span className="card-subtitle">Times use your browser&apos;s local timezone</span>
            </div>
          </div>
          {!analysis.description ? (
            <div className="utility-empty">Enter an expression or choose a preset to inspect its schedule.</div>
          ) : (
            <div className="cron-details">
              <div className="summary-callout">
                <span>Runs</span>
                <strong>{analysis.description}</strong>
              </div>
              <div>
                <span className="field-label">Next runs</span>
                <ol className="run-list">
                  {analysis.runs.map((run) => (
                    <li key={run.toISOString()}>
                      <span>{run.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                      <strong>{run.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</strong>
                    </li>
                  ))}
                </ol>
                {analysis.runs.length === 0 && <p className="field-error">No run found in the next two years.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
