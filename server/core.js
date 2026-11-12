// The admin API and the contact form endpoint, written once for every host:
// Cloudflare Workers (worker.js), Vercel functions (api/*.js) and the local dev server (serve.mjs).
// Uses only web standards (Request, Response, fetch, Web Crypto), so it runs everywhere.
//
// Environment variables:
//   ADMIN_PASSWORD   shared admin password (required for the admin)
//   GITHUB_TOKEN     fine-grained token, "Contents: Read and write" on the repository (publishing)
//   GITHUB_REPO      owner/name of the repository
//   GITHUB_BRANCH    default main
//   RESEND_API_KEY   key from resend.com (sending form submissions by email)
//   MAIL_FROM        sender, e.g. "INPUT SOFT website <website@inputsoft.net>" (domain verified in Resend)
import { renderSite } from '../lib/render.js';
import { manifest } from '../lib/manifest.js';
import { sendLeadEmail, sendTestEmail, isEmail, mailStatus } from './mail.js';

const SESSION_HOURS = 12;
const enc = new TextEncoder();

/* ----------------------------------------------------------------- helpers */
export const fail = (status, message, extra) => Object.assign(new Error(message), { status, ...extra });
const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export const base64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
const b64url = (bytes) => bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => base64ToText(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}

// Compares two strings in constant time (via their HMACs, so lengths do not leak either).
async function same(a, b) {
  const [x, y] = await Promise.all([hmac('cmp', String(a)), hmac('cmp', String(b))]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/* -------------------------------------------------------------- validation */
const PAGE_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/;
const UPLOAD_PATH = /^assets\/img\/uploads\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp)$/;
const KINDS = ['home', 'solution', 'case', 'legal'];
const UNSAFE = /<\s*(script|iframe|object|embed|style|form|meta|link)\b|javascript:|\son[a-z]+\s*=/i;

export const contentPath = (file) => `content/pages/${file.replace(/\.html$/, '')}.json`;
export const FORMS_PATH = 'content/forms.json';

function checkStrings(v, where) {
  if (typeof v === 'string') {
    if (UNSAFE.test(v)) throw fail(400, `“${where}” contains code that is not allowed (scripts, frames or event handlers).`);
  } else if (Array.isArray(v)) v.forEach((x) => checkStrings(x, where));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => checkStrings(x, where));
}

function validatePage(page) {
  if (!page || !KINDS.includes(page.kind)) throw fail(400, 'Unknown page type.');
  if (!PAGE_FILE.test(page.file || '')) throw fail(400, `Invalid page address “${page.file}”. Use lowercase letters, numbers and dashes.`);
  if (page.kind === 'home' && page.file !== 'index.html') throw fail(400, 'The home page must stay index.html.');
  checkStrings(page, page.file);
}

export function validateForms(forms) {
  const recipients = (forms && Array.isArray(forms.recipients) ? forms.recipients : []).map((r) => String(r).trim()).filter(Boolean);
  if (!recipients.length) throw fail(400, 'Add at least one email address for form submissions.');
  if (recipients.length > 10) throw fail(400, 'Use at most 10 email addresses for form submissions.');
  const bad = recipients.find((r) => !isEmail(r));
  if (bad) throw fail(400, `“${bad}” is not a valid email address.`);
  const subject = String(forms.subject || '').trim().slice(0, 120);
  checkStrings(subject, 'Email subject');
  return { recipients, subject: subject || 'New request from inputsoft.net' };
}

export function parseSnapshot(files) {
  const site = JSON.parse(files['content/site.json']);
  const pages = Object.entries(files).filter(([p]) => p.startsWith('content/pages/')).map(([, v]) => JSON.parse(v));
  const forms = files[FORMS_PATH] ? JSON.parse(files[FORMS_PATH]) : { recipients: [], subject: '' };
  return { site, pages, forms };
}

/* --------------------------------------------------------------------- api */
/**
 * @param {object} o
 * @param {object} o.env       environment variables
 * @param {object} o.store     content storage: github, local files or read-only
 * @param {'github'|'local'|'readonly'} o.mode
 * @param {() => Promise<object>} o.readForms  reads the published form settings (for the contact form)
 */
export function createApi({ env, store, mode, readForms }) {
  const secret = () => {
    if (!env.ADMIN_PASSWORD) throw fail(500, 'The admin password is not set up on the server yet (ADMIN_PASSWORD).');
    return `inputsoft-admin:${env.ADMIN_PASSWORD}`;
  };

  async function issueToken() {
    const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600e3 })));
    return `${payload}.${b64url(await hmac(secret(), payload))}`;
  }

  async function requireAuth(request) {
    const m = /^Bearer (.+)$/.exec(request.headers.get('authorization') || '');
    const [payload, sig] = (m ? m[1] : '').split('.');
    let ok = false;
    if (payload && sig && (await same(sig, b64url(await hmac(secret(), payload))))) {
      try { ok = JSON.parse(fromB64url(payload)).exp > Date.now(); } catch { ok = false; }
    }
    if (!ok) throw fail(401, 'Your session has expired. Please sign in again.');
  }

  const body = async (request) => {
    try { return await request.json(); } catch { throw fail(400, 'Invalid request.'); }
  };

  const routes = {
    async 'POST login'(request) {
      const { password } = await body(request);
      secret();
      if (!(await same(password || '', env.ADMIN_PASSWORD))) {
        await wait(900); // slow down guessing
        throw fail(401, 'Wrong password.');
      }
      return { token: await issueToken(), local: mode === 'local' };
    },

    async 'GET content'(request) {
      await requireAuth(request);
      const head = await store.head();
      const snap = await store.snapshot(head);
      const { site, pages, forms } = parseSnapshot(snap.files);
      return {
        head, site, pages, forms,
        images: snap.images.sort(),
        local: mode === 'local',
        readOnly: mode === 'readonly',
        mail: mailStatus(env),
      };
    },

    async 'POST publish'(request) {
      await requireAuth(request);
      return { ...(await publish(await body(request))), local: mode === 'local' };
    },

    // Public: the contact and demo forms on the website.
    async 'POST lead'(request) {
      const data = await body(request);
      const forms = validateForms(await readForms());
      const result = await sendLeadEmail({ env, forms, data, request, local: mode === 'local' });
      return { ok: true, ...result };
    },

    // Admin: send a test email to the addresses typed in the admin (before publishing them).
    async 'POST lead-test'(request) {
      await requireAuth(request);
      const forms = validateForms((await body(request)).forms);
      return { ok: true, ...(await sendTestEmail({ env, forms, local: mode === 'local' })) };
    },
  };

  /**
   * Applies the admin's changes on top of the latest content, renders every page and commits it all at once.
   * changes: { site?, forms?, pages: { [file]: pageData }, deleted: [file], uploads: [{ path, base64 }] }
   */
  async function publish({ base, message, changes }) {
    const head = await store.head();
    const touched = [
      ...(changes.site ? ['content/site.json'] : []),
      ...(changes.forms ? [FORMS_PATH] : []),
      ...Object.keys(changes.pages || {}).map(contentPath),
      ...(changes.deleted || []).map(contentPath),
    ];
    if (base && base !== head) {
      const changed = await store.changedSince(base, head);
      const overlap = touched.filter((p) => changed.includes(p));
      if (overlap.length) throw fail(409, 'Someone else published changes to the same pages after you opened the editor.', { overlap });
    }

    const snap = await store.snapshot(head);
    const current = parseSnapshot(snap.files);
    const site = changes.site || current.site;
    checkStrings(site, 'Site-wide settings');
    const forms = changes.forms ? validateForms(changes.forms) : null;
    const byFile = new Map(current.pages.map((p) => [p.file, p]));
    for (const [file, page] of Object.entries(changes.pages || {})) {
      validatePage(page);
      if (page.file !== file) throw fail(400, 'Page address mismatch.');
      byFile.set(file, page);
    }
    for (const file of changes.deleted || []) {
      const p = byFile.get(file);
      if (!p || !['solution', 'case'].includes(p.kind)) throw fail(400, `“${file}” cannot be deleted.`);
      byFile.delete(file);
    }
    const pages = [...byFile.values()];

    const uploads = (changes.uploads || []).map((u) => {
      if (!UPLOAD_PATH.test(u.path)) throw fail(400, `Invalid image name “${u.path}”.`);
      return { path: u.path, content: u.base64, encoding: 'base64' };
    });

    const writes = [
      ...(changes.site ? [{ path: 'content/site.json', content: `${JSON.stringify(site, null, 2)}\n` }] : []),
      ...(forms ? [{ path: FORMS_PATH, content: `${JSON.stringify(forms, null, 2)}\n` }] : []),
      ...Object.values(changes.pages || {}).map((p) => ({ path: contentPath(p.file), content: `${JSON.stringify(p, null, 2)}\n` })),
      ...renderSite(site, pages).map(({ file, html }) => ({ path: file, content: html })),
      ...uploads,
      { path: 'content/manifest.json', content: manifest(pages, [...snap.images, ...uploads.map((u) => u.path)]) },
    ];
    const deletes = (changes.deleted || []).flatMap((f) => [contentPath(f), f]);
    const sha = await store.commit({ head, writes, deletes, message: message || 'Update content from the admin panel' });
    return { sha, files: writes.length + deletes.length };
  }

  return {
    /** Handles /api/<name>. Returns a Response. */
    async handle(request) {
      const name = new URL(request.url).pathname.replace(/^\/api\//, '').replace(/\/$/, '');
      const route = routes[`${request.method} ${name}`];
      if (!route) return routes[`POST ${name}`] || routes[`GET ${name}`] ? json(405, { error: 'Method not allowed' }) : json(404, { error: 'Not found' });
      try {
        return json(200, await route(request));
      } catch (err) {
        if (!err.status) console.error(err);
        return json(err.status || 500, { error: err.message || 'Server error', overlap: err.overlap });
      }
    },
  };
}
