# DevUtils for Raycast

A local Raycast extension that opens the developer utilities hosted at [devutils.jiwei.dev](https://devutils.jiwei.dev).

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

All routes use this base URL:

```text
https://devutils.jiwei.dev
```

## Prerequisites

- Raycast
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
│   │   └── open-page.ts     # Shared URL-opening implementation
│   └── open-*.ts            # Raycast command entry points
├── package.json             # Extension manifest and commands
├── eslint.config.js
└── tsconfig.json
```

## Local-only scope

This extension is intended for local installation and is not configured with a Raycast Store publishing command. It does not process utility inputs or make API requests itself; it only opens the requested page in your browser. Processing within the DevUtils website remains browser-side.

To change the hosted domain, update `DEVUTILS_BASE_URL` in `src/lib/open-page.ts`.
