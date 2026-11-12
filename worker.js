// Cloudflare Worker: serves the website files and runs the API (admin panel + contact form).
// Settings (Cloudflare → Workers & Pages → inputsoft-website → Settings → Variables and Secrets):
//   ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO (default INPUT-SOFT/inputsoft.website),
//   RESEND_API_KEY, MAIL_FROM
import { createApi } from './server/core.js';
import { githubStore } from './server/github-store.js';
import { readonlyStore } from './server/readonly-store.js';

// Files the worker reads internally but never serves to visitors.
const PRIVATE = new Set(['/content/forms.json']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (PRIVATE.has(url.pathname)) return new Response('Not found', { status: 404 });
    if (url.pathname.startsWith('/api/')) {
      const asset = (path) => env.ASSETS.fetch(new Request(`${url.origin}/${path}`));
      const store = env.GITHUB_TOKEN
        ? githubStore({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO || 'INPUT-SOFT/inputsoft.website', branch: env.GITHUB_BRANCH || 'main' })
        : readonlyStore(asset, 'Add GITHUB_TOKEN in Cloudflare → Workers & Pages → inputsoft-website → Settings → Variables and Secrets.');
      const readForms = async () => { const r = await asset('content/forms.json'); return r.ok ? r.json() : { recipients: [] }; };
      return createApi({ env, store, mode: env.GITHUB_TOKEN ? 'github' : 'readonly', readForms }).handle(request);
    }
    return env.ASSETS.fetch(request);
  },
};
