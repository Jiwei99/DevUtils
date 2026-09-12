type CronFieldKey = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

type CronFieldDefinition = {
  key: CronFieldKey;
  label: string;
  min: number;
  max: number;
  names?: Record<string, number>;
};

export type CronSchedule = Record<CronFieldKey, Set<number>> & {
  source: Record<CronFieldKey, string>;
};

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const DAYS: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const FIELDS: CronFieldDefinition[] = [
  { key: "minute", label: "minute", min: 0, max: 59 },
  { key: "hour", label: "hour", min: 0, max: 23 },
  { key: "dayOfMonth", label: "day of month", min: 1, max: 31 },
  { key: "month", label: "month", min: 1, max: 12, names: MONTHS },
  { key: "dayOfWeek", label: "day of week", min: 0, max: 7, names: DAYS },
];

export const CRON_PRESETS = [
  { label: "Every minute", expression: "* * * * *" },
  { label: "Every 15 minutes", expression: "*/15 * * * *" },
  { label: "Every hour", expression: "0 * * * *" },
  { label: "Daily at midnight", expression: "0 0 * * *" },
  { label: "Weekdays at 9 AM", expression: "0 9 * * 1-5" },
  { label: "Every Sunday", expression: "0 0 * * 0" },
] as const;

function resolveValue(value: string, field: CronFieldDefinition): number {
  const namedValue = field.names?.[value.toLocaleUpperCase()];
  const result = namedValue ?? Number(value);
  if (!Number.isInteger(result) || result < field.min || result > field.max) {
    throw new Error(`${field.label} must be between ${field.min} and ${field.max}.`);
  }
  return result;
}

function normalizeValue(value: number, field: CronFieldDefinition): number {
  return field.key === "dayOfWeek" && value === 7 ? 0 : value;
}

function parseField(source: string, field: CronFieldDefinition): Set<number> {
  const values = new Set<number>();
  if (!source) throw new Error(`The ${field.label} field is empty.`);

  for (const part of source.split(",")) {
    const stepParts = part.split("/");
    if (stepParts.length > 2) throw new Error(`Invalid ${field.label} step: ${part}.`);

    const rangeSource = stepParts[0];
    const step = stepParts[1] === undefined ? 1 : Number(stepParts[1]);
    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`The ${field.label} step must be a positive integer.`);
    }

    let start: number;
    let end: number;
    if (rangeSource === "*") {
      start = field.min;
      end = field.max;
    } else if (rangeSource.includes("-")) {
      const range = rangeSource.split("-");
      if (range.length !== 2) throw new Error(`Invalid ${field.label} range: ${part}.`);
      start = resolveValue(range[0], field);
      end = resolveValue(range[1], field);
      if (start > end) throw new Error(`${field.label} ranges must run from low to high.`);
    } else {
      start = resolveValue(rangeSource, field);
      end = start;
      if (stepParts[1] !== undefined) end = field.max;
    }

    for (let value = start; value <= end; value += step) {
      values.add(normalizeValue(value, field));
    }
  }

  return values;
}

export function parseCron(expression: string): CronSchedule {
  const parts = expression.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length !== 5 || parts.some((part) => !part)) {
    throw new Error("Use five fields: minute, hour, day of month, month, and day of week.");
  }

  const parsed = {} as CronSchedule;
  parsed.source = {} as Record<CronFieldKey, string>;
  FIELDS.forEach((field, index) => {
    parsed[field.key] = parseField(parts[index], field);
    parsed.source[field.key] = parts[index];
  });
  return parsed;
}

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function describePart(source: string, unit: string): string {
  if (source === "*") return `every ${unit}`;
  const step = source.match(/^\*\/(\d+)$/)?.[1];
  if (step) return `every ${plural(Number(step), unit)}`;
  if (source.includes(",")) return `${unit}s ${source}`;
  if (source.includes("-")) return `${unit}s ${source}`;
  return `${unit} ${source}`;
}

export function describeCron(expression: string): string {
  const normalized = expression.trim().replace(/\s+/g, " ");
  const preset = CRON_PRESETS.find((item) => item.expression === normalized);
  if (preset) return preset.label;

  parseCron(normalized);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = normalized.split(" ");
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    const time = `${String(Number(hour)).padStart(2, "0")}:${String(Number(minute)).padStart(2, "0")}`;
    const schedule = [
      dayOfMonth === "*" ? null : `on day ${dayOfMonth}`,
      month === "*" ? null : `in month ${month}`,
      dayOfWeek === "*" ? null : `on weekday ${dayOfWeek}`,
    ].filter(Boolean);
    return `At ${time}${schedule.length ? `, ${schedule.join(", ")}` : " every day"}`;
  }

  return [
    describePart(minute, "minute"),
    describePart(hour, "hour"),
    describePart(dayOfMonth, "day of month"),
    describePart(month, "month"),
    describePart(dayOfWeek, "weekday"),
  ].join("; ");
}

function matchesDate(date: Date, schedule: CronSchedule): boolean {
  if (!schedule.minute.has(date.getMinutes())) return false;
  if (!schedule.hour.has(date.getHours())) return false;
  if (!schedule.month.has(date.getMonth() + 1)) return false;

  const dayOfMonthMatches = schedule.dayOfMonth.has(date.getDate());
  const dayOfWeekMatches = schedule.dayOfWeek.has(date.getDay());
  const dayOfMonthWildcard = schedule.source.dayOfMonth === "*";
  const dayOfWeekWildcard = schedule.source.dayOfWeek === "*";

  if (dayOfMonthWildcard && dayOfWeekWildcard) return true;
  if (dayOfMonthWildcard) return dayOfWeekMatches;
  if (dayOfWeekWildcard) return dayOfMonthMatches;
  return dayOfMonthMatches || dayOfWeekMatches;
}

export function nextCronRuns(expression: string, count = 5, from = new Date()): Date[] {
  const schedule = parseCron(expression);
  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);
  const results: Date[] = [];
  const maximumChecks = 60 * 24 * 366 * 2;

  for (let checked = 0; checked < maximumChecks && results.length < count; checked += 1) {
    if (matchesDate(candidate, schedule)) results.push(new Date(candidate));
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return results;
}
