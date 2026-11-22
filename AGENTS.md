# Memory Decay Repository Instructions

## Project

Memory Decay is a final spaced-repetition web app built with vanilla JavaScript,
Tailwind CSS 3.4 and PostCSS. It uses IndexedDB in the user's browser and has
no backend or framework.

## Structure

- `index.html`: root dashboard and target UI.
- `input.css`: Tailwind source stylesheet.
- `app.css`: compiled Tailwind output. Never edit this file by hand.
- `tailwind.config.js`: theme configuration for paper, ink, muted, line, soft,
  sage, sage-dark, `shadow-app`, and the Georgia display font.
- `javascripts/main.js`: all UI behavior, shared components, dialogs, toasts, and views.
- `javascripts/logic.js`: engine, scheduling, scoring, selectors, schema, and storage. No DOM access.
- `src/pages/`: static application pages.
- `references/`: read-only legacy files (`index.html`, `app.js`, `logic.js`,
  and `style.css`). It is gitignored and must not influence implementation.

## Rules

- Keep the UI pixel-identical to the approved dashboard.
- Do not copy markup or implementation weaknesses from `references/`.
- Never commit or add `references/` to version control.
- Make every time function accept a `now` argument so tests and future clock
  controls can replace the real current time deterministically.
- Do not silently catch errors. Surface storage and validation failures clearly.
- Escape every stored or user-provided value before rendering HTML.
- Use `npm run build` for a one-shot production CSS build.
- Use `npm run dev` for watch mode.
- Explain each implementation step briefly before making changes.
- Keep commits small and focused.
- Do not expand scope beyond the active prompt.

## File ownership (do not create parallel files)

- javascripts/logic.js: engine only (scoring, scheduling, storage). No DOM.
- javascripts/main.js: all UI behavior (navigation, forms, dialogs, toasts, views).
- src/pages/\*.html and src/components/: markup only.
- Before creating ANY new .js file, check whether the code belongs in
  logic.js or main.js. Only create a new file if I explicitly ask.
- If a file I did not mention exists, ask me before deleting or merging it.
