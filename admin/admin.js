// INPUT SOFT admin panel.
// Edits content/*.json, previews pages with the same renderer the site uses (lib/render.js)
// and publishes through /api/publish, which commits to GitHub so Vercel redeploys the site.
import { renderPage, ICONS, CONTENT_ICONS, THEMES } from '/lib/render.js';
import { PAGE_SCHEMAS, SITE_PARTS, emptyItem, getPath, setPath } from '/admin/schema.js';

/* ================================================================ helpers */
const $ = (s, r = document) => r.querySelector(s);
const clone = (o) => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const DRAFT_KEY = 'inputsoft-admin-draft';
const TOKEN_KEY = 'inputsoft-admin-token';
const DEVICES = { desktop: 1440, tablet: 834, phone: 390 };

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const svg = (name, cls = 'i') => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', cls);
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || UI_ICONS[name] || '';
  return s;
};

const UI_ICONS = {
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  tablet: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
};

/* ================================================================== state */
const S = {
  token: sessionStorage.getItem(TOKEN_KEY),
  head: null,
  local: false,
  base: { site: null, pages: new Map() },
  site: null,
  pages: new Map(),
  deleted: new Set(),
  uploads: new Map(),
  images: [],
  view: { type: 'page', file: 'index.html' },
  open: new Set(),
  expanded: new Set(),
  device: 'desktop',
  previewFile: 'index.html',
  scroll: {},
};

const allPages = () => [...S.pages.values()];
const pagesOf = (kind) => allPages().filter((p) => p.kind === kind).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || pageName(a).localeCompare(pageName(b)));
const pageName = (p) => {
  if (!p) return '';
  if (p.kind === 'home') return 'Home page';
  if (p.kind === 'solution') return p.menu?.title || p.hero?.title || p.file;
  if (p.kind === 'case') return p.menu?.title || p.profile?.company || p.file;
  return p.title || p.file;
};
const isNew = (file) => !S.base.pages.has(file);
const pageDirty = (file) => isNew(file) || !same(S.base.pages.get(file), S.pages.get(file));
const siteDirty = () => !same(S.base.site, S.site);
const changes = () => {
  const list = [];
  if (siteDirty()) list.push({ label: 'Site-wide settings', note: 'header, contact block or footer' });
  for (const p of allPages()) if (pageDirty(p.file)) list.push({ label: pageName(p), note: isNew(p.file) ? 'new page' : 'edited', file: p.file });
  for (const f of S.deleted) list.push({ label: pageName(S.base.pages.get(f)), note: 'deleted', file: f });
  return list;
};

/* ==================================================================== api */
async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch(`/api/${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}) },
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection and try again.');
  }
  let data = {};
  try { data = await res.json(); } catch { /* not JSON */ }
  if (res.status === 401 && path !== 'login') {
    S.token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    await showLogin(data.error);
    return api(path, opts);
  }
  if (res.status === 404 && !data.error) throw new Error('The admin server is not available here.');
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status}).`), { status: res.status, data });
  return data;
}

/* ================================================================= toasts */
function toast(text, kind = 'info', action) {
  const box = $('.toasts') || document.body.appendChild(h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }));
  const el = h('div', { class: `toast toast--${kind}` }, h('span', null, text), action ? h('a', { href: action.href, target: '_blank', rel: 'noopener', class: 'toast__action' }, action.text) : null);
  box.append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, kind === 'error' ? 9000 : 5000);
}

/* ================================================================= dialog */
function dialog({ title, body, actions, wide }) {
  return new Promise((resolve) => {
    const close = (v) => { wrap.classList.remove('is-open'); setTimeout(() => wrap.remove(), 200); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    const wrap = h('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'dlg__backdrop', onclick: () => close(null) }),
      h('div', { class: `dlg__box${wide ? ' dlg__box--wide' : ''}` },
        h('h2', { class: 'dlg__title' }, title),
        h('div', { class: 'dlg__body' }, body),
        h('div', { class: 'dlg__actions' }, actions.map((a) => h('button', {
          class: `btn ${a.primary ? 'btn--primary' : a.danger ? 'btn--danger' : 'btn--ghost'}`,
          type: 'button',
          onclick: async (e) => {
            if (!a.run) return close(a.value);
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.classList.add('is-busy');
            try {
              const v = await a.run();
              if (v !== false) close(v ?? a.value);
            } finally {
              btn.disabled = false;
              btn.classList.remove('is-busy');
            }
          },
        }, a.text)))));
    document.body.append(wrap);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      wrap.classList.add('is-open');
      const first = wrap.querySelector('input, select, textarea, .btn--primary');
      if (first) first.focus();
    });
  });
}

const confirmDialog = (title, text, okText = 'Delete') => dialog({ title, body: h('p', null, text), actions: [{ text: 'Cancel', value: false }, { text: okText, danger: true, value: true }] });

/* ================================================================== login */
function showLogin(message) {
  return new Promise((resolve) => {
    const err = h('p', { class: 'login__error', role: 'alert' }, message || '');
    const input = h('input', { class: 'input', type: 'password', id: 'login-pw', autocomplete: 'current-password', required: true });
    const btn = h('button', { class: 'btn btn--primary btn--block', type: 'submit' }, 'Sign in');
    const form = h('form', {
      class: 'login__card',
      onsubmit: async (e) => {
        e.preventDefault();
        err.textContent = '';
        btn.disabled = true;
        btn.classList.add('is-busy');
        try {
          const { token } = await api('login', { method: 'POST', body: JSON.stringify({ password: input.value }) });
          S.token = token;
          sessionStorage.setItem(TOKEN_KEY, token);
          screen.remove();
          resolve();
        } catch (ex) {
          err.textContent = ex.message;
          input.select();
        } finally {
          btn.disabled = false;
          btn.classList.remove('is-busy');
        }
      },
    },
    h('img', { src: '/assets/img/brand/logo-white.png', alt: 'INPUT SOFT', class: 'login__logo', width: 148, height: 15 }),
    h('h1', { class: 'login__title' }, 'Website admin'),
    h('p', { class: 'login__text' }, 'Sign in to edit the pages of inputsoft.net.'),
    h('label', { class: 'field__label', for: 'login-pw' }, 'Password'),
    input, err, btn);
    const screen = h('div', { class: 'login' }, form);
    document.body.append(screen);
    input.focus();
  });
}

/* ================================================================== drafts */
let draftTimer;
let draftWarned = false;
function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const pages = {};
    for (const p of allPages()) if (pageDirty(p.file)) pages[p.file] = p;
    const empty = !siteDirty() && !Object.keys(pages).length && !S.deleted.size;
    try {
      if (empty) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ head: S.head, site: siteDirty() ? S.site : null, pages, deleted: [...S.deleted], uploads: [...S.uploads] }));
    } catch {
      if (!draftWarned) toast('Your changes are too large to keep as a draft in this browser. Publish soon so they are not lost.', 'error');
      draftWarned = true;
    }
  }, 400);
}

function restoreDraft() {
  let d;
  try { d = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { d = null; }
  if (!d) return false;
  if (d.site) S.site = d.site;
  for (const [file, p] of Object.entries(d.pages || {})) S.pages.set(file, p);
  for (const f of d.deleted || []) { S.deleted.add(f); S.pages.delete(f); }
  for (const [k, v] of d.uploads || []) S.uploads.set(k, v);
  return changes().length > 0;
}

/* ================================================================== load */
async function load() {
  const data = await api('content');
  S.head = data.head;
  S.local = data.local;
  S.images = data.images || [];
  S.base = { site: clone(data.site), pages: new Map(data.pages.map((p) => [p.file, clone(p)])) };
  S.site = clone(data.site);
  S.pages = new Map(data.pages.map((p) => [p.file, clone(p)]));
  S.deleted = new Set();
  S.uploads = new Map();
  if (restoreDraft()) toast('Restored your unpublished changes from last time.');
  if (S.view.type === 'page' && !S.pages.has(S.view.file)) S.view = { type: 'page', file: 'index.html' };
}

/* ================================================================= layout */
const app = {};

function buildApp() {
  document.body.innerHTML = '';
  app.status = h('span', { class: 'topbar__status' });
  app.publish = h('button', { class: 'btn btn--primary', type: 'button', onclick: openPublish }, 'Publish');
  app.sidebar = h('nav', { class: 'sidebar', 'aria-label': 'Pages' });
  app.editor = h('main', { class: 'editor', id: 'editor' });
  app.frames = [h('iframe', { class: 'preview__frame is-active', title: 'Page preview' }), h('iframe', { class: 'preview__frame', title: 'Page preview', tabindex: '-1' })];
  app.active = 0;
  app.frameWrap = h('div', { class: 'preview__wrap' }, app.frames);
  app.stage = h('div', { class: 'preview__stage' }, app.frameWrap);
  app.previewError = h('div', { class: 'preview__error', hidden: true });
  app.previewTitle = h('span', { class: 'preview__title' });
  app.devices = h('div', { class: 'seg', role: 'group', 'aria-label': 'Preview size' }, Object.keys(DEVICES).map((d) => h('button', {
    class: `seg__btn${S.device === d ? ' is-active' : ''}`, type: 'button', 'aria-pressed': String(S.device === d), title: `${d[0].toUpperCase()}${d.slice(1)} (${DEVICES[d]}px)`,
    onclick: () => { S.device = d; [...app.devices.children].forEach((b) => { const on = b.title.toLowerCase().startsWith(d); b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); }); fitPreview(); },
  }, svg(d), h('span', { class: 'sr-only' }, d))));

  const top = h('header', { class: 'topbar' },
    h('button', { class: 'icon-btn topbar__menu', type: 'button', 'aria-label': 'Show pages', onclick: () => document.body.classList.toggle('show-sidebar') }, svg('sidebar')),
    h('a', { class: 'topbar__brand', href: '/', target: '_blank', rel: 'noopener', title: 'Open the website' },
      h('img', { src: '/assets/img/brand/logo-white.png', alt: 'INPUT SOFT', width: 120, height: 12 }),
      h('span', { class: 'topbar__tag' }, 'Admin')),
    S.local ? h('span', { class: 'badge badge--local', title: 'Publishing writes the files on this computer instead of GitHub.' }, 'Local mode') : null,
    h('div', { class: 'topbar__spacer' }),
    app.status,
    app.publish,
    h('button', { class: 'icon-btn', type: 'button', title: 'Sign out', 'aria-label': 'Sign out', onclick: signOut }, svg('logout')));

  const preview = h('section', { class: 'preview', 'aria-label': 'Live preview' },
    h('div', { class: 'preview__bar' },
      h('span', { class: 'preview__label' }, 'Preview'), app.previewTitle,
      h('div', { class: 'topbar__spacer' }),
      app.devices,
      h('button', { class: 'icon-btn', type: 'button', title: 'Open the preview in a new tab', 'aria-label': 'Open the preview in a new tab', onclick: openPreviewTab }, svg('external'))),
    app.stage, app.previewError);

  document.body.append(top, h('div', { class: 'workspace' }, app.sidebar, app.editor, preview));
  document.body.classList.add('is-app');
  new ResizeObserver(fitPreview).observe(app.stage);
  window.addEventListener('message', onPreviewMessage);
  window.addEventListener('beforeunload', (e) => { if (changes().length) { saveDraft(); e.preventDefault(); } });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (changes().length) openPublish(); }
  });
}

function signOut() {
  sessionStorage.removeItem(TOKEN_KEY);
  location.reload();
}

function refreshChrome() {
  const n = changes().length;
  app.status.textContent = n ? `${n} unpublished ${n === 1 ? 'change' : 'changes'}` : 'Everything is published';
  app.status.classList.toggle('is-dirty', n > 0);
  app.publish.disabled = !n;
  renderSidebar();
}

/* ================================================================ sidebar */
function navItem({ label, meta, active, dirty, onclick }) {
  return h('button', { class: `nav-item${active ? ' is-active' : ''}`, type: 'button', 'aria-current': active ? 'page' : null, onclick },
    h('span', { class: 'nav-item__text' }, h('span', { class: 'nav-item__label' }, label), meta ? h('span', { class: 'nav-item__meta' }, meta) : null),
    dirty ? h('span', { class: 'dot', title: 'Unpublished changes' }) : null);
}

function renderSidebar() {
  const isPage = (f) => S.view.type === 'page' && S.view.file === f;
  const pageItem = (p) => navItem({
    label: pageName(p),
    meta: isNew(p.file) ? 'New page' : p.showInMenu === false ? 'Not in menu' : null,
    active: isPage(p.file),
    dirty: pageDirty(p.file),
    onclick: () => go({ type: 'page', file: p.file }),
  });
  const group = (title, items, add) => h('div', { class: 'nav-group' },
    h('p', { class: 'nav-group__title' }, title), items,
    add ? h('button', { class: 'nav-add', type: 'button', onclick: add.run }, svg('plus'), add.text) : null);
  app.sidebar.replaceChildren(
    group('Main', pagesOf('home').map(pageItem)),
    group('Solutions', pagesOf('solution').map(pageItem), { text: 'New solution page', run: () => newPage('solution') }),
    group('Case studies', pagesOf('case').map(pageItem), { text: 'New case study', run: () => newPage('case') }),
    group('Company and legal', pagesOf('legal').map(pageItem)),
    group('On every page', SITE_PARTS.map((part) => navItem({
      label: part.title,
      meta: part.desc,
      active: S.view.type === 'site' && S.view.part === part.id,
      dirty: !same(getPath(S.base.site, part.path.join('.')), getPath(S.site, part.path.join('.'))),
      onclick: () => go({ type: 'site', part: part.id }),
    }))),
  );
}

function go(view) {
  S.view = view;
  document.body.classList.remove('show-sidebar');
  if (view.type === 'page') S.previewFile = view.file;
  renderSidebar();
  renderEditor();
  app.editor.scrollTop = 0;
  refreshPreview(true);
}

/* ================================================================= editor */
const viewKey = () => (S.view.type === 'page' ? S.view.file : `site:${S.view.part}`);

function renderEditor() {
  const keepScroll = app.editor.scrollTop;
  if (S.view.type === 'site') renderSitePart();
  else renderPageEditor();
  app.editor.scrollTop = keepScroll;
}

function changed() {
  refreshChrome();
  saveDraft();
  schedulePreview();
}

function renderPageEditor() {
  const page = S.pages.get(S.view.file);
  if (!page) return;
  const schema = PAGE_SCHEMAS[page.kind];
  const removable = page.kind === 'solution' || page.kind === 'case';
  const head = h('div', { class: 'editor__head' },
    h('p', { class: 'editor__kind' }, { home: 'Home page', solution: 'Solution page', case: 'Case study', legal: 'Company and legal' }[page.kind]),
    h('h1', { class: 'editor__title' }, pageName(page)),
    h('div', { class: 'editor__meta' },
      h('span', { class: 'chip' }, `/${page.file === 'index.html' ? '' : page.file}`),
      isNew(page.file)
        ? h('span', { class: 'chip chip--accent' }, 'Not published yet')
        : h('a', { class: 'link-btn', href: `/${page.file}`, target: '_blank', rel: 'noopener' }, 'View live page', svg('external'))),
    h('div', { class: 'editor__actions' },
      pageDirty(page.file) && !isNew(page.file) ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => revertPage(page.file) }, svg('undo'), 'Undo all changes') : null,
      removable ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => newPage(page.kind, page.file) }, svg('copy'), 'Duplicate') : null,
      removable ? h('button', { class: 'btn btn--ghost btn--sm btn--danger-text', type: 'button', onclick: () => deletePage(page.file) }, svg('trash'), 'Delete page') : null));

  const cards = schema.map((sec) => {
    const target = sec.path.length ? getPath(page, sec.path.join('.')) : page;
    return sectionCard(sec, target || {}, `${viewKey()}#${sec.id}`);
  });
  app.editor.replaceChildren(head, h('div', { class: 'sections' }, cards));
}

function renderSitePart() {
  const part = SITE_PARTS.find((p) => p.id === S.view.part);
  const target = getPath(S.site, part.path.join('.'));
  const key = `${viewKey()}#${part.id}`;
  S.open.add(key);
  app.editor.replaceChildren(
    h('div', { class: 'editor__head' },
      h('p', { class: 'editor__kind' }, 'On every page'),
      h('h1', { class: 'editor__title' }, part.title),
      h('p', { class: 'editor__desc' }, part.desc),
      part.note ? h('p', { class: 'note' }, part.note) : null,
      !same(getPath(S.base.site, part.path.join('.')), target) ? h('div', { class: 'editor__actions' }, h('button', {
        class: 'btn btn--ghost btn--sm', type: 'button',
        onclick: () => { setPath(S.site, part.path.join('.'), clone(getPath(S.base.site, part.path.join('.')))); renderEditor(); changed(); },
      }, svg('undo'), 'Undo all changes')) : null),
    h('div', { class: 'sections' }, h('div', { class: 'card card--flat' }, fields(part.fields, target, key))));
}

function sectionCard(sec, target, key) {
  const open = S.open.has(key);
  const body = h('div', { class: 'card__body', hidden: !open }, open ? fields(sec.fields, target, key) : null);
  const btn = h('button', {
    class: 'card__head', type: 'button', 'aria-expanded': String(open),
    onclick: () => {
      const now = !S.open.has(key);
      if (now) S.open.add(key); else S.open.delete(key);
      btn.setAttribute('aria-expanded', String(now));
      card.classList.toggle('is-open', now);
      body.hidden = !now;
      if (now && !body.childElementCount) body.append(fields(sec.fields, target, key));
      if (now) scrollPreviewTo(sec.id);
    },
  },
  h('span', { class: 'card__titles' }, h('span', { class: 'card__title' }, sec.title), h('span', { class: 'card__desc' }, sec.desc)),
  svg('chevron-down', 'i card__chev'));
  const card = h('section', { class: `card${open ? ' is-open' : ''}`, 'data-section': sec.id }, btn, body);
  return card;
}

/* ================================================================= fields */
function fields(list, obj, key) {
  return h('div', { class: 'fields' }, list.filter((f) => !f.showIf || f.showIf(obj)).map((f) => field(f, obj, `${key}.${f.key}`)));
}

let uid = 0;
const nextId = () => `f${++uid}`;

function wrapField(f, id, control, extra) {
  return h('div', { class: `field field--${f.type}` },
    f.label ? h('label', { class: 'field__label', for: id }, f.label) : null,
    control,
    f.help ? h('p', { class: 'field__help' }, f.help) : null,
    extra || null);
}

// Text with <br> is shown with real line breaks.
const toEditor = (v) => String(v ?? '').replace(/<br>/g, '\n');
const fromEditor = (v) => v.replace(/\r?\n/g, '<br>');

function autosize(ta) {
  const fit = () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px`; };
  requestAnimationFrame(fit);
  ta.addEventListener('input', fit);
}

function field(f, obj, key) {
  const id = nextId();
  const get = () => getPath(obj, f.key);
  const set = (v, structural) => {
    setPath(obj, f.key, v);
    if (structural) renderEditor();
    changed();
  };

  switch (f.type) {
    case 'text':
    case 'link': {
      const input = h('input', { class: 'input', id, value: get() ?? '', placeholder: f.placeholder, list: f.type === 'link' ? 'link-targets' : null, oninput: (e) => set(e.target.value) });
      return wrapField(f, id, input);
    }
    case 'number': {
      const input = h('input', { class: 'input input--short', id, type: 'number', min: 1, value: get() ?? '', oninput: (e) => set(Number(e.target.value) || 0) });
      return wrapField(f, id, input);
    }
    case 'textarea':
    case 'rich': {
      const ta = h('textarea', { class: 'input', id, rows: f.rows || 3, placeholder: f.placeholder, oninput: (e) => set(fromEditor(e.target.value)) });
      ta.value = toEditor(get());
      autosize(ta);
      const tools = f.type === 'rich' ? h('div', { class: 'field__tools' }, h('button', {
        class: 'tool-btn', type: 'button', onclick: () => addLink(ta, (v) => set(fromEditor(v))),
      }, svg('link'), 'Add link to selected text')) : null;
      return wrapField(f, id, ta, tools);
    }
    case 'toggle': {
      const input = h('input', { class: 'switch', type: 'checkbox', id, checked: Boolean(get()), onchange: (e) => set(e.target.checked, true) });
      return h('div', { class: 'field field--toggle' }, h('label', { class: 'toggle', for: id }, input, h('span', { class: 'toggle__label' }, f.label)), f.help ? h('p', { class: 'field__help' }, f.help) : null);
    }
    case 'select':
    case 'theme':
    case 'formOption':
    case 'casePage': {
      const opts = f.type === 'theme' ? Object.entries(THEMES)
        : f.type === 'formOption' ? [['', 'None'], ...(S.site.contact?.form?.options || []).map((o) => [o, o])]
        : f.type === 'casePage' ? [['', 'Choose a case study'], ...pagesOf('case').map((p) => [p.file, pageName(p)])]
        : f.options;
      const sel = h('select', { class: 'input select', id, onchange: (e) => set(e.target.value, f.type === 'select') },
        opts.map(([v, l]) => h('option', { value: v, selected: (get() ?? '') === v }, l)));
      return wrapField(f, id, sel);
    }
    case 'tags': {
      const input = h('input', { class: 'input', id, value: (get() || []).join(', '), oninput: (e) => set(e.target.value.split(',').map((x) => x.trim()).filter(Boolean)) });
      return wrapField(f, id, input);
    }
    case 'icon':
      return wrapField(f, id, iconPicker(id, get(), (v) => set(v)));
    case 'image':
      return imageField(f, obj, key, id);
    case 'group': {
      if (get() == null) setPath(obj, f.key, emptyItem(f));
      return h('fieldset', { class: 'group' }, h('legend', { class: 'group__label' }, f.label), fields(f.fields, get(), key));
    }
    case 'list':
      return listField(f, obj, key);
    default:
      return h('p', null, `Unknown field type ${f.type}`);
  }
}

function addLink(ta, commit) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  const url = h('input', { class: 'input', id: 'link-url', placeholder: 'https:// or page.html', list: 'link-targets' });
  const text = h('input', { class: 'input', id: 'link-text', value: selected });
  dialog({
    title: 'Add a link',
    body: h('div', { class: 'fields' },
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'link-text' }, 'Link text'), text),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'link-url' }, 'Goes to'), url)),
    actions: [{ text: 'Cancel', value: null }, {
      text: 'Add link', primary: true,
      run: () => {
        if (!url.value.trim() || !text.value.trim()) return false;
        const external = /^https?:/.test(url.value.trim());
        const tag = `<a href="${url.value.trim().replace(/"/g, '&quot;')}"${external ? ' target="_blank" rel="noopener"' : ''}>${text.value}</a>`;
        ta.value = ta.value.slice(0, start) + tag + ta.value.slice(end);
        commit(ta.value);
        ta.dispatchEvent(new Event('input'));
        return true;
      },
    }],
  });
}

function iconPicker(id, value, onPick) {
  const label = h('span', null, value || 'Choose');
  const btn = h('button', { class: 'input icon-pick', id, type: 'button', 'aria-haspopup': 'true' }, value ? svg(value) : null, label);
  btn.addEventListener('click', () => {
    const pop = h('div', { class: 'icon-grid' }, CONTENT_ICONS.map((name) => h('button', {
      class: `icon-grid__btn${name === value ? ' is-active' : ''}`, type: 'button', title: name, 'aria-label': name,
      onclick: () => { onPick(name); value = name; btn.replaceChildren(svg(name), h('span', null, name)); close(); },
    }, svg(name))));
    const close = () => { pop.remove(); document.removeEventListener('mousedown', outside); };
    const outside = (e) => { if (!pop.contains(e.target) && e.target !== btn) close(); };
    btn.after(pop);
    setTimeout(() => document.addEventListener('mousedown', outside));
  });
  return btn;
}

/* ------------------------------------------------------------------ lists */
function summaryOf(item, spec, i) {
  let s = '';
  if (typeof item === 'string') s = item;
  else if (typeof spec.summary === 'function') s = spec.summary(item);
  else if (spec.summary) s = getPath(item, spec.summary);
  s = String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return s || `${spec.label || 'Item'} ${i + 1}`;
}

function listField(f, obj, key) {
  if (!Array.isArray(getPath(obj, f.key))) setPath(obj, f.key, []);
  const arr = getPath(obj, f.key);
  const spec = f.item;
  const primitive = Boolean(spec.type);
  const commit = () => { renderEditor(); changed(); };

  const rows = arr.map((item, i) => {
    const k = `${key}[${i}]`;
    if (primitive) {
      const id = nextId();
      let control;
      if (spec.type === 'text') control = h('input', { class: 'input', id, value: item, 'aria-label': `${spec.label} ${i + 1}`, oninput: (e) => { arr[i] = e.target.value; changed(); } });
      else {
        control = h('textarea', { class: 'input', id, rows: 2, 'aria-label': `${spec.label} ${i + 1}`, oninput: (e) => { arr[i] = fromEditor(e.target.value); changed(); } });
        control.value = toEditor(item);
        autosize(control);
      }
      return h('div', { class: 'row-simple' }, control, itemActions(arr, i, commit, true),
        spec.type === 'rich' ? h('div', { class: 'field__tools' }, h('button', { class: 'tool-btn', type: 'button', onclick: () => addLink(control, (v) => { arr[i] = fromEditor(v); changed(); }) }, svg('link'), 'Add link to selected text')) : null);
    }
    const open = S.expanded.has(k);
    const body = h('div', { class: 'item__body', hidden: !open }, open ? fields(spec.fields, item, k) : null);
    const head = h('div', { class: 'item__head' },
      h('button', {
        class: 'item__toggle', type: 'button', 'aria-expanded': String(open),
        onclick: () => {
          const now = !S.expanded.has(k);
          if (now) S.expanded.add(k); else S.expanded.delete(k);
          head.firstChild.setAttribute('aria-expanded', String(now));
          wrap.classList.toggle('is-open', now);
          body.hidden = !now;
          if (now && !body.childElementCount) body.append(fields(spec.fields, item, k));
        },
      }, h('span', { class: 'item__num' }, String(i + 1).padStart(2, '0')), h('span', { class: 'item__summary' }, summaryOf(item, spec, i)), svg('chevron-down', 'i item__chev')),
      itemActions(arr, i, commit, false, () => S.expanded.add(`${key}[${i + 1}]`)));
    const wrap = h('div', { class: `item${open ? ' is-open' : ''}` }, head, body);
    return wrap;
  });

  const canAdd = !f.max || arr.length < f.max;
  return h('div', { class: 'field field--list' },
    h('div', { class: 'list__head' }, h('span', { class: 'field__label' }, f.label), h('span', { class: 'list__count' }, String(arr.length))),
    f.help ? h('p', { class: 'field__help' }, f.help) : null,
    h('div', { class: 'list' }, rows),
    canAdd ? h('button', {
      class: 'add-btn', type: 'button',
      onclick: () => {
        arr.push(emptyItem(spec));
        if (!primitive) S.expanded.add(`${key}[${arr.length - 1}]`);
        commit();
      },
    }, svg('plus'), f.addLabel || 'Add item') : null);
}

function itemActions(arr, i, commit, compact, onDuplicate) {
  const btn = (icon, label, run, disabled, danger) => h('button', { class: `icon-btn icon-btn--sm${danger ? ' icon-btn--danger' : ''}`, type: 'button', title: label, 'aria-label': label, disabled, onclick: run }, svg(icon));
  return h('div', { class: `item__actions${compact ? ' item__actions--compact' : ''}` },
    btn('up', 'Move up', () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; commit(); }, i === 0),
    btn('down', 'Move down', () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; commit(); }, i === arr.length - 1),
    compact ? null : btn('copy', 'Duplicate', () => { arr.splice(i + 1, 0, clone(arr[i])); if (onDuplicate) onDuplicate(); commit(); }),
    btn('trash', 'Delete', async () => { if (await confirmDialog('Delete this item?', 'It is removed when you publish. You can undo by not publishing and choosing “Undo all changes”.')) { arr.splice(i, 1); commit(); } }, false, true));
}

/* ----------------------------------------------------------------- images */
const imgUrl = (src) => (S.uploads.has(src) ? S.uploads.get(src).url : src ? `/${src}` : '');

function imageField(f, obj, key, id) {
  if (f.key !== '.' && (getPath(obj, f.key) == null || typeof getPath(obj, f.key) !== 'object')) setPath(obj, f.key, { src: '', alt: '' });
  const im = getPath(obj, f.key);
  const apply = (next) => {
    im.src = next.src;
    if (!f.noSize) { im.w = next.w; im.h = next.h; } else { delete im.w; delete im.h; }
    renderEditor();
    changed();
  };
  const thumb = im.src ? h('img', { src: imgUrl(im.src), alt: '', loading: 'lazy' }) : h('span', { class: 'thumb__empty' }, svg('image'), 'No image');
  const fileInput = h('input', {
    type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'sr-only', id: `${id}-file`,
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        toast('Preparing the image…');
        apply(await processUpload(file));
        if (!im.alt) toast('Image added. Describe it in “Alt text” for accessibility and search engines.');
      } catch (ex) {
        toast(ex.message, 'error');
      }
    },
  });
  const alt = h('input', { class: 'input', id: `${id}-alt`, value: im.alt || '', placeholder: 'Describe what the image shows', oninput: (e) => { im.alt = e.target.value; changed(); } });
  return h('div', { class: 'field field--image' },
    f.label ? h('span', { class: 'field__label' }, f.label) : null,
    h('div', { class: 'imgbox' },
      h('div', { class: `thumb${f.noSize ? ' thumb--logo' : ''}` }, thumb),
      h('div', { class: 'imgbox__side' },
        h('p', { class: 'imgbox__path', title: im.src }, im.src ? im.src.split('/').pop() : 'Empty'),
        h('div', { class: 'imgbox__btns' },
          h('label', { class: 'btn btn--ghost btn--sm', for: `${id}-file` }, svg('upload'), 'Upload'),
          fileInput,
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => { const pick = await pickImage(); if (pick) apply(pick); } }, svg('image'), 'Library'),
          im.src && !f.required ? h('button', { class: 'btn btn--ghost btn--sm btn--danger-text', type: 'button', onclick: () => { im.src = ''; im.alt = ''; renderEditor(); changed(); } }, 'Remove') : null))),
    h('label', { class: 'field__label field__label--sub', for: `${id}-alt` }, 'Alt text'),
    alt,
    f.help ? h('p', { class: 'field__help' }, f.help) : null);
}

async function processUpload(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please use a JPG, PNG or WebP image.');
  const bmp = await createImageBitmap(file);
  const isPng = file.type === 'image/png';
  let maxW = isPng ? 1600 : 2400;
  let quality = 0.86;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let blob;
  let alpha = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxW / bmp.width);
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    if (attempt === 0 && isPng) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4 * 97) if (data[i] < 250) { alpha = true; break; }
    }
    const type = alpha ? 'image/png' : 'image/jpeg';
    blob = await new Promise((r) => canvas.toBlob(r, type, quality));
    if (blob.size < 1.2e6) break;
    maxW = Math.round(maxW * 0.8);
    quality = Math.max(0.7, quality - 0.05);
  }
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const name = `${slug(file.name.replace(/\.[^.]+$/, '')) || 'image'}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const path = `assets/img/uploads/${name}`;
  const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  S.uploads.set(path, { base64: url.split(',')[1], url, size: blob.size });
  return { src: path, w: canvas.width, h: canvas.height };
}

function pickImage() {
  const all = [...S.uploads.keys(), ...S.images.filter((p) => !/\/brand\/|\.svg$/.test(p))];
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Search images', 'aria-label': 'Search images' });
  const grid = h('div', { class: 'lib' });
  let resolveDlg;
  const draw = () => {
    const q = search.value.toLowerCase();
    grid.replaceChildren(...all.filter((p) => p.toLowerCase().includes(q)).slice(0, 120).map((p) => h('button', {
      class: 'lib__item', type: 'button', title: p,
      onclick: async (e) => {
        const im = e.currentTarget.querySelector('img');
        const done = () => resolveDlg({ src: p, w: im.naturalWidth || undefined, h: im.naturalHeight || undefined });
        if (im.complete) done(); else im.onload = done;
      },
    }, h('img', { src: imgUrl(p), alt: '', loading: 'lazy' }), h('span', null, p.split('/').pop()))));
  };
  search.addEventListener('input', draw);
  draw();
  const result = dialog({ title: 'Choose an image', wide: true, body: h('div', { class: 'lib-wrap' }, search, grid), actions: [{ text: 'Cancel', value: null }] });
  return new Promise((resolve) => {
    resolveDlg = (v) => { resolve(v); const d = document.querySelector('.dlg'); if (d) d.querySelector('.dlg__backdrop').click(); };
    result.then((v) => resolve(v));
  });
}

/* ============================================================= page admin */
function revertPage(file) {
  S.pages.set(file, clone(S.base.pages.get(file)));
  renderEditor();
  changed();
}

async function deletePage(file) {
  const p = S.pages.get(file);
  const ok = await confirmDialog(`Delete “${pageName(p)}”?`, isNew(file) ? 'This page has not been published yet. It will be removed.' : 'The page is removed from the website when you publish. Links to it from other pages will stop working, so check the home page and menus.');
  if (!ok) return;
  S.pages.delete(file);
  if (!isNew(file)) S.deleted.add(file);
  go({ type: 'page', file: 'index.html' });
  changed();
}

async function newPage(kind, fromFile) {
  const sources = pagesOf(kind);
  const label = kind === 'solution' ? 'solution page' : 'case study';
  const prefix = kind === 'case' ? 'case-study-' : '';
  const name = h('input', { class: 'input', id: 'np-name', placeholder: kind === 'solution' ? 'e.g. Turnaround Control' : 'e.g. Acme Ground Services' });
  const addr = h('input', { class: 'input', id: 'np-addr', placeholder: `${prefix}page-name` });
  const from = h('select', { class: 'input select', id: 'np-from' }, sources.map((p) => h('option', { value: p.file, selected: p.file === fromFile }, pageName(p))));
  const err = h('p', { class: 'login__error', role: 'alert' });
  let touched = false;
  name.addEventListener('input', () => { if (!touched) addr.value = prefix + slug(name.value); });
  addr.addEventListener('input', () => { touched = true; });
  const file = await dialog({
    title: fromFile ? `Duplicate “${pageName(S.pages.get(fromFile))}”` : `New ${label}`,
    body: h('div', { class: 'fields' },
      h('p', { class: 'note' }, `The new page starts as a copy of an existing ${label}, so it has the same sections. Change the texts and pictures, then switch on “Show in menu” in Page settings when it is ready.`),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'np-name' }, kind === 'solution' ? 'Solution name' : 'Client name'), name),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'np-from' }, 'Start from'), from),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'np-addr' }, 'Page address'), h('div', { class: 'addr' }, h('span', null, 'inputsoft.net/'), addr, h('span', null, '.html'))),
      err),
    actions: [{ text: 'Cancel', value: null }, {
      text: 'Create page', primary: true,
      run: () => {
        const n = name.value.trim();
        const f = `${slug(addr.value)}.html`;
        if (!n) { err.textContent = 'Please enter a name.'; return false; }
        if (f === '.html' || !/^[a-z0-9]+(-[a-z0-9]+)*\.html$/.test(f)) { err.textContent = 'Use lowercase letters, numbers and dashes in the address.'; return false; }
        if (S.pages.has(f) || S.base.pages.has(f) || f === 'index.html') { err.textContent = 'A page with this address already exists.'; return false; }
        const copy = clone(S.pages.get(from.value));
        copy.file = f;
        copy.showInMenu = false;
        copy.order = Math.max(0, ...pagesOf(kind).map((p) => p.order || 0)) + 1;
        copy.menu = { ...(copy.menu || {}), title: n };
        copy.seo = { ...(copy.seo || {}), title: `${n} | INPUT SOFT` };
        if (kind === 'solution') { copy.hero.title = n; copy.formOption = ''; }
        if (kind === 'case') { copy.profile.company = n; copy.title = `How ${n} …`; }
        S.pages.set(f, copy);
        return f;
      },
    }],
  });
  if (!file) return;
  S.open.add(`${file}#settings`);
  go({ type: 'page', file });
  changed();
  toast('Page created. Edit it, then publish when it is ready.');
}

/* =============================================================== publish */
async function openPublish() {
  const list = changes();
  if (!list.length) return;
  const uploads = usedUploads();
  const size = uploads.reduce((s, [, u]) => s + u.base64.length, 0);
  const message = h('input', { class: 'input', id: 'pub-msg', placeholder: 'e.g. New texts on the FlightPrint page' });
  const err = h('p', { class: 'login__error', role: 'alert' });
  const missingAlt = findMissingAlt();
  await dialog({
    title: 'Publish changes',
    body: h('div', { class: 'fields' },
      h('p', null, 'These changes go live on the website about a minute after you publish:'),
      h('ul', { class: 'changes' }, list.map((c) => h('li', null, h('strong', null, c.label), h('span', null, c.note)))),
      uploads.length ? h('p', { class: 'field__help' }, `${uploads.length} new ${uploads.length === 1 ? 'image' : 'images'} (${(size * 0.75 / 1e6).toFixed(1)} MB)`) : null,
      missingAlt ? h('p', { class: 'note note--warn' }, `${missingAlt} ${missingAlt === 1 ? 'image has' : 'images have'} no alt text. You can publish anyway, but adding it helps accessibility and search engines.`) : null,
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'pub-msg' }, 'What did you change? (optional)'), message),
      err),
    actions: [{ text: 'Cancel', value: null }, {
      text: S.local ? 'Publish to local files' : 'Publish now', primary: true,
      run: async () => {
        if (size > 3.6e6) { err.textContent = 'Too many new images in one go. Publish the text changes first, or fewer images at a time.'; return false; }
        try {
          await publish(message.value.trim());
          return true;
        } catch (ex) {
          err.textContent = ex.status === 409
            ? `${ex.message} Reload the editor to get their version: your unpublished changes to other pages are kept.`
            : ex.message;
          if (ex.status === 409) err.append(h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => reloadKeepingDraft(ex.data?.overlap || []) }, 'Reload the editor'));
          return false;
        }
      },
    }],
  });
}

function usedUploads() {
  const json = JSON.stringify([S.site, ...allPages()]);
  return [...S.uploads].filter(([path]) => json.includes(path));
}

function findMissingAlt() {
  let n = 0;
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (typeof o.src === 'string' && o.src.startsWith('assets/img/uploads/') && !o.alt) n += 1;
      Object.values(o).forEach(walk);
    }
  };
  for (const p of allPages()) if (pageDirty(p.file)) walk(p);
  return n;
}

async function publish(message) {
  const pages = {};
  for (const p of allPages()) if (pageDirty(p.file)) pages[p.file] = p;
  const body = {
    base: S.head,
    message: message || `Update ${changes().map((c) => c.label).join(', ')} from the admin panel`,
    changes: {
      site: siteDirty() ? S.site : null,
      pages,
      deleted: [...S.deleted],
      uploads: usedUploads().map(([path, u]) => ({ path, base64: u.base64 })),
    },
  };
  const res = await api('publish', { method: 'POST', body: JSON.stringify(body) });
  S.head = res.sha === 'local' ? S.head : res.sha;
  for (const [path] of usedUploads()) S.images.push(path);
  S.base = { site: clone(S.site), pages: new Map(allPages().map((p) => [p.file, clone(p)])) };
  S.deleted.clear();
  S.uploads.clear();
  localStorage.removeItem(DRAFT_KEY);
  renderEditor();
  refreshChrome();
  const live = S.view.type === 'page' ? `/${S.view.file === 'index.html' ? '' : S.view.file}` : '/';
  toast(res.local ? 'Published to the local files.' : 'Published. The website updates in about a minute.', 'ok', { href: live, text: 'View live' });
}

async function reloadKeepingDraft(overlap) {
  const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
  for (const p of overlap) {
    const m = /^content\/pages\/(.+)\.json$/.exec(p);
    if (m && draft.pages) delete draft.pages[`${m[1]}.html`];
    if (p === 'content/site.json') draft.site = null;
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  location.reload();
}

/* =============================================================== preview */
const PREVIEW_INJECT = `<style>
.rv,.load{opacity:1!important;transform:none!important}
.cc-banner,.cc-prefs{display:none!important}
[data-cms-section]{cursor:pointer}
[data-cms-section].cms-hover{outline:2px dashed rgba(250,184,34,.6);outline-offset:-2px}
[data-cms-section].cms-flash{outline:2px solid #FAB822;outline-offset:-2px}
</style>
<script>
(function(){
  var last;
  document.addEventListener('mouseover', function(e){
    var s = e.target.closest('[data-cms-section]');
    if (s === last) return;
    if (last) last.classList.remove('cms-hover');
    if (s) s.classList.add('cms-hover');
    last = s;
  });
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if (a) {
      e.preventDefault();
      var href = a.getAttribute('href') || '';
      var hash = href.indexOf('#') >= 0 ? href.slice(href.indexOf('#')) : '';
      var t = hash.length > 1 && document.querySelector(hash);
      if (t && (href[0] === '#' || href.indexOf('index.html#') === 0)) t.scrollIntoView({behavior:'smooth'});
    }
    var s = e.target.closest('[data-cms-section]');
    if (s && !e.target.closest('button, input, select, textarea, label')) parent.postMessage({cms:'select', section:s.getAttribute('data-cms-section')}, location.origin);
  }, true);
  window.addEventListener('message', function(e){
    if (!e.data || e.data.cms !== 'scroll') return;
    var s = document.querySelector('[data-cms-section="' + e.data.section + '"]');
    if (e.data.section === 'top') { window.scrollTo({top:0, behavior:'smooth'}); return; }
    if (!s) return;
    window.scrollTo({top: s.getBoundingClientRect().top + window.scrollY - 72, behavior:'smooth'});
    s.classList.add('cms-flash');
    setTimeout(function(){ s.classList.remove('cms-flash'); }, 1200);
  });
})();
</script>`;

function previewPage() {
  if (S.view.type === 'page') return S.pages.get(S.view.file);
  return S.pages.get(S.previewFile) || S.pages.get('index.html');
}

function previewHtml() {
  const page = previewPage();
  let html = renderPage(S.site, allPages(), page, { preview: true });
  html = html.replace('<script src="assets/js/consent.js" defer></script>', '');
  html = html.replace('<head>', `<head>\n<base href="${location.origin}/">`);
  html = html.replace('</body>', `${PREVIEW_INJECT}\n</body>`);
  for (const [path, up] of S.uploads) html = html.split(path).join(up.url);
  return html;
}

let previewTimer;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => refreshPreview(false), 300);
}

function refreshPreview(reset) {
  const page = previewPage();
  if (!page) return;
  app.previewTitle.textContent = `${pageName(page)} · /${page.file === 'index.html' ? '' : page.file}`;
  let html;
  try {
    html = previewHtml();
    app.previewError.hidden = true;
  } catch (ex) {
    app.previewError.hidden = false;
    app.previewError.textContent = `The preview could not be drawn: ${ex.message}. Check the last field you changed.`;
    return;
  }
  const current = app.frames[app.active];
  const next = app.frames[1 - app.active];
  let y = 0;
  if (!reset) {
    try { y = current.contentWindow.scrollY || 0; } catch { y = 0; }
  }
  next.onload = () => {
    try {
      next.contentDocument.documentElement.style.scrollBehavior = 'auto';
      next.contentWindow.scrollTo(0, y);
    } catch { /* ignore */ }
    setTimeout(() => {
      next.classList.add('is-active');
      next.removeAttribute('tabindex');
      current.classList.remove('is-active');
      current.setAttribute('tabindex', '-1');
      app.active = 1 - app.active;
      if (reset && S.view.type === 'site') {
        const part = SITE_PARTS.find((p) => p.id === S.view.part);
        scrollPreviewTo(part.previewSection);
      }
    }, 60);
  };
  next.srcdoc = html;
}

function scrollPreviewTo(section) {
  const f = app.frames[app.active];
  if (f && f.contentWindow) f.contentWindow.postMessage({ cms: 'scroll', section }, location.origin);
}

function onPreviewMessage(e) {
  if (e.origin !== location.origin && e.origin !== 'null') return;
  if (!e.data || e.data.cms !== 'select') return;
  const id = e.data.section;
  if (id === 'contact' || id === 'footer') {
    go({ type: 'site', part: id });
    return;
  }
  if (S.view.type !== 'page') return;
  const key = `${viewKey()}#${id}`;
  S.open.add(key);
  renderEditor();
  const card = app.editor.querySelector(`[data-section="${id}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.classList.add('is-flash');
    setTimeout(() => card.classList.remove('is-flash'), 1200);
  }
}

function fitPreview() {
  const w = DEVICES[S.device];
  const box = app.stage.getBoundingClientRect();
  const pad = 24;
  const scale = Math.min(1, (box.width - pad * 2) / w);
  const height = (box.height - pad * 2) / scale;
  app.frameWrap.style.width = `${w}px`;
  app.frameWrap.style.height = `${height}px`;
  app.frameWrap.style.transform = `scale(${scale})`;
  app.frameWrap.classList.toggle('is-device', S.device !== 'desktop');
}

function openPreviewTab() {
  try {
    const blob = new Blob([previewHtml()], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  } catch (ex) {
    toast(ex.message, 'error');
  }
}

function linkTargets() {
  const dl = h('datalist', { id: 'link-targets' });
  const anchors = ['#contact', '#about', '#solutions', '#how-it-works', '#innovation', '#features', '#specifications', '#impact', '#details', '#results'];
  const fill = () => dl.replaceChildren(...allPages().map((p) => h('option', { value: p.file }, pageName(p))), ...anchors.map((a) => h('option', { value: a })));
  fill();
  setInterval(fill, 5000);
  return dl;
}

/* ================================================================== start */
async function start() {
  if (!S.token) await showLogin();
  document.body.classList.add('is-loading');
  try {
    await load();
  } catch (ex) {
    document.body.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'login__card' },
      h('h1', { class: 'login__title' }, 'Cannot load the content'), h('p', { class: 'login__text' }, ex.message),
      h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => location.reload() }, 'Try again'))));
    return;
  }
  document.body.classList.remove('is-loading');
  buildApp();
  document.body.append(linkTargets());
  S.open.add('index.html#hero');
  refreshChrome();
  renderEditor();
  fitPreview();
  refreshPreview(true);
}

start();
