"use client";

import { useMemo, useState, type CSSProperties } from "react";
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

type PreviewTransition = {
  kind: string;
  before: string;
  after: string;
};

type BashTransition = PreviewTransition & {
  command: string;
  result?: string;
  caret?: { from: number; to: number };
};

function getBashTransition(shortcut: KeyboardShortcut): BashTransition {
  const command = "git commit -m release";
  const caretMoves: Record<string, { from: number; to: number; before: string; after: string }> = {
    "bash-line-start": { from: command.length, to: 0, before: "Caret at end of line", after: "Caret at start of line" },
    "bash-line-end": { from: 0, to: command.length, before: "Caret at start of line", after: "Caret at end of line" },
    "bash-char-back": { from: 12, to: 11, before: "Caret after one character", after: "Caret moved back once" },
    "bash-char-forward": { from: 11, to: 12, before: "Caret before one character", after: "Caret moved forward once" },
    "bash-word-back": { from: 19, to: 14, before: "Caret after “release”", after: "Caret at start of “release”" },
    "bash-word-forward": { from: 4, to: 11, before: "Caret after “git”", after: "Caret after “commit”" },
  };
  const caretMove = caretMoves[shortcut.id];

  if (caretMove) {
    return { kind: "caret", command, caret: { from: caretMove.from, to: caretMove.to }, before: caretMove.before, after: caretMove.after };
  }

  const transitions: Record<string, Omit<BashTransition, "kind"> & { kind?: string }> = {
    "bash-clear-screen": { command: "previous terminal output", result: "~", before: "Terminal contains previous output", after: "Screen cleared and prompt redrawn", kind: "clear" },
    "bash-delete-char": { command: "git statuXs", result: "git status", before: "Extra “X” under the caret", after: "Character deleted" },
    "bash-delete-before": { command: "draft npm run dev", result: "npm run dev", before: "Text before the caret", after: "Everything before caret removed" },
    "bash-delete-after": { command: "npm run dev --watch", result: "npm run dev", before: "Text after the caret", after: "Everything after caret removed" },
    "bash-delete-word-before": { command: "git checkout feature", result: "git checkout", before: "Previous word present", after: "Previous word deleted" },
    "bash-delete-word-after": { command: "git checkout feature", result: "git feature", before: "Next word present", after: "Next word deleted" },
    "bash-yank": { command: "git commit -m", result: "git commit -m release", before: "Deleted text is in the kill ring", after: "Text pasted at the caret" },
    "bash-undo": { command: "git statsu", result: "git status", before: "Last edit changed the command", after: "Previous command restored" },
    "bash-transpose": { command: "git statsu", result: "git status", before: "Adjacent characters are swapped", after: "Characters transposed" },
    "bash-history-previous": { command: "", result: "npm run build", before: "Empty prompt", after: "Previous command loaded" },
    "bash-history-next": { command: "npm run build", result: "git status", before: "Older history entry", after: "Newer history entry loaded" },
    "bash-history-search": { command: "", result: "(reverse-i-search) ‘git’: git status", before: "Normal prompt", after: "Matching history entry found", kind: "history" },
    "bash-complete": { command: "npm run bui", result: "npm run build", before: "Partially typed command", after: "Completion inserted" },
    "bash-cancel": { command: "npm run dev", result: "^C  ~", before: "Foreground command is running", after: "Command interrupted", kind: "process" },
    "bash-suspend": { command: "npm run dev", result: "[1]+ Stopped  npm run dev", before: "Process is in the foreground", after: "Process suspended", kind: "process" },
  };
  const transition = transitions[shortcut.id];

  return transition
    ? { ...transition, kind: transition.kind ?? "replace" }
    : { kind: "replace", command: shortcut.action, result: "Done", before: "Before shortcut", after: "After shortcut" };
}

function BashScene({ shortcut }: { shortcut: KeyboardShortcut }) {
  const transition = getBashTransition(shortcut);
  const caretStyle = transition.caret ? {
    "--caret-from": `${transition.caret.from}ch`,
    "--caret-to": `${transition.caret.to}ch`,
  } as CSSProperties : undefined;

  return (
    <div className={`simulation-window simulation-terminal bash-effect-${transition.kind}`} aria-hidden="true">
      <div className="simulation-window-bar"><i /><i /><i /><span>Terminal</span></div>
      <div className="simulation-terminal-body">
        <span className="terminal-context">Last login: today on ttys001</span>
        <div className="terminal-demo-line">
          <b>~</b>
          {transition.caret ? (
            <span className="terminal-command-with-caret">
              {transition.command}<i className="moving-terminal-caret" style={caretStyle} />
            </span>
          ) : (
            <span className="terminal-command-transition">
              <span className="terminal-before">{transition.command || "\u00a0"}</span>
              <span className="terminal-after">{transition.result}</span>
            </span>
          )}
        </div>
        <span className="terminal-effect-label">{transition.after}</span>
      </div>
    </div>
  );
}

function getChromeTransition(shortcut: KeyboardShortcut): PreviewTransition {
  const transitions: Record<string, PreviewTransition> = {
    "chrome-new-tab": { kind: "tab-add", before: "Two open tabs", after: "New tab opened" },
    "chrome-new-window": { kind: "window-add", before: "One Chrome window", after: "New window opened" },
    "chrome-incognito": { kind: "incognito", before: "Standard window", after: "Incognito window opened" },
    "chrome-reopen-tab": { kind: "tab-add", before: "Recently closed tab", after: "Tab restored" },
    "chrome-next-tab": { kind: "tab-switch", before: "DevUtils tab active", after: "Documentation tab active" },
    "chrome-previous-tab": { kind: "tab-switch-reverse", before: "Documentation tab active", after: "DevUtils tab active" },
    "chrome-specific-tab": { kind: "tab-last", before: "DevUtils tab active", after: "Selected tab active" },
    "chrome-last-tab": { kind: "tab-last", before: "First tab active", after: "Last tab active" },
    "chrome-close-tab": { kind: "tab-close", before: "Three open tabs", after: "Current tab closed" },
    "chrome-close-window": { kind: "window-close", before: "Window open", after: "Window closed" },
    "chrome-back": { kind: "navigate-back", before: "Shortcut details", after: "Shortcut library" },
    "chrome-forward": { kind: "navigate-forward", before: "Shortcut library", after: "Shortcut details" },
    "chrome-address": { kind: "address", before: "Page focused", after: "Address selected" },
    "chrome-reload": { kind: "reload", before: "Current page", after: "Page reloaded" },
    "chrome-hard-reload": { kind: "hard-reload", before: "Cached page", after: "Fresh content loaded" },
    "chrome-find": { kind: "find", before: "Page content", after: "Find bar opened" },
    "chrome-bookmark": { kind: "bookmark", before: "Page not bookmarked", after: "Bookmark saved" },
    "chrome-print": { kind: "modal", before: "Current page", after: "Print dialog opened" },
    "chrome-save": { kind: "download", before: "Current page", after: "Save started" },
    "chrome-zoom-in": { kind: "zoom-in", before: "100% zoom", after: "125% zoom" },
    "chrome-zoom-out": { kind: "zoom-out", before: "100% zoom", after: "80% zoom" },
    "chrome-zoom-reset": { kind: "zoom-reset", before: "125% zoom", after: "100% zoom" },
    "chrome-history": { kind: "page-change", before: "Current website", after: "History opened" },
    "chrome-downloads": { kind: "page-change", before: "Current website", after: "Downloads opened" },
    "chrome-bookmarks-bar": { kind: "bookmarks-bar", before: "Bookmarks hidden", after: "Bookmarks bar shown" },
    "chrome-devtools": { kind: "devtools", before: "Web page", after: "Developer Tools opened" },
    "chrome-console": { kind: "console", before: "Web page", after: "JavaScript console opened" },
    "chrome-source": { kind: "source", before: "Rendered page", after: "HTML source opened" },
    "chrome-clear-data": { kind: "clear-data", before: "Chrome settings", after: "Delete Browsing Data opened" },
  };

  return transitions[shortcut.id] ?? { kind: "page-change", before: "Current state", after: shortcut.action };
}

function ChromeScene({ shortcut }: { shortcut: KeyboardShortcut }) {
  const transition = getChromeTransition(shortcut);
  const showDialog = ["modal", "clear-data"].includes(transition.kind);
  const showDevtools = ["devtools", "console", "source"].includes(transition.kind);

  return (
    <div className={`simulation-window simulation-browser chrome-effect-${transition.kind}`} aria-hidden="true">
      <div className="browser-primary-window">
        <div className="browser-tabs">
          <span className="browser-traffic-lights"><i /><i /><i /></span>
          <span className="browser-tab tab-one">DevUtils</span>
          <span className="browser-tab tab-two">Documentation</span>
          <span className="browser-tab tab-three">New Tab</span>
          <b>+</b>
        </div>
        <div className="browser-address">
          <span className="browser-back">‹</span><span className="browser-forward">›</span>
          <span className="address-value">devutils.jiwei.dev/shortcuts</span><b>☆</b>
        </div>
        <div className="browser-bookmarks"><span>DevUtils</span><span>Docs</span><span>GitHub</span></div>
        <div className="browser-page"><i /><i /><i /><i /></div>
        {transition.kind === "page-change" && <div className="browser-destination">{transition.after}</div>}
        {transition.kind === "find" && <div className="browser-find">shortcut <span>1 / 4</span></div>}
        {showDevtools && <div className="browser-devtools"><b>{transition.kind === "console" ? "Console" : transition.kind === "source" ? "Page Source" : "Elements"}</b><code>&lt;main class=&quot;app&quot;&gt;</code></div>}
        {showDialog && <div className="browser-modal"><b>{transition.kind === "clear-data" ? "Delete browsing data" : "Print"}</b><span /><span /><span className="simulation-button">{transition.kind === "clear-data" ? "Delete data" : "Print"}</span></div>}
      </div>
      {["window-add", "incognito"].includes(transition.kind) && (
        <div className="browser-secondary-window">
          <div className="secondary-browser-tabs">
            <span className="secondary-traffic-lights"><i /><i /><i /></span>
            <b>{transition.kind === "incognito" ? "Incognito" : "New Tab"}</b>
            <span className="secondary-new-tab">+</span>
          </div>
          <div className="secondary-browser-toolbar">
            <span>‹</span><span>›</span>
            <span className="secondary-address-value">
              {transition.kind === "incognito" ? "Search Google or type a URL" : "chrome://newtab"}
            </span>
          </div>
          <div className="secondary-browser-page">
            <strong>{transition.kind === "incognito" ? "You’ve gone Incognito" : "Google"}</strong>
            <span />
          </div>
        </div>
      )}
      <span className="browser-effect-label">{transition.after}</span>
    </div>
  );
}

function getMacTransition(shortcut: KeyboardShortcut): PreviewTransition {
  const transitions: Record<string, PreviewTransition> = {
    "mac-cut": { kind: "cut", before: "Text is selected", after: "Selection removed and copied" },
    "mac-copy": { kind: "copy", before: "Text is selected", after: "Selection remains and is copied" },
    "mac-paste": { kind: "paste", before: "Insertion point is empty", after: "Clipboard text inserted" },
    "mac-undo": { kind: "undo", before: "Latest edit is visible", after: "Latest edit reversed" },
    "mac-redo": { kind: "redo", before: "An edit was undone", after: "Edit applied again" },
    "mac-select-all": { kind: "select-all", before: "No document text selected", after: "Entire document selected" },
    "mac-find": { kind: "find", before: "Document is open", after: "Find bar opens and matches text" },
    "mac-save": { kind: "save", before: "Document has unsaved changes", after: "Changes saved to disk" },
    "mac-print": { kind: "print", before: "Document is open", after: "System print sheet attached" },
    "mac-settings": { kind: "settings", before: "Current app window", after: "App settings window opened" },
    "mac-close": { kind: "close", before: "Front window is open", after: "Window closes; app stays open" },
    "mac-minimize": { kind: "minimize", before: "Window on desktop", after: "Window minimized to Dock" },
    "mac-hide": { kind: "hide", before: "Current app is visible", after: "App windows hidden; app stays running" },
    "mac-quit": { kind: "quit", before: "Current app is running", after: "App and its windows quit" },
    "mac-switch-app": { kind: "switch-app", before: "TextEdit is active", after: "Terminal becomes active" },
    "mac-switch-window": { kind: "window-switch", before: "First window active", after: "Next window active" },
    "mac-force-quit": { kind: "force-quit", before: "Unresponsive app", after: "Force Quit window opened" },
    "mac-spotlight": { kind: "spotlight", before: "Desktop", after: "Spotlight opened" },
    "mac-lock": { kind: "lock", before: "Desktop is unlocked", after: "macOS Lock Screen displayed" },
    "mac-full-screen": { kind: "fullscreen", before: "App is in a window", after: "Window enters full screen" },
    "mac-emoji": { kind: "character-viewer", before: "Text insertion point active", after: "Emoji and Symbols viewer opened" },
    "mac-screenshot-screen": { kind: "screenshot-screen", before: "Desktop is visible", after: "Entire screen captured to thumbnail" },
    "mac-screenshot-selection": { kind: "screenshot-selection", before: "Desktop is visible", after: "Selected region captured" },
    "mac-screenshot-tools": { kind: "screenshot-tools", before: "Desktop", after: "Capture controls opened" },
    "mac-quick-look": { kind: "quick-look", before: "README.md selected in Finder", after: "Quick Look preview opened" },
    "mac-new-folder": { kind: "new-folder", before: "Finder folder is open", after: "Untitled folder created for naming" },
    "mac-go-folder": { kind: "go-folder", before: "Finder is active", after: "Go to Folder path sheet opened" },
    "mac-trash": { kind: "trash", before: "README.md selected in Finder", after: "File moved into Dock Trash" },
  };

  return transitions[shortcut.id] ?? { kind: "save", before: "Current state", after: shortcut.action };
}

const macEditingKinds = ["cut", "copy", "paste", "undo", "redo", "select-all"];
const macFinderKinds = ["quick-look", "new-folder", "go-folder", "trash"];

function MacEditingScene({ kind }: { kind: string }) {
  return (
    <div className="mac-editor-copy">
      <div className="mac-edit-layer mac-edit-before">
        <p>
          {(["cut", "copy"].includes(kind)) && <>Ship the <mark>developer tools</mark> release today.</>}
          {kind === "paste" && <>Ship the <i className="mac-insertion-caret" /> release today.</>}
          {kind === "undo" && <>Ship the developer tools release <ins>today</ins>.</>}
          {kind === "redo" && <>Ship the developer tools release.</>}
          {kind === "select-all" && <>Ship the developer tools release today.</>}
        </p>
        <p>Review the shortcuts and publish the update.</p>
        <p>Everything runs locally in your browser.</p>
      </div>
      <div className={`mac-edit-layer mac-edit-after mac-edit-after-${kind}`}>
        <p>
          {kind === "cut" && <>Ship the release today.</>}
          {kind === "copy" && <>Ship the <mark>developer tools</mark> release today.</>}
          {kind === "paste" && <>Ship the <ins>developer tools</ins> release today.</>}
          {kind === "undo" && <>Ship the developer tools release.</>}
          {kind === "redo" && <>Ship the developer tools release <ins>today</ins>.</>}
          {kind === "select-all" && <>Ship the developer tools release today.</>}
        </p>
        <p>Review the shortcuts and publish the update.</p>
        <p>Everything runs locally in your browser.</p>
      </div>
      {["cut", "copy"].includes(kind) && (
        <div className="mac-clipboard-card"><b>Clipboard</b><span>developer tools</span></div>
      )}
    </div>
  );
}

function MacFinderScene({ kind }: { kind: string }) {
  return (
    <div className="mac-finder-body">
      <aside><b>Favorites</b><span>Recents</span><span>Desktop</span><span>Documents</span><span>Downloads</span></aside>
      <div className="mac-finder-files">
        <div className="mac-finder-file mac-readme-file"><i>MD</i><span>README.md</span></div>
        <div className="mac-finder-file"><i>TS</i><span>utils.ts</span></div>
        <div className="mac-finder-file"><i>JS</i><span>package.json</span></div>
        <div className="mac-finder-file mac-folder-file"><i>▰</i><span>webapp</span></div>
        {kind === "new-folder" && <div className="mac-finder-file mac-new-folder-file"><i>▰</i><span>untitled folder</span></div>}
      </div>
    </div>
  );
}

function MacScene({ shortcut }: { shortcut: KeyboardShortcut }) {
  const transition = getMacTransition(shortcut);
  const kind = transition.kind;
  const isEditing = macEditingKinds.includes(kind);
  const isFinder = macFinderKinds.includes(kind);
  const appName = isFinder ? "Finder" : "TextEdit";

  return (
    <div className={`simulation-mac mac-effect-${kind}`} aria-hidden="true">
      <div className="mac-wallpaper" />
      <div className="mac-menu-bar"><span className="mac-apple">●</span><b className="mac-menu-app">{appName}</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><time>9:41</time></div>
      {kind === "window-switch" && (
        <div className="simulation-window mac-window mac-window-behind">
          <div className="simulation-window-bar"><i /><i /><i /><span>Release notes</span></div>
          <div className="mac-background-document"><b>Release notes</b><span /><span /></div>
        </div>
      )}
      <div className="simulation-window mac-window">
        <div className="simulation-window-bar">
          <i className="mac-close-control" /><i className="mac-minimize-control" /><i /><span>{isFinder ? "Developer" : "DevUtils Notes"}</span>
          {kind === "save" && <b className="mac-save-indicator"><em>Edited</em><strong>✓ Saved</strong></b>}
        </div>
        {isFinder ? <MacFinderScene kind={kind} /> : (
          <div className="mac-document-body">
            <div className="mac-document-toolbar"><span>100%</span><span>Helvetica</span><span>14</span></div>
            {isEditing ? <MacEditingScene kind={kind} /> : <div className="mac-document-lines"><b>DevUtils release notes</b><span>Keyboard shortcuts make common actions faster.</span><span>The utilities run entirely in your browser.</span><span>Review the changes before publishing.</span></div>}
          </div>
        )}
        {kind === "find" && <div className="mac-find-bar"><span>developer</span><small>1 of 2</small><b>‹</b><b>›</b><b>Done</b></div>}
        {kind === "find" && <mark className="mac-find-match">developer</mark>}
        {kind === "print" && <div className="mac-sheet mac-print-sheet"><div><b>Print</b><label>Printer <span>Office Printer</span></label><label>Copies <span>1</span></label><label>Pages <span>All</span></label></div><i className="mac-print-page" /><footer><b>PDF⌄</b><span>Cancel</span><strong>Print</strong></footer></div>}
        {kind === "go-folder" && <div className="mac-sheet mac-go-folder-sheet"><b>Go to the folder:</b><span>⌕ /Users/jiwei/Developer</span><footer><span>Cancel</span><strong>Go</strong></footer></div>}
      </div>
      {kind === "settings" && <div className="simulation-window mac-settings-window"><div className="simulation-window-bar"><i /><i /><i /><span>Settings</span></div><div className="mac-settings-view"><aside><b>TextEdit</b><span className="active">General</span><span>Open &amp; Save</span><span>New Document</span></aside><main><b>General</b><label>Default format <span>Rich text</span></label><label>Window size <span>Automatic</span></label></main></div></div>}
      {kind === "spotlight" && <div className="mac-spotlight"><b>⌕</b><div><span>Spotlight Search</span><small>Search apps, documents, and more</small></div></div>}
      {kind === "switch-app" && <div className="mac-switcher"><div><b>✎</b><span>TextEdit</span></div><div><b>&gt;_</b><span>Terminal</span></div><div><b>◫</b><span>Finder</span></div></div>}
      {kind === "switch-app" && <div className="simulation-window mac-terminal-window"><div className="simulation-window-bar"><i /><i /><i /><span>Terminal</span></div><main><b>jiwei@mac ~ %</b><span>npm run dev</span><i>_</i></main></div>}
      {kind === "character-viewer" && <div className="mac-character-viewer"><header><b>Emoji &amp; Symbols</b><span>⌕ Search</span></header><div><span>😀</span><span>😂</span><span>🥰</span><span>🤔</span><span>🎉</span><span>🚀</span><span>✨</span><span>👍</span></div></div>}
      {kind === "screenshot-selection" && <div className="mac-capture-area"><b>428 × 132</b><i className="mac-crosshair">＋</i></div>}
      {kind === "screenshot-tools" && <div className="mac-capture-overlay"><div className="mac-capture-tools"><span>▣</span><span>▤</span><span>◫</span><span>◉</span><span>◎</span><b>Options</b><strong>Capture</strong></div></div>}
      {["screenshot-screen", "screenshot-selection"].includes(kind) && <><div className="mac-screen-flash" /><div className="mac-screenshot-thumbnail"><span>Screenshot</span></div></>}
      {kind === "quick-look" && <div className="mac-quick-look"><header><b>README.md</b><span>Open with Preview</span></header><main><b>DevUtils</b><span>A collection of browser-based developer utilities.</span><i /><i /><i /></main></div>}
      {kind === "force-quit" && <div className="mac-force-quit-dialog"><b>Force Quit Applications</b><small>If an app doesn’t respond, select its name and click Force Quit.</small><div><span>Finder</span><span className="selected">TextEdit — Not Responding</span><span>Terminal</span></div><footer><span>Cancel</span><strong>Force Quit</strong></footer></div>}
      {kind === "lock" && <div className="mac-lock-screen"><time>9:41</time><small>Sunday, September 13</small><b>JL</b><span>Jiwei</span><i>Enter Password</i></div>}
      <div className="mac-dock"><span className="mac-dock-finder">◫</span><span className="mac-dock-app">✎<i /></span><span className="mac-dock-terminal">&gt;_<i /></span>{kind === "minimize" && <span className="mac-dock-minimized">▱</span>}<span className="mac-dock-trash">♲</span></div>
      <span className="mac-effect-label">{transition.after}</span>
    </div>
  );
}

function getPreviewTransition(shortcut: KeyboardShortcut): PreviewTransition {
  if (shortcut.platform === "bash") return getBashTransition(shortcut);
  if (shortcut.platform === "chrome") return getChromeTransition(shortcut);
  return getMacTransition(shortcut);
}

function VisualPreview({ shortcut }: { shortcut: KeyboardShortcut }) {
  const [replay, setReplay] = useState(0);
  const transition = getPreviewTransition(shortcut);
  const previewTitleId = `shortcut-preview-title-${shortcut.id}`;

  return (
    <section id={`shortcut-preview-${shortcut.id}`} className="visual-shortcut-preview" aria-labelledby={previewTitleId}>
      <header className="visual-preview-heading">
        <div>
          <p className="eyebrow">Visual preview</p>
          <h2 id={previewTitleId}>{shortcut.action}</h2>
          <span>Simulated locally — no keys are captured and no action is executed.</span>
        </div>
        <div className="visual-preview-actions">
          <ShortcutKeys bindings={shortcut.keys} />
          <button type="button" className="secondary-button" onClick={() => setReplay((value) => value + 1)}>↻ Replay</button>
        </div>
      </header>

      <div className={`visual-preview-stage ${shortcut.platform}`} key={replay}>
        {shortcut.platform === "bash" && <BashScene shortcut={shortcut} />}
        {shortcut.platform === "chrome" && <ChromeScene shortcut={shortcut} />}
        {shortcut.platform === "macos" && <MacScene shortcut={shortcut} />}
      </div>

      <div className="preview-state-change">
        <div><span>Before</span><strong>{transition.before}</strong></div>
        <b aria-hidden="true">→</b>
        <div><span>After</span><strong>{transition.after}</strong></div>
      </div>
    </section>
  );
}

export function ShortcutLibrary() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [group, setGroup] = useState("all");
  const [expandedShortcutId, setExpandedShortcutId] = useState<string | null>(null);

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
              const shortcutPairs = Array.from({ length: Math.ceil(shortcuts.length / 2) }, (_, index) =>
                shortcuts.slice(index * 2, index * 2 + 2),
              );

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
                    {shortcutPairs.map((pair) => {
                      const expandedShortcut = pair.find((shortcut) => shortcut.id === expandedShortcutId);

                      return (
                        <div
                          className={`shortcut-pair${expandedShortcut?.id === pair[0].id ? " preview-first" : ""}`}
                          key={pair[0].id}
                        >
                          {pair.map((shortcut) => {
                            const isExpanded = shortcut.id === expandedShortcutId;

                            return (
                              <article className={`shortcut-row${isExpanded ? " expanded" : ""}`} key={shortcut.id}>
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
                                <div className="shortcut-row-controls">
                                  <ShortcutKeys bindings={shortcut.keys} />
                                  <button
                                    type="button"
                                    className="shortcut-preview-trigger"
                                    onClick={() => setExpandedShortcutId(isExpanded ? null : shortcut.id)}
                                    aria-expanded={isExpanded}
                                    aria-controls={`shortcut-preview-${shortcut.id}`}
                                  >
                                    {isExpanded ? "Hide preview" : "Preview"}
                                  </button>
                                </div>
                              </article>
                            );
                          })}

                          {expandedShortcut && (
                            <div className="shortcut-inline-preview">
                              <VisualPreview shortcut={expandedShortcut} key={expandedShortcut.id} />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
