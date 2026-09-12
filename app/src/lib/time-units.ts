export const TIME_UNITS = [
  { id: "ns", label: "Nanoseconds", seconds: 1e-9 },
  { id: "us", label: "Microseconds", seconds: 1e-6 },
  { id: "ms", label: "Milliseconds", seconds: 1e-3 },
  { id: "s", label: "Seconds", seconds: 1 },
  { id: "min", label: "Minutes", seconds: 60 },
  { id: "h", label: "Hours", seconds: 3_600 },
  { id: "d", label: "Days", seconds: 86_400 },
  { id: "wk", label: "Weeks", seconds: 604_800 },
] as const;

export type TimeUnit = (typeof TIME_UNITS)[number]["id"];

export function convertTime(value: number, from: TimeUnit, to: TimeUnit): number {
  const fromUnit = TIME_UNITS.find((unit) => unit.id === from);
  const toUnit = TIME_UNITS.find((unit) => unit.id === to);
  if (!fromUnit || !toUnit) throw new Error("Unknown time unit.");
  return (value * fromUnit.seconds) / toUnit.seconds;
}

export function formatConvertedNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  if (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-7) {
    return value.toExponential(8).replace(/\.0+(?=e)/, "");
  }
  return Number(value.toPrecision(12)).toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 12,
  });
}
