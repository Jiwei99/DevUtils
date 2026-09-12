"use client";

import { useState } from "react";
import { Icon } from "./icons";

type CopyButtonProps = {
  value: string;
  compact?: boolean;
};

export function CopyButton({ value, compact = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className={`copy-button${copied ? " success" : ""}${compact ? " compact" : ""}`}
      type="button"
      onClick={copy}
      disabled={!value}
      aria-label="Copy result"
    >
      <Icon name="clipboard" /> {copied ? "Copied" : "Copy"}
    </button>
  );
}
