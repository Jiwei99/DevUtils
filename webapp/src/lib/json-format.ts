export type ArrayStyle = "expanded" | "inline";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type FormatOptions = {
  arrayStyle: ArrayStyle;
  sortKeys: boolean;
  indent?: number;
};

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectEntries(value: { [key: string]: JsonValue }, sortKeys: boolean) {
  const entries = Object.entries(value);
  return sortKeys
    ? entries.sort(([first], [second]) => first.localeCompare(second))
    : entries;
}

function compactValue(value: JsonValue, sortKeys: boolean): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => compactValue(item, sortKeys)).join(", ")}]`;
  }

  if (isObject(value)) {
    return `{${objectEntries(value, sortKeys)
      .map(([key, item]) => `${JSON.stringify(key)}: ${compactValue(item, sortKeys)}`)
      .join(", ")}}`;
  }

  return JSON.stringify(value);
}

function formatValue(
  value: JsonValue,
  depth: number,
  options: Required<FormatOptions>,
): string {
  if (Array.isArray(value)) {
    if (options.arrayStyle === "inline") {
      return compactValue(value, options.sortKeys);
    }

    if (value.length === 0) return "[]";

    const padding = " ".repeat(options.indent * depth);
    const childPadding = " ".repeat(options.indent * (depth + 1));
    return `[\n${value
      .map((item) => `${childPadding}${formatValue(item, depth + 1, options)}`)
      .join(",\n")}\n${padding}]`;
  }

  if (isObject(value)) {
    const entries = objectEntries(value, options.sortKeys);
    if (entries.length === 0) return "{}";

    const padding = " ".repeat(options.indent * depth);
    const childPadding = " ".repeat(options.indent * (depth + 1));
    return `{\n${entries
      .map(
        ([key, item]) =>
          `${childPadding}${JSON.stringify(key)}: ${formatValue(item, depth + 1, options)}`,
      )
      .join(",\n")}\n${padding}}`;
  }

  return JSON.stringify(value);
}

export function formatJson(input: string, options: FormatOptions): string {
  const parsed = JSON.parse(input) as JsonValue;
  return formatValue(parsed, 0, {
    arrayStyle: options.arrayStyle,
    sortKeys: options.sortKeys,
    indent: options.indent ?? 2,
  });
}
