# DevUtils

DevUtils is a collection of focused developer utilities that run entirely in the browser. Inputs are processed locally—there is no application backend and no data is uploaded for conversion.

## Utilities

- **JSON Formatter** — validate, format, expand or inline arrays, and recursively sort fields.
- **Text & JSON Diff** — compare two texts with line and character-level highlighting. JSON is formatted and sorted before comparison.
- **Regex Tester** — test JavaScript regular expressions, inspect matches, and explain pattern tokens.
- **Cron Explorer** — validate five-field cron expressions, read plain-language descriptions, and preview upcoming runs.
- **JSON Encoder / Decoder** — convert JSON to escaped JSON strings or `application/x-www-form-urlencoded` data and back.
- **Number Base Converter** — convert binary, octal, decimal, and hexadecimal integers.
- **Time Unit Converter** — convert durations from nanoseconds through weeks.
- **Unix Time Converter** — convert timestamps to readable dates and local dates back to Unix seconds or milliseconds.
- **String Case Converter** — generate camel, Pascal, snake, kebab, constant, title, sentence, dot, and path casing.
- **Keyboard Shortcuts** — search common Bash, Chrome for Mac, and macOS keyboard shortcuts.

## Getting started

The Next.js application lives in `webapp`:

```bash
cd webapp
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Verification

```bash
cd webapp
npm run lint
npx tsc --noEmit
npm run build
```

## Project structure

```text
DevUtils/
├── README.md
├── raycast/           # Raycast commands for opening each utility
└── webapp/
    ├── public/
    └── src/
        ├── app/          # Pages and routes
        ├── components/   # Interactive utility interfaces
        └── lib/          # Browser-side parsers and conversion logic
```

## Privacy

All utility processing happens in client-side JavaScript. DevUtils does not require an API server, database, account, or file upload service.

## Raycast extension

The `raycast` directory contains a local no-view command for every DevUtils page. Each command opens the corresponding route at `https://devutils.jiwei.dev`; see [`raycast/README.md`](raycast/README.md) for setup instructions.
