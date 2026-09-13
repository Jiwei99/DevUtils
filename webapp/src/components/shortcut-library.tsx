"use client";

import { useMemo, useState } from "react";
import {
  keyboardShortcuts,
  shortcutPlatforms,
  shortcutSources,
  type KeyboardShortcut,
  type ShortcutPlatform,
} from "@/lib/shortcuts";
import { Icon } from "./icons";
import { ToolHeader } from "./tool-header";

type PlatformFilter = "all" | ShortcutPlatform;

const keySearchAliases: Record<string, string> = {
  "⌘": "command cmd",
  "⌥": "option alt",
  "⌃": "control ctrl",
  "↑": "up arrow",
  "↓": "down arrow",
  "←": "left arrow",
  "→": "right arrow",
  Ctrl: "control ctrl",
  Esc: "escape esc",
};

const accessibleKeyNames: Record<string, string> = {
  "⌘": "Command",
  "⌥": "Option",
  "⌃": "Control",
  "↑": "Up Arrow",
  "↓": "Down Arrow",
  "←": "Left Arrow",
  "→": "Right Arrow",
};

const exactKeyTerms = new Set([
  "alt",
  "cmd",
  "command",
  "control",
  "ctrl",
  "delete",
  "down",
  "esc",
  "escape",
  "fn",
  "left",
  "option",
  "right",
  "shift",
  "space",
  "tab",
  "up",
]);

function tokenize(value: string): string[] {
  return value
    .toLocaleLowerCase()
    .replaceAll("⌘", " command ")
    .replaceAll("⌥", " option ")
    .replaceAll("⌃", " control ")
    .replaceAll("↑", " up ")
    .replaceAll("↓", " down ")
    .replaceAll("←", " left ")
    .replaceAll("→", " right ")
    .match(/[a-z0-9_]+/g) ?? [];
}

function createSearchTokens(shortcut: KeyboardShortcut): string[] {
  const keyText = shortcut.keys.flat().flatMap((key) => [key, keySearchAliases[key] ?? ""]);

  return tokenize([
    shortcut.platform,
    shortcut.group,
    shortcut.action,
    shortcut.description,
    ...(shortcut.searchTerms ?? []),
    ...keyText,
  ]
    .filter(Boolean)
    .join(" "));
}

function normalizeKeyTerm(term: string): string {
  if (term === "ctrl" || term === "control") return "control";
  if (term === "cmd" || term === "command") return "command";
  if (term === "alt" || term === "option") return "option";
  if (term === "esc" || term === "escape") return "escape";
  return term;
}

function matchesSearch(shortcut: KeyboardShortcut, query: string): boolean {
  const terms = tokenize(query);
  if (terms.length === 0) return true;

  const isKeyCombination = terms.every((term) =>
    term.length === 1 || exactKeyTerms.has(term) || /^\d+$/.test(term),
  );

  if (isKeyCombination) {
    const normalizedTerms = terms.map(normalizeKeyTerm);

    return shortcut.keys.some((binding) => {
      const bindingTerms = tokenize(binding.join(" ")).map(normalizeKeyTerm);
      return normalizedTerms.every((term) => bindingTerms.includes(term));
    });
  }

  const searchTokens = createSearchTokens(shortcut);

  return terms.every((term) => {
    const requiresExactMatch = term.length === 1 || exactKeyTerms.has(term);
    return searchTokens.some((token) => requiresExactMatch ? token === term : token.includes(term));
  });
}

function ShortcutKeys({ bindings }: { bindings: string[][] }) {
  return (
    <div
      className="shortcut-bindings"
      aria-label={bindings
        .map((binding) => binding.map((key) => accessibleKeyNames[key] ?? key).join(" plus "))
        .join(" or ")}
    >
      {bindings.map((binding, bindingIndex) => (
        <span className="shortcut-binding" key={binding.join("-")}>
          {bindingIndex > 0 && <span className="shortcut-or">or</span>}
          <span className="shortcut-key-group" aria-hidden="true">
            {binding.map((key) => <kbd key={key}>{key}</kbd>)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function ShortcutLibrary() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [group, setGroup] = useState("all");

  const platformCounts = useMemo(() => Object.fromEntries(
    shortcutPlatforms.map((item) => [
      item.id,
      keyboardShortcuts.filter((shortcut) => shortcut.platform === item.id).length,
    ]),
  ) as Record<ShortcutPlatform, number>, []);

  const availableGroups = useMemo(() => Array.from(new Set(
    keyboardShortcuts
      .filter((shortcut) => platform === "all" || shortcut.platform === platform)
      .map((shortcut) => shortcut.group),
  )).sort((left, right) => left.localeCompare(right)), [platform]);

  const filteredShortcuts = useMemo(() => {
    return keyboardShortcuts.filter((shortcut) => {
      if (platform !== "all" && shortcut.platform !== platform) return false;
      if (group !== "all" && shortcut.group !== group) return false;
      return matchesSearch(shortcut, query);
    });
  }, [group, platform, query]);

  function selectPlatform(nextPlatform: PlatformFilter) {
    setPlatform(nextPlatform);

    if (group !== "all") {
      const groupExists = keyboardShortcuts.some((shortcut) =>
        shortcut.group === group && (nextPlatform === "all" || shortcut.platform === nextPlatform),
      );

      if (!groupExists) setGroup("all");
    }
  }

  const visiblePlatforms = shortcutPlatforms.filter((item) =>
    filteredShortcuts.some((shortcut) => shortcut.platform === item.id),
  );

  return (
    <section>
      <ToolHeader
        category="Reference utilities"
        title="Keyboard Shortcuts"
        description="Search a practical collection of Bash, Google Chrome, and macOS keyboard shortcuts."
      />

      <div className="shortcut-library">
        <div className="shortcut-toolbar">
          <label className="shortcut-search" htmlFor="shortcut-search-input">
            <Icon name="search" />
            <input
              id="shortcut-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actions or keys, e.g. reopen tab or cmd shift t"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear shortcut search">
                Clear
              </button>
            )}
          </label>

          <div className="shortcut-filter-row">
            <div className="shortcut-filters" role="group" aria-label="Filter shortcuts by platform">
              <button
                type="button"
                className={platform === "all" ? "active" : ""}
                onClick={() => selectPlatform("all")}
                aria-pressed={platform === "all"}
              >
                All <span>{keyboardShortcuts.length}</span>
              </button>
              {shortcutPlatforms.map((item) => (
                <button
                  type="button"
                  className={platform === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => selectPlatform(item.id)}
                  aria-pressed={platform === item.id}
                >
                  {item.label} <span>{platformCounts[item.id]}</span>
                </button>
              ))}
            </div>

            <label className="shortcut-tag-filter">
              <span>Tag</span>
              <select value={group} onChange={(event) => setGroup(event.target.value)}>
                <option value="all">All tags</option>
                {availableGroups.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="shortcut-result-summary" aria-live="polite">
          <span>
            Showing <strong>{filteredShortcuts.length}</strong> of {keyboardShortcuts.length} shortcuts
          </span>
          {platform === "bash" && <span className="shortcut-context-note">Uses Readline’s default Emacs editing mode</span>}
          {platform === "chrome" && <span className="shortcut-context-note">Key combinations shown for macOS</span>}
        </div>

        {filteredShortcuts.length > 0 ? (
          <div className="shortcut-platforms">
            {visiblePlatforms.map((platformItem) => {
              const shortcuts = filteredShortcuts.filter((shortcut) => shortcut.platform === platformItem.id);

              return (
                <section className={`shortcut-platform-card ${platformItem.id}`} key={platformItem.id}>
                  <header className="shortcut-platform-heading">
                    <div>
                      <span className="shortcut-platform-icon" aria-hidden="true">
                        {platformItem.id === "bash" ? "$" : platformItem.id === "chrome" ? "●" : "⌘"}
                      </span>
                      <div>
                        <h2>{platformItem.label}</h2>
                        <p>{platformItem.description}</p>
                      </div>
                    </div>
                    <span>{shortcuts.length} shortcuts</span>
                  </header>

                  <div className="shortcut-list">
                    {shortcuts.map((shortcut) => (
                      <article className="shortcut-row" key={shortcut.id}>
                        <div className="shortcut-action">
                          <button
                            type="button"
                            className={group === shortcut.group ? "active" : ""}
                            onClick={() => setGroup(shortcut.group)}
                            aria-label={`Filter by ${shortcut.group}`}
                          >
                            {shortcut.group}
                          </button>
                          <div>
                            <h3>{shortcut.action}</h3>
                            {shortcut.description && <p>{shortcut.description}</p>}
                          </div>
                        </div>
                        <ShortcutKeys bindings={shortcut.keys} />
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="shortcut-empty">
            <span><Icon name="search" /></span>
            <h2>No shortcuts found</h2>
            <p>Try a broader action, key combination, or another platform.</p>
            <button type="button" className="secondary-button" onClick={() => { setQuery(""); setPlatform("all"); setGroup("all"); }}>
              Clear search and filters
            </button>
          </div>
        )}

        <footer className="shortcut-sources">
          <span>Curated from official references:</span>
          {shortcutSources.map((source) => (
            <a href={source.href} target="_blank" rel="noreferrer" key={source.href}>{source.label} ↗</a>
          ))}
        </footer>
      </div>
    </section>
  );
}
