import type { SVGProps } from "react";

type IconName =
  | "braces"
  | "calendar"
  | "clipboard"
  | "clock"
  | "code"
  | "diff"
  | "file"
  | "format"
  | "github"
  | "hash"
  | "home"
  | "keyboard"
  | "lock"
  | "search"
  | "text"
  | "trash"
  | "unix";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

export function Icon({ name, ...props }: IconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    ...props,
  };

  if (name === "braces") {
    return <svg {...common}><path d="M8 4H6a2 2 0 0 0-2 2v3a3 3 0 0 1-3 3 3 3 0 0 1 3 3v3a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v3a3 3 0 0 0 3 3 3 3 0 0 0-3 3v3a2 2 0 0 1-2 2h-2" /></svg>;
  }

  if (name === "code") {
    return <svg {...common}><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" /></svg>;
  }

  if (name === "diff") {
    return <svg {...common}><path d="M7 3v14a4 4 0 0 0 4 4h2M17 3v4M15 5h4M14 12h6M17 9v6" /></svg>;
  }

  if (name === "calendar") {
    return <svg {...common}><rect width="18" height="17" x="3" y="4" rx="2" /><path d="M8 2v4M16 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" /></svg>;
  }

  if (name === "clock") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  }

  if (name === "hash") {
    return <svg {...common}><path d="M10 3 8 21M16 3l-2 18M4 9h17M3 15h17" /></svg>;
  }

  if (name === "github") {
    return <svg {...common} fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.82a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.56 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>;
  }

  if (name === "home") {
    return <svg {...common}><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6" /></svg>;
  }

  if (name === "keyboard") {
    return <svg {...common}><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M7 16h10" /></svg>;
  }

  if (name === "text") {
    return <svg {...common}><path d="M4 6h16M8 6v14M16 6v14M6 20h4M14 20h4" /></svg>;
  }

  if (name === "unix") {
    return <svg {...common}><rect width="18" height="16" x="3" y="4" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></svg>;
  }

  if (name === "search") {
    return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></svg>;
  }

  if (name === "file") {
    return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>;
  }

  if (name === "clipboard") {
    return <svg {...common}><rect width="13" height="15" x="7" y="6" rx="2" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M10 13h6M10 17h4" /></svg>;
  }

  if (name === "format") {
    return <svg {...common}><path d="M4 6h16M4 12h10M4 18h14M18 10v4M16 12h4" /></svg>;
  }

  if (name === "trash") {
    return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 14h10l1-14" /></svg>;
  }

  return <svg {...common}><rect width="14" height="11" x="5" y="11" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
}
