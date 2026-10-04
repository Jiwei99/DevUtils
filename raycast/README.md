# DevUtils for Raycast

A local Raycast extension that opens the developer utilities hosted at [devutils.jiwei.dev](https://devutils.jiwei.dev) and manages Git worktree folders on your computer.

Each utility is exposed as its own searchable, no-view Raycast command. Running a command opens the corresponding page in the default browser without displaying an intermediate Raycast view.

## Available commands

| Raycast command             | Page           |
| --------------------------- | -------------- |
| Open DevUtils               | `/`            |
| Open JSON Formatter         | `/json`        |
| Open Text & JSON Diff       | `/diff`        |
| Open Regex Tester           | `/regex`       |
| Open Cron Explorer          | `/cron`        |
| Open JSON Encoder / Decoder | `/encoder`     |
| Open Number Base Converter  | `/number-base` |
| Open Time Unit Converter    | `/time`        |
| Open Unix Time Converter    | `/unix-time`   |
| Open String Case Converter  | `/string-case` |
| Open Keyboard Shortcuts     | `/shortcuts`   |

All routes use this base URL:

```text
https://devutils.jiwei.dev
```

## Git worktree commands

| Raycast command        | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| Create Worktree Folder | Choose a destination, then add and configure repositories one at a time.     |
| Update Worktree Folder | Add repositories to or remove worktrees from an existing worktree folder.    |
| Remove Worktree Folder | Pick a worktree folder, review its linked worktrees, and safely remove them. |

The create command first asks for a destination folder. Enter an optional new folder name to create a worktree folder inside that destination, or leave it empty to store the worktrees directly in the selected destination. A reused destination may contain unrelated files; DevUtils records and later removes only the worktrees it creates there.

Repositories are added and configured one at a time. Choose each repository's main checkout folder (not a linked worktree or subfolder), then either select an existing branch or enter a new branch name and choose the branch it should start from. New names are checked with Git's branch-name rules and must not conflict with existing local branches. The confirmation shows the branch that each worktree will check out.

Selecting a repository automatically runs `git fetch origin` with a five-minute timeout and refreshes its branch list. A failed fetch is shown in both a toast and the repository list; cached local and remote-tracking refs remain selectable. Authentication must be available through your normal Git credential helper or SSH agent because the extension does not open a terminal password prompt.

For a new branch, **Branch Off From** defaults to `origin/main`, then `origin/master` when available, with local `main` or `master` as a fallback. The command does **not** pull into the local checkout, which may be behind or contain local changes. Every new branch is created with `--no-track`, so it has no upstream until you explicitly set one when pushing, for example with `git push -u origin feature/my-feature`.

Selecting an existing local branch that is already checked out anywhere produces an error before a folder is created; choose a different branch or explicitly create a new one from that target. A remote target creates a new local branch from the selected remote-tracking ref, using the remote branch name when available or a unique `devutils/...` name when it would collide. The review confirmation shows the actual branch that will be checked out.

The update command starts from the linked worktrees currently present in the selected folder, including worktrees added manually outside DevUtils. It can also adopt a folder of linked worktrees that does not have a DevUtils manifest. Additions use the same repository and branch flow as creation. Removals are staged in the worktree list and applied only after a confirmation that summarizes every change. A worktree with tracked changes, untracked or ignored files, a lock, or submodules can remain in the folder but cannot be removed until it is clean. Updates preserve the worktree folder, source repositories, and Git branches.

The remove command verifies each linked worktree and blocks removal when it finds tracked changes, untracked or ignored files, locks, submodules, or symlinks. It never uses `git worktree remove --force`; resolve those items and retry. Git branches and the source repositories remain untouched. A worktree folder created by DevUtils is removed only after it is empty; a destination selected directly is always preserved along with unrelated contents. A failure midway leaves the remaining worktrees and reports how many completed.

## Prerequisites

- Raycast
- Git (for the worktree commands)
- Node.js 20 or newer
- npm

## Local installation

From the repository root:

```bash
cd raycast
npm install
npm run dev
```

Raycast opens development mode and installs the extension locally. Search for `DevUtils` or for the name of an individual utility to run a command.

## Development

Validate the manifest, icon, source, and formatting:

```bash
npm run lint
```

Create a local production build:

```bash
npm run build
```

Apply Raycast lint fixes:

```bash
npm run fix-lint
```

## Project structure

```text
raycast/
├── assets/
│   ├── icon.png
│   └── icon.svg
├── src/
│   ├── lib/
│   │   ├── open-page.ts       # Shared URL-opening implementation
│   │   ├── git-worktrees.ts   # Git repository and ref inspection
│   │   └── worktree-groups.ts # Folder creation, updates, and guarded removal
│   ├── open-*.ts              # Browser command entry points
│   ├── worktree-repository-form.tsx
│   ├── create-worktree-group.tsx
│   ├── update-worktree-group.tsx
│   └── remove-worktree-group.tsx
├── package.json             # Extension manifest and commands
├── eslint.config.js
└── tsconfig.json
```

## Local-only scope

This extension is intended for local installation and is not configured with a Raycast Store publishing command. Browser commands only open the requested DevUtils page; worktree commands process local folders using Git and Node.js. Selecting a repository in the create or update flow contacts its `origin` remote; there are no DevUtils backend calls. Processing within the DevUtils website remains browser-side.

To change the hosted domain, update `DEVUTILS_BASE_URL` in `src/lib/open-page.ts`.
