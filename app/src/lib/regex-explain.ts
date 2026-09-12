export type RegexExplanation = {
  token: string;
  description: string;
};

const ESCAPES: Record<string, string> = {
  "\\d": "a digit (0–9)",
  "\\D": "a character that is not a digit",
  "\\w": "a word character (letter, digit, or underscore)",
  "\\W": "a character that is not a word character",
  "\\s": "a whitespace character",
  "\\S": "a character that is not whitespace",
  "\\b": "a word boundary",
  "\\B": "a position that is not a word boundary",
  "\\n": "a newline",
  "\\r": "a carriage return",
  "\\t": "a tab",
};

function pushLiteral(explanations: RegexExplanation[], literal: string) {
  if (!literal) return;
  explanations.push({ token: literal, description: `the literal text “${literal}”` });
}

export function explainRegex(pattern: string): RegexExplanation[] {
  const explanations: RegexExplanation[] = [];
  let literal = "";

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];

    if (character === "\\") {
      pushLiteral(explanations, literal);
      literal = "";
      const token = pattern.slice(index, index + 2);
      explanations.push({
        token,
        description: ESCAPES[token] ?? `the escaped character “${pattern[index + 1] ?? ""}”`,
      });
      index += 1;
      continue;
    }

    if (character === "[") {
      pushLiteral(explanations, literal);
      literal = "";
      let end = index + 1;
      while (end < pattern.length && (pattern[end] !== "]" || pattern[end - 1] === "\\")) end += 1;
      const token = pattern.slice(index, Math.min(end + 1, pattern.length));
      explanations.push({
        token,
        description: token.startsWith("[^")
          ? "any character not in this set"
          : "any one character in this set",
      });
      index = end;
      continue;
    }

    if (character === "{" && /^\{\d+(,\d*)?\}/.test(pattern.slice(index))) {
      pushLiteral(explanations, literal);
      literal = "";
      const token = pattern.slice(index).match(/^\{\d+(,\d*)?\}/)?.[0] ?? character;
      const [minimum, maximum] = token.slice(1, -1).split(",");
      explanations.push({
        token,
        description: maximum === undefined
          ? `repeat exactly ${minimum} times`
          : maximum
            ? `repeat between ${minimum} and ${maximum} times`
            : `repeat at least ${minimum} times`,
      });
      index += token.length - 1;
      continue;
    }

    const groupTokens: Record<string, string> = {
      "(?:": "start a non-capturing group",
      "(?=": "start a positive lookahead",
      "(?!": "start a negative lookahead",
      "(?<=": "start a positive lookbehind",
      "(?<!": "start a negative lookbehind",
      "(?<": "start a named capturing group",
    };
    const groupToken = Object.keys(groupTokens).find((token) => pattern.startsWith(token, index));
    if (groupToken) {
      pushLiteral(explanations, literal);
      literal = "";
      explanations.push({ token: groupToken, description: groupTokens[groupToken] });
      index += groupToken.length - 1;
      continue;
    }

    const special: Record<string, string> = {
      "^": "the start of the string or line",
      "$": "the end of the string or line",
      ".": "any character except a newline",
      "*": "repeat zero or more times",
      "+": "repeat one or more times",
      "?": "make the previous item optional (or non-greedy)",
      "|": "match the expression on either side",
      "(": "start a capturing group",
      ")": "end a group",
    };
    if (special[character]) {
      pushLiteral(explanations, literal);
      literal = "";
      explanations.push({ token: character, description: special[character] });
    } else {
      literal += character;
    }
  }

  pushLiteral(explanations, literal);
  return explanations;
}
