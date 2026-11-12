// Runs the API on Node: Vercel functions (api/*.js) and the local dev server (serve.mjs).
import { createApi } from './core.js';
import { githubStore } from './github-store.js';
import { readonlyStore } from './readonly-store.js';
import { localStore, readLocalForms } from './local-store.js';

const originOf = (req) => `${req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')}://${req.headers['x-forwarded-host'] || req.headers.host}`;

async function toRequest(req, origin) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    let parsed;
    try { parsed = req.body; } catch { parsed = undefined; } // Vercel parses JSON bodies for us
    if (parsed !== undefined) body = typeof parsed === 'string' || parsed instanceof Uint8Array ? parsed : JSON.stringify(parsed);
    else {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = Buffer.concat(chunks);
    }
  }
  return new Request(new URL(req.url, origin), { method: req.method, headers, body });
}

export async function nodeHandler(req, res) {
  const env = process.env;
  const origin = originOf(req);
  let mode;
  let store;
  if (env.GITHUB_TOKEN) {
    mode = 'github';
    store = githubStore({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO || 'GritsenkoIvanKPI/input-soft', branch: env.GITHUB_BRANCH || 'main' });
  } else if (env.VERCEL) {
    mode = 'readonly';
    store = readonlyStore((p) => fetch(`${origin}/${p}`, { cache: 'no-store' }), 'Add GITHUB_TOKEN in Vercel → Settings → Environment Variables, then redeploy.');
  } else {
    mode = 'local';
    store = localStore();
  }
  const readForms = mode === 'local'
    ? () => readLocalForms()
    : async () => { const r = await fetch(`${origin}/content/forms.json`, { cache: 'no-store' }); return r.ok ? r.json() : { recipients: [] }; };

  const response = await createApi({ env, store, mode, readForms }).handle(await toRequest(req, origin));
  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export default nodeHandler;
