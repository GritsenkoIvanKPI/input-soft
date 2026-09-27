// Layout audit: single-word lines, text overlap, clipped boxes, horizontal overflow. Usage: node audit.mjs [device name or width]
import puppeteer from 'puppeteer';

const DEVICES = [
  ['iPhone SE (1st)', 320, 568], ['Galaxy S8', 360, 740], ['iPhone SE', 375, 667],
  ['iPhone 14', 390, 844], ['Pixel 7', 412, 915], ['iPhone Plus', 414, 896],
  ['iPhone Pro Max', 430, 932], ['Phone landscape', 844, 390], ['iPad mini', 768, 1024],
  ['iPad Air', 820, 1180], ['iPad Pro', 1024, 1366], ['Laptop', 1280, 800],
  ['Desktop', 1440, 900], ['Wide', 1920, 1080],
];
const only = process.argv[2];

const audit = (rootSel) => {
  const root = document.querySelector(rootSel) || document.body;
  const blockOf = (el) => {
    while (el && getComputedStyle(el).display.startsWith('inline') && el.parentElement) el = el.parentElement;
    return el;
  };
  const visible = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const blocks = new Map();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || !node.data.trim() || parent.closest('script,style,svg,option,select,textarea,.sr-only,[aria-hidden="true"]')) continue;
    if (!visible(parent)) continue;
    const block = blockOf(parent);
    const re = /\S+/g; let m;
    while ((m = re.exec(node.data))) {
      if (!/[\p{L}\p{N}]/u.test(m[0])) continue; // skip lone dashes/symbols
      const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
      const rects = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0);
      if (!rects.length) continue;
      if (!blocks.has(block)) blocks.set(block, []);
      rects.forEach((rect) => blocks.get(block).push({ w: m[0], y: rect.top + rect.height / 2, h: rect.height, x: rect.left, r: rect.right }));
    }
  }
  const label = (el) => {
    const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + cls;
  };
  const singles = [];
  const textRects = [];
  for (const [block, words] of blocks) {
    const lines = [];
    for (const wd of words) {
      const line = lines.find((l) => Math.abs(l.y - wd.y) < Math.max(4, wd.h * 0.45));
      if (line) line.words.push(wd.w); else lines.push({ y: wd.y, words: [wd.w] });
    }
    if (words.length >= 2 && lines.length >= 2) {
      lines.forEach((l, i) => { if (l.words.length === 1) singles.push(`${label(block)} line ${i + 1}/${lines.length}: "${l.words[0]}"  ← ${words.map((x) => x.w).join(' ').slice(0, 70)}`); });
    }
    const xs = words.map((w) => w.x), rs = words.map((w) => w.r), ys = words.map((w) => w.y);
    textRects.push({ el: block, l: Math.min(...xs), r: Math.max(...rs), t: Math.min(...ys) - 4, b: Math.max(...ys) + 4, text: words.map((x) => x.w).join(' ').slice(0, 40) });
  }
  const overlaps = [];
  for (let i = 0; i < textRects.length; i++) for (let j = i + 1; j < textRects.length; j++) {
    const a = textRects[i], b = textRects[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (ox > 2 && oy > 2) overlaps.push(`"${a.text}" ✕ "${b.text}"`);
  }
  const vw = document.documentElement.clientWidth;
  const offscreen = textRects.filter((t) => t.r > vw + 1 || t.l < -1).filter((t) => !t.el.closest('.marquee')).map((t) => `"${t.text}" [${Math.round(t.l)}–${Math.round(t.r)}]`);
  const clipped = [...root.querySelectorAll('.btn, .tag, .pill, .input, .hero__pill, .case-chip, .nav__link, .link')]
    .filter((el) => visible(el) && el.scrollWidth > el.clientWidth + 1).map((el) => `${label(el)} "${el.textContent.trim().slice(0, 30)}"`);
  // boxes cut off by an overflow-hidden ancestor (intentional bleeds excluded)
  const bleedOk = '.marquee, .hero__media, .sol-card__media, .steps__frame, .steps__phone, .bento__media img, .ai-card__media img, .about__media img, .cta__bg, .step__inner, .step__inner *, .sol-nav__inner, .sol-nav__inner *, .skip-link, .sr-only, svg, svg *';
  const boxClipped = [];
  for (const el of root.querySelectorAll('*')) {
    if (el.closest(bleedOk) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    let anc = el.parentElement;
    while (anc && getComputedStyle(anc).overflowX === 'visible') anc = anc.parentElement;
    if (!anc || anc === document.body || anc === document.documentElement) continue;
    const a = anc.getBoundingClientRect();
    if (r.right > a.right + 1 || r.left < a.left - 1) boxClipped.push(`${label(el)} [${Math.round(r.left)}–${Math.round(r.right)}] inside ${label(anc)} [${Math.round(a.left)}–${Math.round(a.right)}]`);
  }
  return { singles, overlaps, offscreen, clipped, boxClipped: boxClipped.slice(0, 8), pageOverflow: document.documentElement.scrollWidth - vw };
};

const b = await puppeteer.launch({ headless: 'new' });
let total = 0;
let p;
for (const [name, w, h] of DEVICES) {
  if (only && !name.includes(only) && String(w) !== only) continue;
  if (p) await p.close();
  p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 900 && h > w, hasTouch: w < 1024 });
  await p.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  const states = [
    ['page (all accordions open)', 'body', () => {
      document.querySelectorAll('.rv').forEach((e) => e.classList.add('is-in'));
      document.querySelectorAll('.step, .sol-nav').forEach((e) => e.classList.add('is-active'));
    }],
    ['demo modal', '[data-modal]', () => { document.querySelector('[data-modal]').classList.add('is-open'); }],
  ];
  if (w < 1024) states.push(['mobile menu', '[data-mobile-menu]', () => { document.querySelector('[data-mobile-menu]').classList.add('is-open'); }]);
  else states.push(['solutions dropdown', '.mega', () => { document.querySelector('.mega').classList.add('is-open'); }]);
  for (const [state, root, fn] of states) {
    await p.evaluate(fn);
    await new Promise((r) => setTimeout(r, 900));
    const res = await p.evaluate(audit, root);
    // Modal/menus overlay the page: only report issues inside the overlay.
    const issues = [...res.singles.map((s) => 'SINGLE  ' + s), ...res.offscreen.map((s) => 'OFFSCR  ' + s), ...res.clipped.map((s) => 'CLIPPED ' + s), ...res.boxClipped.map((s) => 'BOXCUT  ' + s)];
    if (state === 'page (all accordions open)') issues.push(...res.overlaps.map((s) => 'OVERLAP ' + s));
    if (res.pageOverflow > 0) issues.push('PAGE OVERFLOW ' + res.pageOverflow + 'px');
    const filtered = issues;
    if (filtered.length) { console.log(`\n== ${name} ${w}×${h} — ${state}`); filtered.forEach((s) => console.log('  ' + s)); total += filtered.length; }
    await p.evaluate(() => { document.querySelector('[data-modal]').classList.remove('is-open'); document.querySelector('[data-mobile-menu]').classList.remove('is-open'); document.querySelector('.mega').classList.remove('is-open'); });
  }
}
console.log(`\nTOTAL ISSUES: ${total}`);
await b.close();
