import Link from "next/link";
import { Icon } from "./icons";

const tools = [
  {
    title: "JSON Formatter",
    description: "Format, validate, and recursively sort JSON data.",
    href: "/json",
    icon: "braces",
    group: "Data",
  },
  {
    title: "Text & JSON Diff",
    description: "Compare text or normalized JSON with precise change highlighting.",
    href: "/diff",
    icon: "diff",
    group: "Compare",
  },
  {
    title: "Regex Tester",
    description: "Test JavaScript patterns and understand each expression token.",
    href: "/regex",
    icon: "search",
    group: "Text",
  },
  {
    title: "Cron Explorer",
    description: "Validate cron expressions and preview upcoming run times.",
    href: "/cron",
    icon: "calendar",
    group: "Schedule",
  },
  {
    title: "JSON Encoder / Decoder",
    description: "Convert JSON strings and form URL-encoded data in either direction.",
    href: "/encoder",
    icon: "code",
    group: "Encoding",
  },
  {
    title: "Number Base Converter",
    description: "Convert binary, octal, decimal, and hexadecimal values.",
    href: "/number-base",
    icon: "hash",
    group: "Numbers",
  },
  {
    title: "Time Unit Converter",
    description: "Translate durations from nanoseconds through weeks.",
    href: "/time",
    icon: "clock",
    group: "Time",
  },
  {
    title: "Unix Time Converter",
    description: "Convert Unix timestamps to readable dates and back again.",
    href: "/unix-time",
    icon: "unix",
    group: "Time",
  },
  {
    title: "String Case Converter",
    description: "Transform text into nine common code and prose casing styles.",
    href: "/string-case",
    icon: "text",
    group: "Text",
  },
  {
    title: "Keyboard Shortcuts",
    description: "Search common Bash, Chrome for Mac, and macOS shortcuts.",
    href: "/shortcuts",
    icon: "keyboard",
    group: "Reference",
  },
] as const;

export function HomePage() {
  return (
    <section className="home-page">
      <header className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Your local developer toolkit</p>
          <h1>Small tools.<br /><span>Zero round trips.</span></h1>
          <p>
            Format, compare, convert, and inspect everyday developer data without
            sending a single byte away from your browser.
          </p>
          <div className="hero-actions">
            <Link className="format-button" href="/json">Open JSON Formatter <span>→</span></Link>
            <Link className="secondary-button" href="/diff">Compare two files</Link>
          </div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          <div className="preview-window">
            <div className="preview-bar"><i /><i /><i /><span>devutils.local</span></div>
            <div className="preview-body">
              <span className="preview-line short" />
              <span className="preview-line" />
              <span className="preview-line medium" />
              <span className="preview-line changed" />
              <span className="preview-line medium" />
              <span className="preview-line added" />
              <span className="preview-line short" />
            </div>
          </div>
          <div className="local-badge"><Icon name="lock" /> Processed locally</div>
        </div>
      </header>

      <div className="home-principles">
        <div><strong>Private by design</strong><span>Your data never leaves this tab.</span></div>
        <div><strong>Instant results</strong><span>No uploads, queues, or waiting.</span></div>
        <div><strong>Built for developers</strong><span>Focused tools with sensible defaults.</span></div>
      </div>

      <section className="tool-directory" aria-labelledby="tool-directory-title">
        <div className="directory-heading">
          <div>
            <p className="eyebrow">All utilities</p>
            <h2 id="tool-directory-title">Pick a tool and get moving</h2>
          </div>
          <span>{tools.length} tools available</span>
        </div>

        <div className="home-tool-grid">
          {tools.map((tool) => (
            <Link className="home-tool-card" href={tool.href} key={tool.href}>
              <div className="tool-card-top">
                <span className="tool-icon"><Icon name={tool.icon} /></span>
                <span className="tool-group">{tool.group}</span>
              </div>
              <div>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
              </div>
              <span className="tool-link">Open utility <b>→</b></span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
