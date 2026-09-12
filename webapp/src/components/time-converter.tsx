"use client";

import { useMemo, useState } from "react";
import { convertTime, formatConvertedNumber, TIME_UNITS, type TimeUnit } from "@/lib/time-units";
import { CopyButton } from "./copy-button";
import { ToolHeader } from "./tool-header";

export function TimeConverter() {
  const [input, setInput] = useState("");
  const [fromUnit, setFromUnit] = useState<TimeUnit>("s");
  const [toUnit, setToUnit] = useState<TimeUnit>("ms");

  const parsedValue = Number(input);
  const valid = input.trim() !== "" && Number.isFinite(parsedValue);
  const targetValue = valid ? formatConvertedNumber(convertTime(parsedValue, fromUnit, toUnit)) : "";
  const conversions = useMemo(() => {
    if (!valid) return [];
    return TIME_UNITS.map((unit) => ({
      ...unit,
      value: formatConvertedNumber(convertTime(parsedValue, fromUnit, unit.id)),
    }));
  }, [fromUnit, parsedValue, valid]);

  return (
    <section>
      <ToolHeader
        category="Time utilities"
        title="Time Unit Converter"
        description="Convert durations across nanoseconds, milliseconds, seconds, days, and more."
      />

      <div className="utility-card converter-card">
        <div className="converter-grid time-converter-grid">
          <div className="converter-field">
            <label className="field-label" htmlFor="time-input">Value</label>
            <input
              id="time-input"
              className={`text-input large-input${input && !valid ? " invalid" : ""}`}
              inputMode="decimal"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Enter a duration…"
            />
          </div>
          <div className="converter-field">
            <label className="field-label" htmlFor="from-time-unit">From</label>
            <select id="from-time-unit" className="select-input" value={fromUnit} onChange={(event) => setFromUnit(event.target.value as TimeUnit)}>
              {TIME_UNITS.map((unit) => <option value={unit.id} key={unit.id}>{unit.label}</option>)}
            </select>
          </div>
          <div className="converter-arrow" aria-hidden="true">→</div>
          <div className="converter-field">
            <label className="field-label" htmlFor="to-time-unit">To</label>
            <select id="to-time-unit" className="select-input" value={toUnit} onChange={(event) => setToUnit(event.target.value as TimeUnit)}>
              {TIME_UNITS.map((unit) => <option value={unit.id} key={unit.id}>{unit.label}</option>)}
            </select>
          </div>
        </div>
        {input && !valid && <p className="field-error conversion-error">Enter a valid finite number.</p>}

        <div className="primary-result">
          <div>
            <span>{TIME_UNITS.find((unit) => unit.id === toUnit)?.label} result</span>
            <code>{targetValue || "—"}</code>
          </div>
          <CopyButton value={targetValue} />
        </div>

        <div className="common-results two-column-results">
          {TIME_UNITS.map((unit) => {
            const value = conversions.find((result) => result.id === unit.id)?.value ?? "";
            return (
              <div className="value-row" key={unit.id}>
                <div><strong>{unit.label}</strong><span>{unit.id}</span></div>
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
