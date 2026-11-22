# Memory Decay

Memory Decay is a private, browser-only spaced-repetition application built
with vanilla JavaScript, Tailwind CSS, PostCSS, and IndexedDB. It has no
backend and no remote account service.

## Features

- Full-screen Dashboard, Concepts, Concept, Recall, Result, and Settings views
- Concept creation, editing, deletion, search, filtering, and sorting
- Recall scoring using keyword matches, token overlap, and cosine similarity
- Decay and next-review scheduling
- Dashboard due items, status metrics, and retention history
- IndexedDB persistence with export, import, reset, and persistence status
- Unsaved-recall protection
- Multi-tab change and schema-change prompts
- Accessible native dialogs, labels, focus handling, and live toasts
- Responsive desktop and mobile layout
- Offline caching and installable PWA assets

## Data and privacy

Concepts, recall tests, settings, and metadata are stored locally in IndexedDB
under the `memory-decay` database. Data is not sent to a server. Exporting
creates a JSON download; importing replaces the browser workspace after schema
validation.

## Technology

- Vanilla JavaScript
- Tailwind CSS 3.4
- PostCSS
- Vite
- Vitest
- fake-indexeddb
- IndexedDB
- Service worker

## Project structure

```text
index.html
input.css
app.css
tailwind.config.js
postcss.config.js
vite.config.js
vercel.json
javascripts/
  main.js
  logic.js
src/pages/
  concept.html
  concepts.html
  recall.html
  result.html
  settings.html
public/
  manifest.webmanifest
  sw.js
  favicon.svg
  og-image.svg
  icons/
tests/
  setup.js
  logic.test.js
```

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

Vite writes hashed assets and all multi-page HTML to `dist/`. The directory is
generated and is not committed.

## Tests

```bash
npm test
```

Vitest covers scoring, scheduling, classification, selectors, malformed inputs,
import validation, and IndexedDB CRUD.
