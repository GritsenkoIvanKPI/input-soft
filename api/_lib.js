// Shared server code for the admin API (Vercel functions in /api and the local dev server).
//
// Environment variables (set them in Vercel → Project → Settings → Environment Variables):
//   ADMIN_PASSWORD  the shared admin password (required)
//   GITHUB_TOKEN    fine-grained token with "Contents: read and write" on the repository
//   GITHUB_REPO     owner/name, default GritsenkoIvanKPI/input-soft
//   GITHUB_BRANCH   default main
// Without GITHUB_TOKEN (local development) content is read from and written to the local files.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { renderSite } from '../lib/render.js';

const REPO = process.env.GITHUB_REPO || 'GritsenkoIvanKPI/input-soft';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN || '';
const ROOT = process.cwd();
const SESSION_HOURS = 12;

/* ------------------------------------------------------------------ http */
export async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

/* ------------------------------------------------------------------ auth */
const secret = () => {
  if (!process.env.ADMIN_PASSWORD) throw Object.assign(new Error('ADMIN_PASSWORD is not set on the server.'), { status: 500 });
  return `inputsoft-admin:${process.env.ADMIN_PASSWORD}`;
};
const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url');
const same = (a, b) => {
  const x = createHmac('sha256', 'cmp').update(String(a)).digest();
  const y = createHmac('sha256', 'cmp').update(String(b)).digest();
  return timingSafeEqual(x, y);
};

export function checkPassword(password) {
  return same(password || '', process.env.ADMIN_PASSWORD || '') && Boolean(process.env.ADMIN_PASSWORD);
}

export function issueToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600e3 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function requireAuth(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  const [payload, sig] = (m ? m[1] : '').split('.');
  let ok = false;
  if (payload && sig && same(sig, sign(payload))) {
    try { ok = JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { ok = false; }
  }
  if (!ok) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { status: 401 });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ validation */
const PAGE_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/;
const UPLOAD_PATH = /^assets\/img\/uploads\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp)$/;
const KINDS = ['home', 'solution', 'case', 'legal'];
const UNSAFE = /<\s*(script|iframe|object|embed|style|form|meta|link)\b|javascript:|\son[a-z]+\s*=/i;

export const contentPath = (file) => `content/pages/${file.replace(/\.html$/, '')}.json`;

function checkStrings(v, where) {
  if (typeof v === 'string') {
    if (UNSAFE.test(v)) throw Object.assign(new Error(`“${where}” contains code that is not allowed (scripts, frames or event handlers).`), { status: 400 });
  } else if (Array.isArray(v)) v.forEach((x) => checkStrings(x, where));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => checkStrings(x, where));
}

export function validatePage(page) {
  if (!page || !KINDS.includes(page.kind)) throw Object.assign(new Error('Unknown page type.'), { status: 400 });
  if (!PAGE_FILE.test(page.file || '')) throw Object.assign(new Error(`Invalid page address “${page.file}”. Use lowercase letters, numbers and dashes.`), { status: 400 });
  if (page.kind === 'home' && page.file !== 'index.html') throw Object.assign(new Error('The home page must stay index.html.'), { status: 400 });
  checkStrings(page, page.file);
}

/* --------------------------------------------------------------- storage */
const gh = async (path, opts = {}) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`GitHub ${res.status}: ${text.slice(0, 300)}`), { status: 502 });
  }
  return res.json();
};

// GitHub storage: the repository branch is the source of truth.
const github = {
  async head() {
    return (await gh(`/git/ref/heads/${BRANCH}`)).object.sha;
  },
  async snapshot(sha) {
    const commit = await gh(`/git/commits/${sha}`);
    const tree = await gh(`/git/trees/${commit.tree.sha}?recursive=1`);
    const entries = tree.tree.filter((e) => e.type === 'blob');
    const json = entries.filter((e) => e.path === 'content/site.json' || /^content\/pages\/[^/]+\.json$/.test(e.path));
    const blobs = await Promise.all(json.map((e) => gh(`/git/blobs/${e.sha}`)));
    const files = Object.fromEntries(json.map((e, i) => [e.path, Buffer.from(blobs[i].content, 'base64').toString('utf8')]));
    const images = entries.map((e) => e.path).filter((p) => /^assets\/img\/.+\.(jpg|jpeg|png|webp|svg)$/i.test(p));
    return { files, images, paths: entries.map((e) => e.path) };
  },
  async changedSince(base, head) {
    const cmp = await gh(`/compare/${base}...${head}`);
    return (cmp.files || []).map((f) => f.filename);
  },
  async commit({ head, writes, deletes, message }) {
    const commit = await gh(`/git/commits/${head}`);
    const blobs = await Promise.all(writes.map((w) => (w.encoding === 'base64'
      ? gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: w.content, encoding: 'base64' }) }).then((b) => ({ path: w.path, mode: '100644', type: 'blob', sha: b.sha }))
      : Promise.resolve({ path: w.path, mode: '100644', type: 'blob', content: w.content }))));
    const tree = await gh('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: commit.tree.sha, tree: [...blobs, ...deletes.map((path) => ({ path, mode: '100644', type: 'blob', sha: null }))] }),
    });
    const next = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
    await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: next.sha }) });
    return next.sha;
  },
};

// Local storage for development: reads and writes the working copy.
const local = {
  async head() { return 'local'; },
  async snapshot() {
    const files = {};
    files['content/site.json'] = await readFile(join(ROOT, 'content/site.json'), 'utf8');
    for (const f of await readdir(join(ROOT, 'content/pages'))) {
      if (f.endsWith('.json')) files[`content/pages/${f}`] = await readFile(join(ROOT, 'content/pages', f), 'utf8');
    }
    const images = [];
    const walk = async (dir) => {
      for (const e of await readdir(join(ROOT, dir), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) await walk(p);
        else if (/\.(jpg|jpeg|png|webp|svg)$/i.test(e.name)) images.push(p);
      }
    };
    await walk('assets/img');
    return { files, images, paths: [] };
  },
  async changedSince() { return []; },
  async commit({ writes, deletes }) {
    for (const w of writes) {
      await mkdir(dirname(join(ROOT, w.path)), { recursive: true });
      await writeFile(join(ROOT, w.path), w.encoding === 'base64' ? Buffer.from(w.content, 'base64') : w.content);
    }
    for (const d of deletes) await unlink(join(ROOT, d)).catch(() => {});
    return 'local';
  },
};

// On Vercel without a GitHub token: read the published content from the website itself (read-only).
const remote = (origin) => ({
  async head() { return 'site'; },
  async snapshot() {
    const get = async (path) => {
      const res = await fetch(`${origin}/${path}`, { cache: 'no-store' });
      if (!res.ok) throw Object.assign(new Error(`Could not read ${path} from the website (${res.status}).`), { status: 502 });
      return res.text();
    };
    const manifest = JSON.parse(await get('content/manifest.json'));
    const files = { 'content/site.json': await get('content/site.json') };
    await Promise.all(manifest.pages.map(async (f) => { files[contentPath(f)] = await get(contentPath(f)); }));
    return { files, images: manifest.images || [], paths: [] };
  },
  async changedSince() { return []; },
  async commit() {
    throw Object.assign(new Error('Publishing is not switched on yet. Add GITHUB_TOKEN in Vercel → Settings → Environment Variables, then redeploy.'), { status: 503 });
  },
});

const originOf = (req) => `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
export const storage = (req) => (TOKEN ? github : process.env.VERCEL ? remote(originOf(req)) : local);
export const isLocal = () => !TOKEN && !process.env.VERCEL;
export const isReadOnly = () => !TOKEN && Boolean(process.env.VERCEL);

// List of pages and images, published with the site so the admin can read it without GitHub.
export function manifest(pages, images) {
  return `${JSON.stringify({ pages: pages.map((p) => p.file).sort(), images: [...new Set(images)].sort() }, null, 2)}\n`;
}

export function parseSnapshot(files) {
  const site = JSON.parse(files['content/site.json']);
  const pages = Object.entries(files).filter(([p]) => p.startsWith('content/pages/')).map(([, v]) => JSON.parse(v));
  return { site, pages };
}

/**
 * Applies the admin's changes on top of the latest content, renders every page and commits it all at once.
 * changes: { site?, pages: { [file]: pageData }, deleted: [file], uploads: [{ path, base64 }] }
 */
export async function publish({ base, message, changes }, req) {
  const store = storage(req);
  const head = await store.head();
  const touched = [
    ...(changes.site ? ['content/site.json'] : []),
    ...Object.keys(changes.pages || {}).map(contentPath),
    ...(changes.deleted || []).map(contentPath),
  ];
  if (base && base !== head) {
    const changed = await store.changedSince(base, head);
    const overlap = touched.filter((p) => changed.includes(p));
    if (overlap.length) {
      throw Object.assign(new Error('Someone else published changes to the same pages after you opened the editor.'), { status: 409, overlap });
    }
  }

  const snap = await store.snapshot(head);
  const { site: currentSite, pages: currentPages } = parseSnapshot(snap.files);
  const site = changes.site || currentSite;
  checkStrings(site, 'Site-wide settings');
  const byFile = new Map(currentPages.map((p) => [p.file, p]));
  for (const [file, page] of Object.entries(changes.pages || {})) {
    validatePage(page);
    if (page.file !== file) throw Object.assign(new Error('Page address mismatch.'), { status: 400 });
    byFile.set(file, page);
  }
  for (const file of changes.deleted || []) {
    const p = byFile.get(file);
    if (!p || !['solution', 'case'].includes(p.kind)) throw Object.assign(new Error(`“${file}” cannot be deleted.`), { status: 400 });
    byFile.delete(file);
  }
  const pages = [...byFile.values()];

  const uploads = (changes.uploads || []).map((u) => {
    if (!UPLOAD_PATH.test(u.path)) throw Object.assign(new Error(`Invalid image name “${u.path}”.`), { status: 400 });
    return { path: u.path, content: u.base64, encoding: 'base64' };
  });

  const writes = [
    ...(changes.site ? [{ path: 'content/site.json', content: `${JSON.stringify(site, null, 2)}\n` }] : []),
    ...Object.values(changes.pages || {}).map((p) => ({ path: contentPath(p.file), content: `${JSON.stringify(p, null, 2)}\n` })),
    ...renderSite(site, pages).map(({ file, html }) => ({ path: file, content: html })),
    ...uploads,
    { path: 'content/manifest.json', content: manifest(pages, [...snap.images, ...uploads.map((u) => u.path)]) },
  ];
  const deletes = (changes.deleted || []).flatMap((f) => [contentPath(f), f]);
  const sha = await store.commit({ head, writes, deletes, message: message || 'Update content from the admin panel' });
  return { sha, files: writes.length + deletes.length };
}

export async function handle(res, fn) {
  try {
    await fn();
  } catch (err) {
    send(res, err.status || 500, { error: err.message || 'Server error', overlap: err.overlap });
  }
}
