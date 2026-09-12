"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const utilities = [
  { label: "Home", icon: "home", href: "/" },
  { label: "JSON Formatter", icon: "braces", href: "/json" },
  { label: "Text & JSON Diff", icon: "diff", href: "/diff" },
  { label: "Regex Tester", icon: "search", href: "/regex" },
  { label: "Cron Explorer", icon: "calendar", href: "/cron" },
  { label: "Encoder / Decoder", icon: "code", href: "/encoder" },
  { label: "Number Base", icon: "hash", href: "/number-base" },
  { label: "Time Units", icon: "clock", href: "/time" },
  { label: "Unix Time", icon: "unix", href: "/unix-time" },
  { label: "String Case", icon: "text", href: "/string-case" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">&lt;/&gt;</span>
          <span>DevUtils</span>
        </Link>

        <nav className="nav-group" aria-label="Developer utilities">
          <span className="nav-label">Utilities</span>
          <ul className="nav-list">
            {utilities.map((utility) => {
              const active = pathname === utility.href;
              return (
                <li key={utility.href}>
                  <Link
                    className={`nav-item${active ? " active" : ""}`}
                    href={utility.href}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon name={utility.icon} />
                    {utility.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-foot">
          © 2026 DevUtils
        </div>
      </aside>

      <header className="mobile-navigation">
        <Link className="brand" href="/">
          <span className="brand-mark">&lt;/&gt;</span>
          <span>DevUtils</span>
        </Link>
        <nav className="mobile-links" aria-label="Developer utilities">
          {utilities.map((utility) => {
            const active = pathname === utility.href;
            return (
              <Link
                key={utility.href}
                className={`mobile-link${active ? " active" : ""}`}
                href={utility.href}
              >
                <Icon name={utility.icon} />
                {utility.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
