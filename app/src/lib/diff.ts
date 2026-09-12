import { formatJson } from "./json-format";

export type DiffLine = {
  type: "equal" | "added" | "removed";
  text: string;
  oldLine: number | null;
  newLine: number | null;
  segments?: DiffSegment[];
};

export type DiffSegment = {
  type: DiffLine["type"];
  text: string;
};

export type DiffResult = {
  lines: DiffLine[];
  additions: number;
  removals: number;
  unchanged: number;
};

type DiffOperation = {
  type: DiffLine["type"];
  text: string;
};

function splitLines(value: string): string[] {
  return value === "" ? [] : value.replace(/\r\n?/g, "\n").split("\n");
}

function fallbackDiff(before: string[], after: string[]): DiffOperation[] {
  let prefixLength = 0;
  while (
    prefixLength < before.length &&
    prefixLength < after.length &&
    before[prefixLength] === after[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < before.length - prefixLength &&
    suffixLength < after.length - prefixLength &&
    before[before.length - 1 - suffixLength] === after[after.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return [
    ...before.slice(0, prefixLength).map((text) => ({ type: "equal" as const, text })),
    ...before.slice(prefixLength, before.length - suffixLength).map((text) => ({ type: "removed" as const, text })),
    ...after.slice(prefixLength, after.length - suffixLength).map((text) => ({ type: "added" as const, text })),
    ...before.slice(before.length - suffixLength).map((text) => ({ type: "equal" as const, text })),
  ];
}

function buildOperations(before: string[], after: string[]): DiffOperation[] {
  if (before.length + after.length > 4_000) return fallbackDiff(before, after);

  const maximum = before.length + after.length;
  const trace: Array<Map<number, number>> = [];
  const furthest = new Map<number, number>([[1, 0]]);

  for (let distance = 0; distance <= maximum; distance += 1) {
    trace.push(new Map(furthest));

    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const moveDown = diagonal === -distance || (
        diagonal !== distance &&
        (furthest.get(diagonal - 1) ?? Number.NEGATIVE_INFINITY) <
          (furthest.get(diagonal + 1) ?? Number.NEGATIVE_INFINITY)
      );
      let beforeIndex = moveDown
        ? (furthest.get(diagonal + 1) ?? 0)
        : (furthest.get(diagonal - 1) ?? 0) + 1;
      let afterIndex = beforeIndex - diagonal;

      while (
        beforeIndex < before.length &&
        afterIndex < after.length &&
        before[beforeIndex] === after[afterIndex]
      ) {
        beforeIndex += 1;
        afterIndex += 1;
      }

      furthest.set(diagonal, beforeIndex);
      if (beforeIndex >= before.length && afterIndex >= after.length) {
        return backtrack(trace, before, after, distance);
      }
    }
  }

  return fallbackDiff(before, after);
}

function backtrack(
  trace: Array<Map<number, number>>,
  before: string[],
  after: string[],
  finalDistance: number,
): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let beforeIndex = before.length;
  let afterIndex = after.length;

  for (let distance = finalDistance; distance >= 0; distance -= 1) {
    const furthest = trace[distance];
    const diagonal = beforeIndex - afterIndex;
    const moveDown = diagonal === -distance || (
      diagonal !== distance &&
      (furthest.get(diagonal - 1) ?? Number.NEGATIVE_INFINITY) <
        (furthest.get(diagonal + 1) ?? Number.NEGATIVE_INFINITY)
    );
    const previousDiagonal = moveDown ? diagonal + 1 : diagonal - 1;
    const previousBeforeIndex = furthest.get(previousDiagonal) ?? 0;
    const previousAfterIndex = previousBeforeIndex - previousDiagonal;

    while (beforeIndex > previousBeforeIndex && afterIndex > previousAfterIndex) {
      operations.push({ type: "equal", text: before[beforeIndex - 1] });
      beforeIndex -= 1;
      afterIndex -= 1;
    }

    if (distance === 0) break;
    if (beforeIndex === previousBeforeIndex) {
      operations.push({ type: "added", text: after[afterIndex - 1] });
      afterIndex -= 1;
    } else {
      operations.push({ type: "removed", text: before[beforeIndex - 1] });
      beforeIndex -= 1;
    }
  }

  return operations.reverse();
}

function mergeSegments(operations: DiffOperation[], lineType: "added" | "removed"): DiffSegment[] {
  const segments: DiffSegment[] = [];

  for (const operation of operations) {
    if (operation.type !== "equal" && operation.type !== lineType) continue;
    const previous = segments.at(-1);
    if (previous?.type === operation.type) {
      previous.text += operation.text;
    } else {
      segments.push({ type: operation.type, text: operation.text });
    }
  }

  return segments;
}

function addCharacterHighlights(lines: DiffLine[]): void {
  let index = 0;

  while (index < lines.length) {
    if (lines[index].type === "equal") {
      index += 1;
      continue;
    }

    let blockEnd = index;
    while (blockEnd < lines.length && lines[blockEnd].type !== "equal") blockEnd += 1;

    const block = lines.slice(index, blockEnd);
    const removed = block.filter((line) => line.type === "removed");
    const added = block.filter((line) => line.type === "added");
    const pairedCount = Math.min(removed.length, added.length);

    for (let pairIndex = 0; pairIndex < pairedCount; pairIndex += 1) {
      const characterOperations = buildOperations(
        Array.from(removed[pairIndex].text),
        Array.from(added[pairIndex].text),
      );
      removed[pairIndex].segments = mergeSegments(characterOperations, "removed");
      added[pairIndex].segments = mergeSegments(characterOperations, "added");
    }

    for (const line of removed.slice(pairedCount)) {
      line.segments = [{ type: "removed", text: line.text }];
    }
    for (const line of added.slice(pairedCount)) {
      line.segments = [{ type: "added", text: line.text }];
    }

    index = blockEnd;
  }
}

export function createLineDiff(beforeText: string, afterText: string): DiffResult {
  const operations = buildOperations(splitLines(beforeText), splitLines(afterText));
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let removals = 0;
  let unchanged = 0;

  const lines = operations.map((operation): DiffLine => {
    if (operation.type === "added") {
      additions += 1;
      return { ...operation, oldLine: null, newLine: newLine++ };
    }
    if (operation.type === "removed") {
      removals += 1;
      return { ...operation, oldLine: oldLine++, newLine: null };
    }
    unchanged += 1;
    return { ...operation, oldLine: oldLine++, newLine: newLine++ };
  });

  addCharacterHighlights(lines);
  return { lines, additions, removals, unchanged };
}

export function prepareDiffInput(before: string, after: string): {
  before: string;
  after: string;
  json: boolean;
} {
  try {
    JSON.parse(before);
    JSON.parse(after);
    return {
      before: formatJson(before, { arrayStyle: "expanded", sortKeys: true }),
      after: formatJson(after, { arrayStyle: "expanded", sortKeys: true }),
      json: true,
    };
  } catch {
    return { before, after, json: false };
  }
}
