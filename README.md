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
- `server/` — the API (admin login, content, publishing, contact form email), written once for every host
- `worker.js` + `wrangler.jsonc` — Cloudflare Workers: serves the site and runs the API
- `api/` — the same API as Vercel functions (thin wrappers around `server/`)
- `content/forms.json` — where form submissions are emailed (edited in the admin under Settings → Form submissions; never served publicly on Cloudflare)
- `assets/css/styles.css` — shared design system (tokens, components, sections)
- `assets/js/main.js` — shared behaviour (nav, dropdown, reveal, steps, modules, forms, line-break fixer)
- `assets/img/` — brand, logos, product screenshots, photos and generated imagery; admin uploads go to `assets/img/uploads/`

## Admin panel

Open `https://<site>/admin/`, sign in with the shared password, edit, then **Publish**.
Publishing commits the changed content, re-rendered pages and new images to GitHub (`main`), and the host
redeploys the site in about a minute. Every publish is a normal commit, so it can be reverted in GitHub.

## Contact form emails

The contact form and the "Request a demo" form post to `/api/lead`, which emails the request through
[Resend](https://resend.com) to the addresses set in the admin (Settings → Form submissions). The email's
reply-to is the visitor, so replying answers them directly. Spam protection: a hidden trap field, a minimum
fill-in time and a per-visitor rate limit.

Resend setup: create an account, add and verify the domain `inputsoft.net` (Resend shows DNS records to add in
Cloudflare; they do not affect the existing Google/Zoho mail), create an API key, and set the variables below.

## Server settings

Cloudflare: Workers & Pages → `inputsoft-website` → Settings → Variables and Secrets.
Vercel: Project → Settings → Environment Variables (then redeploy).

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the shared admin password |
| `GITHUB_TOKEN` | fine-grained GitHub token for the repository with **Contents: Read and write** (publishing) |
| `GITHUB_REPO` | optional: `owner/name` (Cloudflare default `INPUT-SOFT/inputsoft.website`, Vercel default `GritsenkoIvanKPI/input-soft`) |
| `GITHUB_BRANCH` | optional, defaults to `main` |
| `RESEND_API_KEY` | API key from resend.com (form emails) |
| `MAIL_FROM` | optional sender, defaults to `INPUT SOFT website <website@inputsoft.net>` (domain must be verified in Resend) |

Locally (`npm run dev`) the admin works without GitHub: sign in with `admin` (or `ADMIN_PASSWORD`), and
publishing writes the files in this folder, and form emails are printed in the terminal.

## Local development

```bash
npm install          # installs Puppeteer for the tooling below
PORT=3003 npm run dev   # serves the site at http://localhost:3003 (default port 3000)
```

## Tooling

- `node screenshot.mjs <url> [label]` — full-page screenshot into `temporary screenshots/`
- `node audit.mjs [device|width]` — checks 14 device sizes for single-word lines, text overlap, clipped boxes and horizontal overflow (expects the dev server at http://localhost:3003, override with SITE_URL)
