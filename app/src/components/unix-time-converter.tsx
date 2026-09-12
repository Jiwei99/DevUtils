"use client";

import { useMemo, useState } from "react";
import {
  localDateTimeToUnix,
  toDateTimeLocalValue,
  unixTimestampToDate,
  type TimestampDateResult,
  type TimestampUnit,
} from "@/lib/unix-time";
import { CopyButton } from "./copy-button";
import { ToolHeader } from "./tool-header";

type Direction = "timestamp-to-date" | "date-to-timestamp";

function TimestampResults({ result }: { result: TimestampDateResult | null }) {
  const rows = [
    { label: "Local time", hint: "Browser timezone", value: result?.local ?? "" },
    { label: "UTC", hint: "Coordinated Universal Time", value: result?.utc ?? "" },
    { label: "ISO 8601", hint: "Machine-readable", value: result?.iso ?? "" },
    { label: "Unix seconds", hint: "10-digit standard", value: result?.seconds ?? "" },
    { label: "Unix milliseconds", hint: "JavaScript timestamp", value: result?.milliseconds ?? "" },
  ];

  return (
    <div className="unix-results">
      {rows.map((row) => (
        <div className="value-row unix-value-row" key={row.label}>
          <div><strong>{row.label}</strong><span>{row.hint}</span></div>
          <code>{row.value || "—"}</code>
          <CopyButton value={row.value} compact />
        </div>
      ))}
    </div>
  );
}

export function UnixTimeConverter() {
  const [direction, setDirection] = useState<Direction>("timestamp-to-date");
  const [timestamp, setTimestamp] = useState("");
  const [unit, setUnit] = useState<TimestampUnit>("seconds");
  const [dateTime, setDateTime] = useState("");

  const conversion = useMemo(() => {
    const hasInput = direction === "timestamp-to-date" ? timestamp.trim() !== "" : dateTime !== "";
    if (!hasInput) return { result: null as TimestampDateResult | null, error: "" };

    try {
      return {
        result: direction === "timestamp-to-date"
          ? unixTimestampToDate(timestamp, unit)
          : localDateTimeToUnix(dateTime),
        error: "",
      };
    } catch (error) {
      return {
        result: null as TimestampDateResult | null,
        error: error instanceof Error ? error.message : "Unable to convert this value.",
      };
    }
  }, [dateTime, direction, timestamp, unit]);

  function useCurrentTime() {
    const now = new Date();
    if (direction === "timestamp-to-date") {
      setTimestamp(unit === "seconds"
        ? String(Math.floor(now.getTime() / 1_000))
        : String(now.getTime()));
    } else {
      setDateTime(toDateTimeLocalValue(now));
    }
  }

  return (
    <section>
      <ToolHeader
        category="Time utilities"
        title="Unix Time Converter"
        description="Convert Unix timestamps into readable dates, or turn local dates back into timestamps."
      />

      <div className="utility-card unix-card">
        <div className="options-bar">
          <div className="option">
            <span className="option-label">Direction</span>
            <div className="segmented-control" role="group" aria-label="Conversion direction">
              <button
                className={`segment${direction === "timestamp-to-date" ? " active" : ""}`}
                type="button"
                onClick={() => setDirection("timestamp-to-date")}
                aria-pressed={direction === "timestamp-to-date"}
              >
                Timestamp → Date
              </button>
              <button
                className={`segment${direction === "date-to-timestamp" ? " active" : ""}`}
                type="button"
                onClick={() => setDirection("date-to-timestamp")}
                aria-pressed={direction === "date-to-timestamp"}
              >
                Date → Timestamp
              </button>
            </div>
          </div>
        </div>

        <div className="unix-input-section">
          {direction === "timestamp-to-date" ? (
            <>
              <div className="unix-main-input">
                <div>
                  <label className="field-label" htmlFor="unix-timestamp">Unix timestamp</label>
                  <input
                    id="unix-timestamp"
                    className={`text-input code-input large-input${conversion.error ? " invalid" : ""}`}
                    value={timestamp}
                    onChange={(event) => setTimestamp(event.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 1767225600"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="timestamp-unit">Unit</label>
                  <select id="timestamp-unit" className="select-input large-input" value={unit} onChange={(event) => setUnit(event.target.value as TimestampUnit)}>
                    <option value="seconds">Seconds</option>
                    <option value="milliseconds">Milliseconds</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="field-label" htmlFor="local-date-time">Local date and time</label>
              <input
                id="local-date-time"
                className={`text-input large-input${conversion.error ? " invalid" : ""}`}
                type="datetime-local"
                step="1"
                value={dateTime}
                onChange={(event) => setDateTime(event.target.value)}
              />
            </div>
          )}
          <div className="unix-input-footer">
            <span className={`status-message${conversion.error ? " error" : ""}`} role="status">
              {conversion.error || "Dates are interpreted in your browser’s local timezone."}
            </span>
            <button className="secondary-button" type="button" onClick={useCurrentTime}>Use current time</button>
          </div>
        </div>

        <div className="unix-result-heading">
          <span className="card-title">Converted values</span>
        </div>
        <TimestampResults result={conversion.result} />
      </div>
    </section>
  );
}
