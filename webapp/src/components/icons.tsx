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
  | "hash"
  | "home"
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

  if (name === "home") {
    return <svg {...common}><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6" /></svg>;
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
