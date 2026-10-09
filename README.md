# INPUT SOFT — website

Marketing website for INPUT SOFT, a Management Platform for Airport Operations.
Static HTML/CSS/JS, no build step.

## Structure

- `index.html` — home page (also the source of the shared header, icons, contact form and footer)
- `resource-management.html`, `data-management.html`, `calculations-on-demand.html`, `flightprint.html` — solution pages, **generated** by `build-pages.mjs`
- `build-pages.mjs` — content and templates for the solution pages; run `node build-pages.mjs` after editing it or the shared parts of `index.html`
- `assets/css/styles.css` — shared design system (tokens, components, sections)
- `assets/js/main.js` — shared behaviour (nav, dropdown, reveal, parallax, steps, forms, line-break fixer)
- `assets/img/` — brand, logos, product screenshots, photos and generated imagery

## Local development

```bash
npm install          # installs Puppeteer for the tooling below
PORT=3003 npm run dev   # serves the site at http://localhost:3003 (default port 3000)
```

## Tooling

- `node screenshot.mjs <url> [label]` — full-page screenshot into `temporary screenshots/`
- `node audit.mjs [device|width]` — checks 14 device sizes for single-word lines, text overlap, clipped boxes and horizontal overflow (expects the dev server at http://localhost:3003, override with SITE_URL)
