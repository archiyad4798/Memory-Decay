# Memory Decay Repository Instructions

## Project

Memory Decay is a spaced-repetition web app built with vanilla JavaScript,
Tailwind CSS 3.4 and PostCSS. It uses `localStorage` and has no backend or
framework.

## Structure

- `index.html`: root dashboard and target UI.
- `input.css`: Tailwind source stylesheet.
- `app.css`: compiled Tailwind output. Never edit this file by hand.
- `tailwind.config.js`: theme configuration for paper, ink, muted, line, soft,
  sage, sage-dark, `shadow-app`, and the Georgia display font.
- `javascripts/logic.js`: pure engine for scoring, scheduling, memory states,
  time calculations, and storage. It must not access the DOM.
- `javascripts/main.js`: DOM rendering, views, dialogs, events, and toasts.
- `references/`: read-only reference containing the old prototype
  (`index.html`, `app.js`, `logic.js`, and `style.css`). It is gitignored.

## Rules

- Keep the UI pixel-identical to the approved dashboard.
- Do not copy markup or implementation weaknesses from `references/`.
- Never commit or add `references/` to version control.
- Make every time function accept a `now` argument so demo-clock fast-forward
  can replace the real current time deterministically.
- Do not silently catch errors. Surface storage and validation failures clearly.
- Escape every stored or user-provided value before rendering HTML.
- Use `npm run build` for a one-shot production CSS build.
- Use `npm run dev` for watch mode.
- Explain each implementation step briefly before making changes.
- Keep commits small and focused.
- Do not expand scope beyond the active prompt.
