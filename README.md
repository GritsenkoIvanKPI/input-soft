# INPUT SOFT — website

Marketing website for INPUT SOFT, a Management Platform for Airport Operations.
Static HTML/CSS/JS. Page content lives in `content/` and is edited in the admin panel at `/admin`.

## Structure

- `content/site.json` — content shared by every page: header and menu labels, contact block and form, footer
- `content/pages/*.json` — one file per page (home, solution pages, case studies, legal pages)
- `lib/render.js` — turns the content into HTML; used by `build.mjs` and by the admin preview
- `build.mjs` — writes every `*.html` page from `content/`; run `node build.mjs` after editing content files by hand
- `*.html` — the generated pages that are served (do not edit them directly; they are overwritten)
- `admin/` — the admin panel (page list, section editor, live preview, image upload, publishing)
- `api/` — server functions on Vercel: `login`, `content`, `publish` (shared code in `api/_lib.js`)
- `assets/css/styles.css` — shared design system (tokens, components, sections)
- `assets/js/main.js` — shared behaviour (nav, dropdown, reveal, steps, modules, forms, line-break fixer)
- `assets/img/` — brand, logos, product screenshots, photos and generated imagery; admin uploads go to `assets/img/uploads/`

## Admin panel

Open `https://<site>/admin/`, sign in with the shared password, edit, then **Publish**.
Publishing commits the changed content, re-rendered pages and new images to GitHub (`main`), and Vercel
redeploys the site in about a minute. Every publish is a normal commit, so it can be reverted in GitHub.

Vercel environment variables (Project → Settings → Environment Variables):

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the shared admin password |
| `GITHUB_TOKEN` | a fine-grained GitHub token for this repository with **Contents: Read and write** |
| `GITHUB_REPO` | optional, defaults to `GritsenkoIvanKPI/input-soft` |
| `GITHUB_BRANCH` | optional, defaults to `main` |

Locally (`npm run dev`) the admin works without GitHub: sign in with `admin` (or `ADMIN_PASSWORD`), and
publishing writes the files in this folder.

## Local development

```bash
npm install          # installs Puppeteer for the tooling below
PORT=3003 npm run dev   # serves the site at http://localhost:3003 (default port 3000)
```

## Tooling

- `node screenshot.mjs <url> [label]` — full-page screenshot into `temporary screenshots/`
- `node audit.mjs [device|width]` — checks 14 device sizes for single-word lines, text overlap, clipped boxes and horizontal overflow (expects the dev server at http://localhost:3003, override with SITE_URL)
