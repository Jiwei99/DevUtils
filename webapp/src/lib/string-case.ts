export const CASE_STYLES = [
  { id: "camel", label: "camelCase" },
  { id: "pascal", label: "PascalCase" },
  { id: "snake", label: "snake_case" },
  { id: "kebab", label: "kebab-case" },
  { id: "constant", label: "CONSTANT_CASE" },
  { id: "title", label: "Title Case" },
  { id: "sentence", label: "Sentence case" },
  { id: "dot", label: "dot.case" },
  { id: "path", label: "path/case" },
] as const;

export type CaseStyle = (typeof CASE_STYLES)[number]["id"];

function splitWords(input: string): string[] {
  return (
    input
      .trim()
      .replace(/([a-z\d])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).map((word) => word.toLocaleLowerCase());
}

function capitalize(word: string): string {
  return word ? `${word[0].toLocaleUpperCase()}${word.slice(1)}` : "";
}

export function convertStringCase(input: string): Record<CaseStyle, string> {
  const words = splitWords(input);
  const sentence = words.join(" ");

  return {
    camel: words.map((word, index) => (index === 0 ? word : capitalize(word))).join(""),
    pascal: words.map(capitalize).join(""),
    snake: words.join("_"),
    kebab: words.join("-"),
    constant: words.join("_").toLocaleUpperCase(),
    title: words.map(capitalize).join(" "),
    sentence: capitalize(sentence),
    dot: words.join("."),
    path: words.join("/"),
  };
}
