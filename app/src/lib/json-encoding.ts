type EncodingFormat = "json-string" | "form-urlencoded";
type EncodingDirection = "encode" | "decode";
type PathSegment = string | number | "[]";

export type JsonEncodingResult =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "success"; output: string };

export function convertJsonEncoding(
  input: string,
  format: EncodingFormat,
  direction: EncodingDirection,
  sortKeys = false,
): JsonEncodingResult {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "empty" };

  try {
    if (format === "json-string") {
      if (direction === "encode") {
        const parsed: unknown = prepareJsonValue(JSON.parse(trimmed) as unknown, sortKeys);
        return {
          kind: "success",
          output: JSON.stringify(JSON.stringify(parsed)),
        };
      }

      const encoded: unknown = JSON.parse(trimmed);
      if (typeof encoded !== "string") {
        throw new Error("The input must be a quoted, escaped JSON string.");
      }
      const decoded: unknown = prepareJsonValue(JSON.parse(encoded) as unknown, sortKeys);
      return { kind: "success", output: JSON.stringify(decoded, null, 2) };
    }

    if (direction === "encode") {
      const parsed = prepareJsonValue(JSON.parse(trimmed) as unknown, sortKeys);
      return {
        kind: "success",
        output: encodeJsonToFormUrlencoded(parsed),
      };
    }

    const decoded = prepareJsonValue(decodeFormUrlencoded(trimmed), sortKeys);
    return {
      kind: "success",
      output: JSON.stringify(decoded, null, 2),
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Unable to convert the input.",
    };
  }
}

function prepareJsonValue(value: unknown, sortKeys: boolean): unknown {
  if (!sortKeys) return value;
  if (Array.isArray(value)) return value.map((item) => prepareJsonValue(item, true));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, item]) => [key, prepareJsonValue(item, true)]),
    );
  }
  return value;
}

export function encodeJsonToFormUrlencoded(value: unknown): string {
  const entries: Array<[string, string]> = [];
  buildEntries(value, "", entries);
  return entries
    .map(([key, entryValue]) => `${encodeURIComponent(key)}=${encodeURIComponent(entryValue)}`)
    .join("&");
}

export function decodeFormUrlencoded(input: string): unknown {
  const normalized = input.trim().replace(/^\?/, "");
  if (!normalized) return createObject();

  const pairs = normalized.split("&").filter(Boolean);
  if (pairs.length === 0) return createObject();

  const firstKey = splitPair(pairs[0])[0];
  const firstSegments = parseKeySegments(decodeFormComponent(firstKey));
  const root: Record<string, unknown> | unknown[] =
    firstSegments[0] === "[]" || typeof firstSegments[0] === "number"
      ? []
      : createObject();

  for (const pair of pairs) {
    const [rawKey, rawValue] = splitPair(pair);
    const segments = parseKeySegments(decodeFormComponent(rawKey));
    const value = inferPrimitiveValue(decodeFormComponent(rawValue));
    assignPath(root, segments, value);
  }

  return root;
}

function splitPair(pair: string): [string, string] {
  const separator = pair.indexOf("=");
  return separator === -1
    ? [pair, ""]
    : [pair.slice(0, separator), pair.slice(separator + 1)];
}

function createObject(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

function buildEntries(value: unknown, prefix: string, entries: Array<[string, string]>) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      buildEntries(entry, prefix ? `${prefix}[${index}]` : String(index), entries);
    });
    return;
  }

  if (value !== null && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      buildEntries(entryValue, prefix ? `${prefix}[${key}]` : key, entries);
    });
    return;
  }

  entries.push([prefix || "value", stringifyPrimitive(value)]);
}

function parseKeySegments(key: string): PathSegment[] {
  const segments: PathSegment[] = [];
  key.replace(/(^[^[\]]+)|\[([^[\]]*)\]/g, (_, direct: string, bracket: string) => {
    const rawSegment = direct ?? bracket;
    if (rawSegment === "") segments.push("[]");
    else if (/^\d+$/.test(rawSegment)) segments.push(Number(rawSegment));
    else segments.push(rawSegment);
    return "";
  });
  return segments.length ? segments : ["value"];
}

function assignPath(
  target: Record<string, unknown> | unknown[],
  segments: PathSegment[],
  value: unknown,
) {
  const [segment, ...rest] = segments;
  const isLast = rest.length === 0;

  if (Array.isArray(target)) {
    const index = segment === "[]"
      ? target.length
      : typeof segment === "number"
        ? segment
        : Number.NaN;
    if (!Number.isInteger(index)) {
      throw new Error(`Invalid array key segment “${String(segment)}”.`);
    }
    if (isLast) {
      target[index] = mergeValues(target[index], value);
      return;
    }
    if (typeof target[index] !== "object" || target[index] === null) {
      target[index] = createContainer(rest[0]);
    }
    assignPath(target[index] as Record<string, unknown> | unknown[], rest, value);
    return;
  }

  const key = String(segment === "[]" ? Object.keys(target).length : segment);
  if (isLast) {
    target[key] = mergeValues(target[key], value);
    return;
  }
  if (typeof target[key] !== "object" || target[key] === null) {
    target[key] = createContainer(rest[0]);
  }
  assignPath(target[key] as Record<string, unknown> | unknown[], rest, value);
}

function createContainer(nextSegment: PathSegment): Record<string, unknown> | unknown[] {
  return nextSegment === "[]" || typeof nextSegment === "number" ? [] : createObject();
}

function mergeValues(existingValue: unknown, nextValue: unknown): unknown {
  if (existingValue === undefined) return nextValue;
  if (Array.isArray(existingValue)) {
    existingValue.push(nextValue);
    return existingValue;
  }
  return [existingValue, nextValue];
}

function inferPrimitiveValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }
  return value;
}

function stringifyPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value) ?? "";
}

function decodeFormComponent(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, " "));
}
