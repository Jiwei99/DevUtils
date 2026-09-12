const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function parseBigIntInBase(input: string, base: number): bigint {
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new Error("Base must be between 2 and 36.");
  }

  let value = input.trim().replaceAll("_", "").toLocaleLowerCase();
  if (!value) throw new Error("Enter a number to convert.");

  let sign = BigInt(1);
  if (value.startsWith("-") || value.startsWith("+")) {
    if (value[0] === "-") sign = BigInt(-1);
    value = value.slice(1);
  }

  const prefixes: Record<number, string> = { 2: "0b", 8: "0o", 16: "0x" };
  if (prefixes[base] && value.startsWith(prefixes[base])) {
    value = value.slice(2);
  }

  if (!value) throw new Error("Enter digits after the sign or base prefix.");

  let result = BigInt(0);
  for (const character of value) {
    const digit = DIGITS.indexOf(character);
    if (digit < 0 || digit >= base) {
      throw new Error(`“${character}” is not a valid base ${base} digit.`);
    }
    result = result * BigInt(base) + BigInt(digit);
  }

  return result * sign;
}

export function convertNumberBase(input: string, fromBase: number, toBase: number): string {
  return parseBigIntInBase(input, fromBase).toString(toBase).toLocaleUpperCase();
}
