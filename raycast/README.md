# DevUtils for Raycast

A local Raycast extension that opens the developer utilities hosted at [devutils.jiwei.dev](https://devutils.jiwei.dev) and manages Git worktree groups on your computer.

Each utility is exposed as its own searchable, no-view Raycast command. Running a command opens the corresponding page in the default browser without displaying an intermediate Raycast view.

## Available commands

| Raycast command | Page |
| --- | --- |
| Open DevUtils | `/` |
| Open JSON Formatter | `/json` |
| Open Text & JSON Diff | `/diff` |
| Open Regex Tester | `/regex` |
| Open Cron Explorer | `/cron` |
| Open JSON Encoder / Decoder | `/encoder` |
| Open Number Base Converter | `/number-base` |
| Open Time Unit Converter | `/time` |
| Open Unix Time Converter | `/unix-time` |
| Open String Case Converter | `/string-case` |
| Open Keyboard Shortcuts | `/shortcuts` |

All routes use this base URL:

```text
https://devutils.jiwei.dev
```

## Git worktree commands

| Raycast command | Purpose |
| --- | --- |
| Create Worktree Group | Pick multiple repository roots, a destination parent, a new group folder name, and a target branch for each repository. |
| Remove Worktree Group | Pick an enclosing folder, review its linked worktrees, and remove eligible worktrees and the empty folder. |

The create command uses Raycast's graphical directory pickers and searchable branch dropdowns. Choose each repository's main checkout folder (not a linked worktree or subfolder). It offers an "Apply to All" target selection when the same local or remote-tracking ref exists in every chosen repository. Every repository must have an explicit starting target selection before creation.

To create a branch with the same name in every repository, enter **New Branch for All** and choose the starting target for each repository. For a mixed group, leave that field empty and enable **New Branch** on only the repositories that need one, then enter each branch name. New names are checked with Git's branch-name rules and must not conflict with existing local branches. The confirmation shows the branch that each worktree will check out.

Remote-tracking branches are read from local Git refs. Creation never fetches automatically. To update those refs, select repositories and run **Fetch Remote Branches** from the form's action menu. It asks for confirmation, then runs `git fetch` for every configured remote in the selected repositories, refreshes the branch dropdowns, and reports any failures. Each fetch has a five-minute timeout. This action contacts the Git remotes but does not push, create worktrees, or use a DevUtils backend. Authentication must be available through your normal Git credential helper or SSH agent; the extension does not open a terminal password prompt.

For a new branch based on the latest remote default branch, run **Fetch Remote Branches**, then select `origin/main`, `origin/master`, or the corresponding ref from another remote as that repository's target. Make sure that ref appears after fetching; Git honors the repository's configured fetch refspecs. The new branch starts at the fetched commit. The command does **not** pull into the local `main`/`master` checkout, which may be behind or contain local changes. Every new branch is created with `--no-track`, so it has no upstream—neither the base branch nor a remote branch—until you explicitly set one when pushing, for example with `git push -u origin feature/my-feature`.

Selecting an existing local branch that is already checked out anywhere produces an error before a folder is created; choose a different branch or explicitly create a new one from that target. A remote target creates a new local branch from the selected remote-tracking ref, using the remote branch name when available or a unique `devutils/...` name when it would collide. The review confirmation shows the actual branch that will be checked out.

The remove command verifies that each immediate child is a linked worktree, never a main checkout. It blocks removal when it finds tracked changes, untracked or ignored files, locks, submodules, symlinks, or unrelated folder contents. It never uses `git worktree remove --force`; resolve those items and retry. Git branches and the original repositories remain untouched. The enclosing folder is removed only if it is empty after all worktrees are removed. A failure midway leaves the remaining worktrees and folder in place and reports how many completed.

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
│   │   └── worktree-groups.ts # Group creation and guarded removal
│   ├── open-*.ts              # Browser command entry points
│   ├── create-worktree-group.tsx
│   └── remove-worktree-group.tsx
├── package.json             # Extension manifest and commands
├── eslint.config.js
└── tsconfig.json
```

## Local-only scope

This extension is intended for local installation and is not configured with a Raycast Store publishing command. Browser commands only open the requested DevUtils page; worktree commands process local folders using Git and Node.js. Only the explicit **Fetch Remote Branches** action contacts Git remotes; there are no DevUtils backend calls. Processing within the DevUtils website remains browser-side.

To change the hosted domain, update `DEVUTILS_BASE_URL` in `src/lib/open-page.ts`.
