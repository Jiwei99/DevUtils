export type ShortcutPlatform = "bash" | "chrome" | "macos";

export type KeyboardShortcut = {
  id: string;
  platform: ShortcutPlatform;
  group: string;
  action: string;
  keys: string[][];
  description?: string;
  searchTerms?: string[];
};

export const shortcutPlatforms: Array<{
  id: ShortcutPlatform;
  label: string;
  description: string;
}> = [
  { id: "bash", label: "Bash", description: "GNU Readline (Emacs mode)" },
  { id: "chrome", label: "Chrome", description: "Google Chrome for Mac" },
  { id: "macos", label: "macOS", description: "System and common app shortcuts" },
];

export const keyboardShortcuts: KeyboardShortcut[] = [
  // Bash / GNU Readline
  { id: "bash-line-start", platform: "bash", group: "Navigation", action: "Move to the start of the line", keys: [["Ctrl", "A"]], searchTerms: ["beginning", "home"] },
  { id: "bash-line-end", platform: "bash", group: "Navigation", action: "Move to the end of the line", keys: [["Ctrl", "E"]], searchTerms: ["end"] },
  { id: "bash-char-back", platform: "bash", group: "Navigation", action: "Move back one character", keys: [["Ctrl", "B"]], searchTerms: ["left", "backward"] },
  { id: "bash-char-forward", platform: "bash", group: "Navigation", action: "Move forward one character", keys: [["Ctrl", "F"]], searchTerms: ["right"] },
  { id: "bash-word-back", platform: "bash", group: "Navigation", action: "Move back one word", keys: [["Alt", "B"]], searchTerms: ["left", "backward"] },
  { id: "bash-word-forward", platform: "bash", group: "Navigation", action: "Move forward one word", keys: [["Alt", "F"]], searchTerms: ["right"] },
  { id: "bash-clear-screen", platform: "bash", group: "Navigation", action: "Clear the screen and redraw the current line", keys: [["Ctrl", "L"]], searchTerms: ["terminal", "clean"] },
  { id: "bash-delete-char", platform: "bash", group: "Editing", action: "Delete the character under the cursor", keys: [["Ctrl", "D"]], description: "On an empty line, this can exit the shell." },
  { id: "bash-delete-before", platform: "bash", group: "Editing", action: "Delete from the cursor to the start of the line", keys: [["Ctrl", "U"]], searchTerms: ["kill", "cut"] },
  { id: "bash-delete-after", platform: "bash", group: "Editing", action: "Delete from the cursor to the end of the line", keys: [["Ctrl", "K"]], searchTerms: ["kill", "cut"] },
  { id: "bash-delete-word-before", platform: "bash", group: "Editing", action: "Delete the word before the cursor", keys: [["Ctrl", "W"]], searchTerms: ["kill", "cut", "previous"] },
  { id: "bash-delete-word-after", platform: "bash", group: "Editing", action: "Delete from the cursor to the end of the word", keys: [["Alt", "D"]], searchTerms: ["kill", "cut", "next"] },
  { id: "bash-yank", platform: "bash", group: "Editing", action: "Paste the most recently deleted text", keys: [["Ctrl", "Y"]], searchTerms: ["yank", "kill ring"] },
  { id: "bash-undo", platform: "bash", group: "Editing", action: "Undo the last editing action", keys: [["Ctrl", "_"]], searchTerms: ["revert"] },
  { id: "bash-transpose", platform: "bash", group: "Editing", action: "Swap the current character with the previous one", keys: [["Ctrl", "T"]], searchTerms: ["transpose"] },
  { id: "bash-history-previous", platform: "bash", group: "History", action: "Move to the previous history entry", keys: [["Ctrl", "P"], ["↑"]], searchTerms: ["older", "command"] },
  { id: "bash-history-next", platform: "bash", group: "History", action: "Move to the next history entry", keys: [["Ctrl", "N"], ["↓"]], searchTerms: ["newer", "command"] },
  { id: "bash-history-search", platform: "bash", group: "History", action: "Search command history backward", keys: [["Ctrl", "R"]], description: "Press again to move to an older matching command.", searchTerms: ["reverse", "incremental"] },
  { id: "bash-complete", platform: "bash", group: "Completion", action: "Complete a command, path, or variable", keys: [["Tab"]], searchTerms: ["autocomplete"] },
  { id: "bash-cancel", platform: "bash", group: "Process", action: "Interrupt the current command", keys: [["Ctrl", "C"]], searchTerms: ["cancel", "stop", "sigint"] },
  { id: "bash-suspend", platform: "bash", group: "Process", action: "Suspend the current foreground process", keys: [["Ctrl", "Z"]], description: "Use fg to bring the process back to the foreground.", searchTerms: ["pause", "job"] },

  // Google Chrome for Mac
  { id: "chrome-new-tab", platform: "chrome", group: "Tabs & windows", action: "Open a new tab", keys: [["⌘", "T"]] },
  { id: "chrome-new-window", platform: "chrome", group: "Tabs & windows", action: "Open a new window", keys: [["⌘", "N"]] },
  { id: "chrome-incognito", platform: "chrome", group: "Tabs & windows", action: "Open a new Incognito window", keys: [["⌘", "Shift", "N"]], searchTerms: ["private"] },
  { id: "chrome-reopen-tab", platform: "chrome", group: "Tabs & windows", action: "Reopen the most recently closed tab", keys: [["⌘", "Shift", "T"]], searchTerms: ["restore", "undo close"] },
  { id: "chrome-next-tab", platform: "chrome", group: "Tabs & windows", action: "Jump to the next open tab", keys: [["⌘", "⌥", "→"]] },
  { id: "chrome-previous-tab", platform: "chrome", group: "Tabs & windows", action: "Jump to the previous open tab", keys: [["⌘", "⌥", "←"]] },
  { id: "chrome-specific-tab", platform: "chrome", group: "Tabs & windows", action: "Jump to a specific tab", keys: [["⌘", "1–8"]], description: "Use the tab’s position from 1 through 8." },
  { id: "chrome-last-tab", platform: "chrome", group: "Tabs & windows", action: "Jump to the last tab", keys: [["⌘", "9"]], searchTerms: ["rightmost"] },
  { id: "chrome-close-tab", platform: "chrome", group: "Tabs & windows", action: "Close the current tab", keys: [["⌘", "W"]] },
  { id: "chrome-close-window", platform: "chrome", group: "Tabs & windows", action: "Close the current window", keys: [["⌘", "Shift", "W"]] },
  { id: "chrome-back", platform: "chrome", group: "Navigation", action: "Go back in browsing history", keys: [["⌘", "["], ["⌘", "←"]], searchTerms: ["previous page"] },
  { id: "chrome-forward", platform: "chrome", group: "Navigation", action: "Go forward in browsing history", keys: [["⌘", "]"], ["⌘", "→"]], searchTerms: ["next page"] },
  { id: "chrome-address", platform: "chrome", group: "Navigation", action: "Jump to the address bar", keys: [["⌘", "L"]], searchTerms: ["url", "location", "omnibox"] },
  { id: "chrome-reload", platform: "chrome", group: "Navigation", action: "Reload the current page", keys: [["⌘", "R"]], searchTerms: ["refresh"] },
  { id: "chrome-hard-reload", platform: "chrome", group: "Navigation", action: "Reload the page without cached content", keys: [["⌘", "Shift", "R"]], searchTerms: ["hard refresh", "cache"] },
  { id: "chrome-find", platform: "chrome", group: "Page", action: "Find text on the current page", keys: [["⌘", "F"]], searchTerms: ["search"] },
  { id: "chrome-bookmark", platform: "chrome", group: "Page", action: "Bookmark the current page", keys: [["⌘", "D"]], searchTerms: ["favorite", "save"] },
  { id: "chrome-print", platform: "chrome", group: "Page", action: "Print the current page", keys: [["⌘", "P"]] },
  { id: "chrome-save", platform: "chrome", group: "Page", action: "Save the current page", keys: [["⌘", "S"]], searchTerms: ["download"] },
  { id: "chrome-zoom-in", platform: "chrome", group: "Page", action: "Zoom in", keys: [["⌘", "+"]], searchTerms: ["bigger", "increase"] },
  { id: "chrome-zoom-out", platform: "chrome", group: "Page", action: "Zoom out", keys: [["⌘", "-"]], searchTerms: ["smaller", "decrease"] },
  { id: "chrome-zoom-reset", platform: "chrome", group: "Page", action: "Reset page zoom", keys: [["⌘", "0"]], searchTerms: ["default size"] },
  { id: "chrome-history", platform: "chrome", group: "Chrome", action: "Open browsing history", keys: [["⌘", "Y"]] },
  { id: "chrome-downloads", platform: "chrome", group: "Chrome", action: "Open downloads", keys: [["⌘", "Shift", "J"]] },
  { id: "chrome-bookmarks-bar", platform: "chrome", group: "Chrome", action: "Show or hide the bookmarks bar", keys: [["⌘", "Shift", "B"]] },
  { id: "chrome-devtools", platform: "chrome", group: "Developer", action: "Open Developer Tools", keys: [["⌘", "⌥", "I"]], searchTerms: ["inspect", "dev tools"] },
  { id: "chrome-console", platform: "chrome", group: "Developer", action: "Open the JavaScript console", keys: [["⌘", "⌥", "J"]], searchTerms: ["developer tools", "devtools"] },
  { id: "chrome-source", platform: "chrome", group: "Developer", action: "View the page source", keys: [["⌘", "⌥", "U"]], searchTerms: ["html", "code"] },
  { id: "chrome-clear-data", platform: "chrome", group: "Chrome", action: "Open Delete Browsing Data", keys: [["⌘", "Shift", "Delete"]], searchTerms: ["clear cache", "cookies", "history"] },

  // macOS
  { id: "mac-cut", platform: "macos", group: "Editing", action: "Cut the selected item", keys: [["⌘", "X"]], searchTerms: ["clipboard"] },
  { id: "mac-copy", platform: "macos", group: "Editing", action: "Copy the selected item", keys: [["⌘", "C"]], searchTerms: ["clipboard"] },
  { id: "mac-paste", platform: "macos", group: "Editing", action: "Paste from the Clipboard", keys: [["⌘", "V"]], searchTerms: ["clipboard"] },
  { id: "mac-undo", platform: "macos", group: "Editing", action: "Undo the previous action", keys: [["⌘", "Z"]] },
  { id: "mac-redo", platform: "macos", group: "Editing", action: "Redo the previous action", keys: [["⌘", "Shift", "Z"]] },
  { id: "mac-select-all", platform: "macos", group: "Editing", action: "Select all items", keys: [["⌘", "A"]] },
  { id: "mac-find", platform: "macos", group: "Common app", action: "Find items or text", keys: [["⌘", "F"]], searchTerms: ["search"] },
  { id: "mac-save", platform: "macos", group: "Common app", action: "Save the current document", keys: [["⌘", "S"]] },
  { id: "mac-print", platform: "macos", group: "Common app", action: "Open the print dialog", keys: [["⌘", "P"]] },
  { id: "mac-settings", platform: "macos", group: "Common app", action: "Open settings for the current app", keys: [["⌘", ","]], searchTerms: ["preferences"] },
  { id: "mac-close", platform: "macos", group: "Windows & apps", action: "Close the front window", keys: [["⌘", "W"]] },
  { id: "mac-minimize", platform: "macos", group: "Windows & apps", action: "Minimize the front window", keys: [["⌘", "M"]] },
  { id: "mac-hide", platform: "macos", group: "Windows & apps", action: "Hide the current app", keys: [["⌘", "H"]] },
  { id: "mac-quit", platform: "macos", group: "Windows & apps", action: "Quit the current app", keys: [["⌘", "Q"]] },
  { id: "mac-switch-app", platform: "macos", group: "Windows & apps", action: "Switch to the next recently used app", keys: [["⌘", "Tab"]], searchTerms: ["app switcher"] },
  { id: "mac-switch-window", platform: "macos", group: "Windows & apps", action: "Switch between windows of the current app", keys: [["⌘", "`"]], searchTerms: ["cycle", "grave accent"] },
  { id: "mac-force-quit", platform: "macos", group: "Windows & apps", action: "Open the Force Quit window", keys: [["⌥", "⌘", "Esc"]], searchTerms: ["frozen", "unresponsive"] },
  { id: "mac-spotlight", platform: "macos", group: "System", action: "Open or close Spotlight", keys: [["⌘", "Space"]], searchTerms: ["search", "launcher"] },
  { id: "mac-lock", platform: "macos", group: "System", action: "Lock the screen", keys: [["⌃", "⌘", "Q"]], searchTerms: ["security"] },
  { id: "mac-full-screen", platform: "macos", group: "System", action: "Enter or leave full screen", keys: [["⌃", "⌘", "F"]] },
  { id: "mac-emoji", platform: "macos", group: "System", action: "Open the Character Viewer", keys: [["⌃", "⌘", "Space"], ["Fn", "E"]], searchTerms: ["emoji", "symbols"] },
  { id: "mac-screenshot-screen", platform: "macos", group: "Screenshots", action: "Capture the entire screen", keys: [["Shift", "⌘", "3"]] },
  { id: "mac-screenshot-selection", platform: "macos", group: "Screenshots", action: "Capture a selected area", keys: [["Shift", "⌘", "4"]], searchTerms: ["region"] },
  { id: "mac-screenshot-tools", platform: "macos", group: "Screenshots", action: "Open screenshot and recording controls", keys: [["Shift", "⌘", "5"]], searchTerms: ["screen record"] },
  { id: "mac-quick-look", platform: "macos", group: "Finder", action: "Preview the selected item with Quick Look", keys: [["Space"]], searchTerms: ["file preview"] },
  { id: "mac-new-folder", platform: "macos", group: "Finder", action: "Create a new folder", keys: [["Shift", "⌘", "N"]], searchTerms: ["directory"] },
  { id: "mac-go-folder", platform: "macos", group: "Finder", action: "Open Go to Folder", keys: [["Shift", "⌘", "G"]], searchTerms: ["path", "directory"] },
  { id: "mac-trash", platform: "macos", group: "Finder", action: "Move the selected item to Trash", keys: [["⌘", "Delete"]], searchTerms: ["remove", "file"] },
];

export const shortcutSources = [
  { label: "GNU Bash manual", href: "https://www.gnu.org/software/bash/manual/html_node/Bindable-Readline-Commands.html" },
  { label: "Google Chrome Help", href: "https://support.google.com/chrome/answer/157179?co=GENIE.Platform%3DDesktop&hl=en" },
  { label: "Apple Support", href: "https://support.apple.com/en-us/102650" },
] as const;
