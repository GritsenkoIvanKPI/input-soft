# INPUT SOFT — website

Marketing website for INPUT SOFT, a management platform for airport ground operations.
Static HTML/CSS/JS, no build step.

## Structure

- `index.html` — home page
- `assets/css/styles.css` — shared design system (tokens, components, sections)
- `assets/js/main.js` — shared behaviour (nav, dropdown, reveal, parallax, steps, forms, line-break fixer)
- `assets/img/` — brand, logos, product screenshots, photos and generated imagery

## Local development

```bash
npm install          # installs Puppeteer for the tooling below
PORT=3001 npm run dev   # serves the site at http://localhost:3001 (default port 3000)
```

## Tooling

- `node screenshot.mjs <url> [label]` — full-page screenshot into `temporary screenshots/`
- `node audit.mjs [device|width]` — checks 14 device sizes for single-word lines, text overlap, clipped boxes and horizontal overflow (expects the dev server on port 3001)
