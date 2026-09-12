export type TimestampUnit = "seconds" | "milliseconds";

export type TimestampDateResult = {
  date: Date;
  seconds: string;
  milliseconds: string;
  iso: string;
  utc: string;
  local: string;
};

function formatLocal(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function buildResult(date: Date): TimestampDateResult {
  const milliseconds = date.getTime();
  if (!Number.isFinite(milliseconds)) throw new Error("The date is outside the supported range.");

  return {
    date,
    seconds: String(Math.floor(milliseconds / 1_000)),
    milliseconds: String(milliseconds),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: formatLocal(date),
  };
}

export function unixTimestampToDate(input: string, unit: TimestampUnit): TimestampDateResult {
  const value = Number(input.trim());
  if (!input.trim() || !Number.isFinite(value)) {
    throw new Error("Enter a valid Unix timestamp.");
  }
  return buildResult(new Date(unit === "seconds" ? value * 1_000 : value));
}

export function localDateTimeToUnix(input: string): TimestampDateResult {
  if (!input) throw new Error("Choose a local date and time.");
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid local date and time.");
  return buildResult(date);
}

export function toDateTimeLocalValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 19);
}
