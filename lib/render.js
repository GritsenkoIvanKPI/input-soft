// INPUT SOFT page renderer.
// Turns the content in content/*.json into finished HTML pages.
// Used in two places with the same code:
//   - build.mjs (Node) writes the .html files of the site
//   - the admin panel (browser) renders the live preview and the files it publishes

/* ------------------------------------------------------------------ helpers */
// Content may contain simple HTML (<br>, <a>, <strong>). Escape bare "&" only.
const t = (s) => String(s ?? '').replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
const attr = (s) => t(s).replace(/"/g, '&quot;');
const icon = (name) => `<svg class="icon"><use href="#i-${attr(name)}"/></svg>`;
const delay = (i) => ['', ' rv-d1', ' rv-d2', ' rv-d3'][i % 4];
const pad2 = (n) => String(n).padStart(2, '0');
const list = (a) => (Array.isArray(a) ? a : []);
const img = (im, extra = '') => `<img src="${attr(im.src)}" alt="${attr(im.alt)}"${im.w ? ` width="${im.w}"` : ''}${im.h ? ` height="${im.h}"` : ''}${extra}>`;
// Highlights a trailing unit in a value: "60%" -> 60<span class="accent">%</span>
const accentValue = (v, re = /([%+KkMh]+)$/) => t(v).replace(re, '<span class="accent">$1</span>');

export const ICONS = {
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  forecast: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7.5 17l3-3 2 2 4-4"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7M8.5 11h.5M11.75 11h.5M15 11h.5M8.5 14.5h.5M11.75 14.5h.5M15 14.5h.5M8.5 18h.5M11.75 18h.5M15 18h.5"/>',
  chart: '<path d="M4 20h16M7 16v-4M12 16V7M17 16v-7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c1.8.8 3 2.9 3 5.7"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  sparkle: '<path d="m11 3 1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9zM18.5 15l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>',
  message: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  book: '<path d="M4 18.5v-13A2.5 2.5 0 0 1 6.5 3H20v13H6.5A2.5 2.5 0 0 0 4 18.5 2.5 2.5 0 0 0 6.5 21H20M9 7.5h6"/>',
  devices: '<rect x="2.5" y="4" width="13" height="10" rx="1.5"/><path d="M6.5 18h5M9 14v4"/><rect x="17.5" y="8" width="4.5" height="12" rx="1.2"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.9 9a4.8 4.8 0 0 1-.4 9.5z"/>',
  exchange: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5M19.5 14h.5v2.5M14 17.5V20h2.5M19.5 20h.5"/>',
  satellite: '<path d="m13 7-4-4-4 4 4 4M17 11l4 4-4 4-4-4M8 12l4 4 6-6-4-4zM16 8l3-3M9 21a6 6 0 0 0-6-6"/>',
  infinity: '<path d="M12 12c-2-2.7-3.6-4-5-4a4 4 0 0 0 0 8c1.4 0 3-1.3 5-4zm0 0c2 2.7 3.6 4 5 4a4 4 0 0 0 0-8c-1.4 0-3 1.3-5 4z"/>',
  gauge: '<path d="M3.3 17a9 9 0 1 1 17.4 0M12 14l4-4"/><circle cx="12" cy="14" r="1.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.2-6"/>',
  headset: '<path d="M3.5 14v-2a8.5 8.5 0 0 1 17 0v2"/><rect x="3.5" y="14" width="4" height="6" rx="1.5"/><rect x="16.5" y="14" width="4" height="6" rx="1.5"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2zM9 6v12"/><path d="M13 10h4M13 14h3"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2.2 2.2 0 0 0 4 0"/>',
  shield: '<path d="m12 3 7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  pin: '<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.25v.01M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/>',
  x: '<path d="M4 4h4.5L20 20h-4.5zM19.5 4l-6.4 7.2M4.5 20l6.4-7.2"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.3 6.7v.01"/>',
};

// Icons an editor can pick for cards, tiles and menu items (the rest are interface icons).
export const CONTENT_ICONS = ['forecast', 'scan', 'calculator', 'chart', 'users', 'database', 'timer', 'plane', 'sparkle', 'message', 'trend', 'book', 'devices', 'cpu', 'layers', 'cloud', 'exchange', 'qr', 'satellite', 'infinity', 'gauge', 'globe', 'leaf', 'headset', 'ticket', 'wrench', 'file', 'bell', 'shield', 'check-circle', 'alert', 'mail', 'pin'];

// Colour themes defined in styles.css (hero glow and card glow).
export const THEMES = { rms: 'Yellow glow', dms: 'Blue glow', cod: 'Orange glow', fp: 'Violet glow' };

const SOCIAL_LABELS = { linkedin: 'LinkedIn', x: 'X (Twitter)', instagram: 'Instagram' };

/* ------------------------------------------------------------- page lookups */
const byKind = (pages, kind) => pages.filter((p) => p.kind === kind).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
const menuPages = (pages, kind) => byKind(pages, kind).filter((p) => p.showInMenu);

/* --------------------------------------------------------------- the shell */
const sprite = () => `<!-- ============ Icon sprite (single stroke system: 24px grid, 1.5 stroke) ============ -->
<svg class="sr-only" aria-hidden="true" focusable="false">
${Object.entries(ICONS).map(([k, v]) => `  <symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('\n')}
</svg>`;

const head = (site, page, isHome) => {
  const seo = page.seo || {};
  const heroImg = isHome ? page.sections.hero.image : page.hero && page.hero.image;
  const og = seo.ogImage || (heroImg && heroImg.src) || (page.photo && page.photo.src) || site.seo.ogImage;
  return `<!doctype html>${isHome ? '' : '\n<!-- Generated from content/*.json by lib/render.js — edit in the admin panel (/admin) or run: node build.mjs -->'}
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t(seo.title)}</title>
  <meta name="description" content="${attr(seo.description)}">
  <meta name="theme-color" content="#0b0d16">
  <meta property="og:title" content="${attr(seo.title)}">
  <meta property="og:description" content="${attr(seo.ogDescription || seo.description)}">
  <meta property="og:image" content="${attr(og)}">
  <link rel="icon" type="image/png" href="assets/img/brand/favicon.png">
  <link rel="apple-touch-icon" href="assets/img/brand/is-mark.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&family=Hanken+Grotesk:wght@300;400;500&display=swap" rel="stylesheet">${isHome && heroImg ? `\n  <link rel="preload" as="image" href="${attr(heroImg.src)}">` : ''}
  <link rel="stylesheet" href="assets/css/styles.css">
  <script src="assets/js/consent.js" defer></script>
</head>
<body>

${sprite()}

<a class="skip-link" href="#main">Skip to content</a>
`;
};

const header = (site, pages, page, link) => {
  const cur = (file) => (file === page.file ? ' aria-current="page"' : '');
  const n = site.nav;
  const sols = menuPages(pages, 'solution');
  const cases = menuPages(pages, 'case');
  return `<!-- ============ Navigation ============ -->
<header class="nav" data-nav>
  <div class="container nav__inner">
    <a class="nav__logo" href="index.html" aria-label="INPUT SOFT — home">
      <img src="assets/img/brand/logo-white.png" alt="INPUT SOFT" width="148" height="15">
    </a>

    <nav class="nav__links" aria-label="Primary">
      <div class="nav__item" data-dropdown>
        <button class="nav__link" type="button" aria-expanded="false" aria-controls="mega-solutions">
          ${t(n.solutionsLabel)} ${icon('chevron-down')}
        </button>
        <div class="mega" id="mega-solutions">
          <div class="mega__col">
            <span class="mega__label">${t(n.solutionsColumn)}</span>
${sols.map((p) => `            <a class="mega__item" href="${attr(p.file)}"${cur(p.file)}>
              <span class="icon-tile">${icon(p.menu.icon)}</span>
              <span><span class="mega__title">${t(p.menu.title)}</span><span class="mega__desc">${t(p.menu.desc)}</span></span>
            </a>`).join('\n')}
          </div>${cases.length ? `
          <div class="mega__col">
            <span class="mega__label">${t(n.casesColumn)}</span>
${cases.map((p) => `            <a class="mega__case" href="${attr(p.file)}"${cur(p.file)}>
              <strong>${t(p.menu.title)}</strong>
              ${t(p.menu.desc)}
            </a>`).join('\n')}
          </div>` : ''}
        </div>
      </div>
${list(n.links).map((l) => `      <a class="nav__link" href="${attr(link(l.href))}">${t(l.text)}</a>`).join('\n')}
    </nav>

    <div class="nav__actions">
      <button class="btn btn--primary btn--sm" type="button" data-modal-open>${t(n.cta)}</button>
    </div>

    <button class="nav__burger" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu" data-burger>
      ${icon('menu')}
    </button>
  </div>
</header>

<div class="mobile-menu" id="mobile-menu" data-mobile-menu>
  <div class="mobile-menu__group">
    <span class="eyebrow">${t(n.solutionsColumn)}</span>
${sols.map((p) => `    <a class="mobile-menu__sub" href="${attr(p.file)}"${cur(p.file)}><span class="icon-tile">${icon(p.menu.icon)}</span>${t(p.menu.title)}</a>`).join('\n')}
  </div>${cases.length ? `
  <div class="mobile-menu__group">
    <span class="eyebrow">${t(n.casesColumn)}</span>
${cases.map((p) => `    <a class="mobile-menu__sub" href="${attr(p.file)}"${cur(p.file)}><span class="icon-tile">${icon('file')}</span>${t(p.menu.title)}</a>`).join('\n')}
  </div>` : ''}
  <div class="mobile-menu__group">
${list(n.links).map((l) => `    <a class="mobile-menu__link" href="${attr(link(l.href))}">${t(l.text)} ${icon('arrow-right')}</a>`).join('\n')}
  </div>
  <div class="mobile-menu__actions">
    <button class="btn btn--primary btn--lg" type="button" data-modal-open>${t(n.cta)}</button>
  </div>
</div>
`;
};

const contact = (site, page, isHome) => {
  const c = site.contact;
  const copy = isHome ? c.home : c.inner;
  const f = c.form;
  const sel = page.formOption && list(f.options).includes(page.formOption) ? page.formOption : '';
  return `  <!-- ============ 9. CTA + contact form ============ -->
  <section class="section" aria-labelledby="contact-title">
    <div class="container">
      <!-- #contact is on the panel itself so the Contact link lands on it, not on the section spacing above -->
      <div class="cta" id="contact">
        <div class="cta__copy rv">
          <span class="eyebrow">${t(c.eyebrow)}</span>
          <h2 class="cta__title h-xl" id="contact-title">${t(copy.title)}</h2>
          <p class="lead">${t(copy.lead)}</p>
          <div class="cta__contacts">
            <a href="mailto:${attr(c.email)}">${icon('mail')}${t(c.email)}</a>
          </div>
        </div>

        <!-- Single lead form. It is cloned into the "Request a demo" modal by main.js. -->
        <form class="form-card rv rv-d1" data-lead-form novalidate>
          <div class="form-card__head">
            <h3>${t(f.title)}</h3>
            <p>${t(f.text)}</p>
          </div>
          <div class="form-grid">
            <div class="field field--full"><label for="f-name">Full name <span>*</span></label><input class="input" id="f-name" name="name" autocomplete="name" required></div>
            <div class="field"><label for="f-email">Business email <span>*</span></label><input class="input" id="f-email" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="f-phone">Phone</label><input class="input" id="f-phone" name="phone" type="tel" autocomplete="tel"></div>
            <div class="field"><label for="f-company">Company <span>*</span></label><input class="input" id="f-company" name="company" autocomplete="organization" required></div>
            <div class="field">
              <label for="f-solution">Select a solution <span>*</span></label>
              <select class="input select" id="f-solution" name="solution" required>
                <option value="" disabled${sel ? '' : ' selected'}>Choose</option>
${list(f.options).map((o) => `                <option${o === sel ? ' selected' : ''}>${t(o)}</option>`).join('\n')}
              </select>
            </div>
            <div class="field field--full"><label for="f-question">Your question</label><textarea class="input" id="f-question" name="question" rows="2"></textarea></div>
          </div>
          <label class="check">
            <input type="checkbox" name="consent" required>
            <span>${t(f.consent)}</span>
          </label>
          <button class="btn btn--ink btn--lg" type="submit">${t(f.submit)} ${icon('arrow-right')}</button>
          <p class="form-status form-status--ok" role="status" data-form-ok>${icon('check-circle')}<span>${t(f.ok)}</span></p>
          <p class="form-status form-status--error" role="alert" data-form-error>${icon('alert')}<span>${t(f.error)}</span></p>
        </form>
      </div>
    </div>
  </section>`;
};

const footer = (site, pages, link) => {
  const f = site.footer;
  const sols = menuPages(pages, 'solution');
  return `<!-- ============ Footer ============ -->
<footer class="footer">
  <div class="container">
    <div class="footer__grid">
      <div class="footer__brand">
        <img src="assets/img/brand/logo-white.png" alt="INPUT SOFT" width="150" height="15" loading="lazy">
        <p>${t(f.tagline)}</p>
        <div class="socials">
${list(f.socials).map((s) => `          <a href="${attr(s.href)}" target="_blank" rel="noopener noreferrer" aria-label="INPUT SOFT on ${attr(SOCIAL_LABELS[s.network] || s.network)} (opens in a new tab)">${icon(s.network)}</a>`).join('\n')}
        </div>
      </div>
      <nav class="footer__col" aria-label="${attr(f.solutionsTitle)}">
        <span class="footer__title">${t(f.solutionsTitle)}</span>
${sols.map((p) => `        <a href="${attr(p.file)}">${t(p.menu.title)}</a>`).join('\n')}
      </nav>
      <nav class="footer__col" aria-label="${attr(f.companyTitle)}">
        <span class="footer__title">${t(f.companyTitle)}</span>
${list(f.companyLinks).map((l) => `        <a href="${attr(link(l.href))}">${t(l.text)}</a>`).join('\n')}
      </nav>
      <div class="footer__col">
        <span class="footer__title">${t(f.officesTitle)}</span>
${list(f.offices).map((o) => `        <address class="footer__address"><strong>${t(o.country)}</strong>${t(o.address)}</address>`).join('\n')}
      </div>
      <div class="footer__col">
        <span class="footer__title">${t(f.securityTitle)}</span>
        <div class="badges">
          <a class="badges__link" href="https://sigma.software/services/cybersecurity-consulting-services" target="_blank" rel="noopener noreferrer" aria-label="Code security verified by Sigma Software (opens in a new tab)">
            <img src="assets/img/brand/badge-code-security.png" alt="" width="330" height="508" loading="lazy">
          </a>
          <img src="assets/img/brand/badge-security-expert.png" alt="Checked by Security Expert Group" width="374" height="458" loading="lazy">
        </div>
      </div>
    </div>

    <div class="footer__bottom">
      <p>${t(f.copyright)}</p>
      <div class="footer__legal">
${list(f.legalLinks).map((l) => `        <a href="${attr(link(l.href))}">${t(l.text)}</a>`).join('\n')}
        <button class="footer__cookie" type="button" data-cc-settings>Cookie settings</button>
      </div>
    </div>
  </div>
</footer>`;
};

const tail = () => `<!-- ============ Request a demo modal ============ -->
<div class="modal" id="demo-modal" role="dialog" aria-modal="true" aria-label="Request a demo" data-modal>
  <div class="modal__backdrop" data-modal-close></div>
  <div class="modal__dialog" data-modal-slot>
    <button class="modal__close" type="button" aria-label="Close" data-modal-close>${icon('close')}</button>
  </div>
</div>

<!-- ============ Cookie consent (behaviour in assets/js/consent.js) ============ -->
<div class="cc-banner" role="region" aria-label="Cookie consent" data-cc-banner inert>
  <p class="cc-banner__text">By clicking <strong>“Accept All Cookies”</strong>, you agree to the storing of cookies on your device to enhance site navigation, analyze site usage, and assist in our marketing efforts. View our <a href="privacy-policy.html">Privacy Policy</a> for more information.</p>
  <div class="cc-banner__actions">
    <button class="cc-link" type="button" data-cc-open-prefs>Preferences</button>
    <button class="btn btn--secondary btn--sm" type="button" data-cc-deny>Deny</button>
    <button class="btn btn--primary btn--sm" type="button" data-cc-accept>Accept</button>
  </div>
  <button class="cc-close" type="button" aria-label="Close and deny optional cookies" data-cc-deny>${icon('close')}</button>
</div>

<div class="modal cc-prefs" role="dialog" aria-modal="true" aria-labelledby="cc-title" data-cc-prefs inert>
  <div class="modal__backdrop" data-cc-dismiss></div>
  <div class="modal__dialog cc-prefs__dialog">
    <button class="modal__close" type="button" aria-label="Close" data-cc-dismiss>${icon('close')}</button>
    <h2 class="cc-prefs__title" id="cc-title">Privacy Preference Center</h2>
    <p class="cc-prefs__intro">When you visit websites, they may store or retrieve data in your browser. This storage is often necessary for the basic functionality of the website. The storage may be used for marketing, analytics, and personalization of the site, such as storing your preferences. Privacy is important to us, so you have the option of disabling certain types of storage that may not be necessary for the basic functioning of the website. Blocking categories may impact your experience on the website.</p>
    <div class="cc-prefs__bulk">
      <button class="btn btn--outline-ink btn--sm" type="button" data-cc-deny>Reject all cookies</button>
      <button class="btn btn--outline-ink btn--sm" type="button" data-cc-accept>Allow all cookies</button>
    </div>
    <h3 class="cc-prefs__subtitle">Manage Consent Preferences by Category</h3>
    <div class="cc-prefs__cats">
      <div class="cc-cat">
        <div class="cc-cat__head">
          <span class="cc-cat__title">Essential</span>
          <span class="cc-cat__always">Always active</span>
        </div>
        <p>These items are required to enable basic website functionality.</p>
      </div>
      <div class="cc-cat">
        <label class="cc-cat__head" for="cc-marketing">
          <span class="cc-cat__title">Marketing</span>
          <input class="cc-switch" type="checkbox" id="cc-marketing" data-cc-category="marketing">
        </label>
        <p>These items are used to deliver advertising that is more relevant to you and your interests. They may also be used to limit the number of times you see an advertisement and measure the effectiveness of advertising campaigns. Advertising networks usually place them with the website operator’s permission.</p>
      </div>
      <div class="cc-cat">
        <label class="cc-cat__head" for="cc-personalization">
          <span class="cc-cat__title">Personalization</span>
          <input class="cc-switch" type="checkbox" id="cc-personalization" data-cc-category="personalization">
        </label>
        <p>These items allow the website to remember choices you make (such as your user name, language, or the region you are in) and provide enhanced, more personal features. For example, a website may provide you with local weather reports or traffic news by storing data about your current location.</p>
      </div>
      <div class="cc-cat">
        <label class="cc-cat__head" for="cc-analytics">
          <span class="cc-cat__title">Analytics</span>
          <input class="cc-switch" type="checkbox" id="cc-analytics" data-cc-category="analytics">
        </label>
        <p>These items help the website operator understand how its website performs, how visitors interact with the site, and whether there may be technical issues. This storage type usually doesn’t collect information that identifies a visitor.</p>
      </div>
    </div>
    <button class="btn btn--ink btn--lg cc-prefs__save" type="button" data-cc-save>Confirm my preferences and close</button>
  </div>
</div>

<script src="assets/js/main.js" defer></script>
</body>
</html>
`;

/* ================================================================ home page */
const homeSections = {
  hero: (h) => `  <!-- ============ 1. Hero ============ -->
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__panel">
      <div class="hero__media" aria-hidden="true">
        <img class="hero__bg" src="${attr(h.image.src)}" alt="" width="${h.image.w}" height="${h.image.h}">
      </div>

      <div class="hero__content">
        <h1 class="hero__title h-xxl load load-1" id="hero-title">${t(h.title)}</h1>
${h.announce && h.announce.show !== false ? `
        <a class="hero__announce load load-2" href="${attr(h.announce.href)}">
          <span class="pill pill--accent">${t(h.announce.pill)}</span>
          <span>${t(h.announce.text)}${h.announce.more ? `<span class="hero__announce-more"> ${t(h.announce.more)}</span>` : ''}</span>
          ${icon('arrow-right')}
        </a>
` : ''}
        <p class="hero__lead load load-3">${t(h.lead)}</p>

        <div class="hero__actions load load-4">
          <button class="btn btn--primary btn--lg" type="button" data-modal-open>
            ${t(h.primaryCta)} ${icon('arrow-right')}
          </button>
          <a class="btn btn--glass btn--lg" href="${attr(h.secondaryCta.href)}">${t(h.secondaryCta.text)}</a>
        </div>
      </div>

      <a class="hero__pill load load-5" href="${attr(h.pill.href)}">
        <span class="hero__pill-muted">${t(h.pill.muted)}</span>
        ${t(h.pill.text)}
        <span class="hero__pill-icon">${icon('arrow-down')}</span>
      </a>
    </div>
  </section>`,

  featured: (f) => (f.show === false ? '' : `  <!-- ============ Featured in ============ -->
  <section class="section--tight" aria-label="${attr(f.label)}">
    <div class="container">
      <div class="logo-strip">
        <p class="logo-strip__label eyebrow">${t(f.label)}</p>
        <div class="marquee" data-marquee>
          <div class="marquee__track">
${list(f.logos).map((l) => `            <div class="marquee__item"><img${l.tall ? ' class="is-tall"' : ''} src="${attr(l.src)}" alt="${attr(l.alt)}"></div>`).join('\n')}
          </div>
        </div>
      </div>
    </div>
  </section>`),

  features: (f) => `  <!-- ============ 2. Key features ============ -->
  <section class="section" id="features" aria-labelledby="features-title">
    <div class="container">
      <div class="section-head section-head--center rv">
        <h2 class="h-xl" id="features-title">${t(f.heading)}</h2>
        <p class="lead">${t(f.lead)}</p>
      </div>

      <div class="tiles tiles--4">
${list(f.items).map((it, i) => `        <article class="feature rv${delay(i)}">
          <span class="icon-tile">${icon(it.icon)}</span>
          <span class="feature__index">${pad2(i + 1)}</span>
          <h3 class="feature__title">${t(it.title)}</h3>
          <p class="feature__text">${t(it.text)}</p>
        </article>`).join('\n')}
      </div>
    </div>
  </section>`,

  solutions: (s) => `  <!-- ============ 3. Solutions ============ -->
  <section class="section" id="solutions" aria-labelledby="solutions-title">
    <div class="container solutions" data-solutions>
      <div class="solutions__aside">
        <span class="eyebrow rv">${t(s.eyebrow)}</span>
        <div class="solutions__head rv">
          <h2 class="solutions__title h-xl" id="solutions-title">${t(s.heading)}</h2>
          <p class="text-muted">${t(s.sub)}</p>
        </div>

        <ul class="solutions__list">
${list(s.items).map((it, i) => `          <li class="sol-nav${i ? '' : ' is-active'}" data-sol="sol-${i}">
            <button class="sol-nav__btn" type="button">${t(it.name)}</button>
            <div class="sol-nav__body"><div class="sol-nav__inner">
              <p>${t(it.text)}</p>
              <div class="tag-list">${list(it.tags).map((g) => `<span class="tag">${t(g)}</span>`).join('')}</div>
              <a class="link" href="${attr(it.href)}">Explore ${t(it.name)} ${icon('arrow-up-right')}</a>
            </div></div>
          </li>`).join('\n')}
        </ul>

        <p class="solutions__note rv">
          ${icon('layers')}
          ${t(s.note)}
        </p>
      </div>

      <div class="solutions__stack">
${list(s.items).map((it, i) => `        <article class="sol-card sol-card--${attr(it.theme)} rv" data-sol-card="sol-${i}">
          <div class="sol-card__head">
            <h3 class="h-md">${t(it.name)}</h3>
            <p>${t(it.cardText || it.text)}</p>
            <div class="tag-list">${list(it.tags).map((g) => `<span class="tag">${t(g)}</span>`).join('')}</div>
            <a class="link" href="${attr(it.href)}">Learn more<span class="sr-only"> about ${t(it.name)}</span> ${icon('arrow-up-right')}</a>
          </div>
          <div class="sol-card__media">${img(it.image, ' loading="lazy"')}</div>
        </article>`).join('\n')}
      </div>
    </div>
  </section>`,

  innovation: (s) => (s.show === false ? '' : `  <!-- ============ 4. Intelligent Ground Operations ============ -->
  <section class="section section--panel-blue" id="innovation" aria-labelledby="innovation-title">
    <div class="container">
      <div class="section-head section-head--center rv">
        <span class="eyebrow">${t(s.eyebrow)}</span>
        <h2 class="h-xl" id="innovation-title">${t(s.heading)}</h2>
        <p class="lead">${t(s.lead)}</p>
      </div>

      <div class="cards-3">
${list(s.items).map((it, i) => `        <article class="ai-card rv${delay(i)}">
          <div class="ai-card__media">${img(it.image, ' loading="lazy"')}</div>
          <div class="ai-card__body">
            <div class="ai-card__title">
              <span class="icon-tile">${icon(it.icon)}</span>
              <h3 class="h-sm">${t(it.title)}</h3>
            </div>
            <p>${t(it.text)}</p>
          </div>
        </article>`).join('\n')}
      </div>
    </div>
  </section>`),

  steps: (s) => {
    const items = list(s.items);
    return `  <!-- ============ 5. Getting started ============ -->
  <section class="section" id="how-it-works" aria-labelledby="steps-title">
    <div class="container">
      <div class="section-head section-head--split rv">
        <div>
          <span class="eyebrow">${t(s.eyebrow)}</span>
          <h2 class="h-xl" id="steps-title">${t(s.heading)}</h2>
        </div>
        <p class="lead">${t(s.lead)}</p>
      </div>

      <div class="steps" data-steps>
        <div class="steps__side">
        <ol class="steps__list">
${items.map((it, i) => `          <li class="step${i ? '' : ' is-active'}">
            <button class="step__btn" type="button" aria-expanded="${i ? 'false' : 'true'}">
              <span class="step__num">${pad2(i + 1)}</span><span class="step__title">${t(it.title)}</span>
              <span class="step__icon" aria-hidden="true">${icon('plus')}</span>
            </button>
            <div class="step__body"><div class="step__inner">
              <p>${t(it.text)}</p>
            </div></div>
            <span class="step__progress" aria-hidden="true"></span>
          </li>`).join('\n')}
        </ol>
        <div class="steps__nav">
          <p class="steps__count">Step <span data-step-current>1</span> of ${items.length}</p>
          <div class="steps__arrows">
            <button class="steps__arrow" type="button" aria-label="Previous step" data-step-prev>${icon('arrow-right')}</button>
            <button class="steps__arrow steps__arrow--next" type="button" data-step-next>Next step ${icon('arrow-right')}</button>
          </div>
        </div>
        </div>

        <div class="steps__stage rv">
${items.map((it, i) => (it.phone && it.phone.src
    ? `          <div class="steps__frame${i ? '' : ' is-active'}">
            ${img(it.image, ' loading="lazy"')}
            <div class="steps__phone">${img({ w: 750, h: 1626, ...it.phone }, ' loading="lazy"')}</div>
          </div>`
    : `          <div class="steps__frame${i ? '' : ' is-active'}">${img(it.image, ' loading="lazy"')}</div>`)).join('\n')}
        </div>
      </div>
    </div>
  </section>`;
  },

  specs: (s) => `  <!-- ============ 6. Key specifications ============ -->
  <section class="section" id="specifications" aria-labelledby="specs-title">
    <div class="container">
      <div class="section-head rv">
        <span class="eyebrow">${t(s.eyebrow)}</span>
        <h2 class="h-xl" id="specs-title">${t(s.heading)}</h2>
      </div>

      <div class="tiles tiles--4">
${list(s.items).map((it, i) => `        <div class="spec rv${delay(i)}"><span class="icon-tile">${icon(it.icon)}</span><div><h3 class="spec__title">${t(it.title)}</h3><p class="spec__text">${t(it.text)}</p></div></div>`).join('\n')}
      </div>
    </div>
  </section>`,

  clients: (c) => {
    const logos = list(c.logos).filter((l) => l.src);
    const cells = logos.length
      ? logos.map((l) => `          <div class="client"><img${l.tall ? ' class="is-tall"' : ''} src="${attr(l.src)}" alt="${attr(l.alt)}" loading="lazy"></div>`)
      : Array.from({ length: 6 }, () => '          <div class="client client--empty"><span>Client logo</span></div>');
    return `  <!-- ============ Our clients ============ -->
  <section class="section section--tight" id="clients" aria-labelledby="clients-title"${c.show ? '' : ' hidden'}>
    <div class="container">
      <div class="clients__head rv">
        <h2 class="h-lg" id="clients-title">${t(c.heading)}</h2>
        <p class="text-muted">${t(c.sub)}</p>
      </div>
      <div class="clients__grid rv">
${cells.join('\n')}
      </div>
    </div>
  </section>`;
  },

  impact: (s) => {
    const metric = (m, d) => `        <div class="metric${m.yellow ? ' metric--yellow' : ''} rv${d}">
          <div>
${m.pre ? `            <p class="metric__pre">${t(m.pre)}</p>\n` : ''}            <p class="metric__value">${t(m.before)}${m.number !== '' && m.number != null ? `<span data-count="${attr(m.number)}">${t(m.number)}</span>` : ''}${t(m.after)}${m.accent ? `<span class="accent">${t(m.accent)}</span>` : ''}</p>
            <p class="metric__label">${t(m.label)}</p>
          </div>
          <span class="metric__source">${icon(m.icon)}${t(m.source)}</span>
        </div>`;
    const tile = (c, k, d) => `        <div class="bento__media bento__media--${k} rv${d}">
          ${img({ w: 896, h: 1200, ...c.image }, ' loading="lazy"')}
          <a class="case-chip" href="${attr(c.href)}">
            <span class="case-chip__text">
              <span class="case-chip__label">${t(c.label)}</span>
              <span class="case-chip__title">${t(c.title)}</span>
            </span>
            ${icon('arrow-right')}
          </a>
        </div>`;
    const m = list(s.metrics);
    const c = list(s.cases);
    const d = ['', ' rv-d1', ' rv-d2', '', ' rv-d1', ' rv-d1', ' rv-d2'];
    const cells = [];
    m.slice(0, 2).forEach((x) => cells.push((dd) => metric(x, dd)));
    c.slice(0, 2).forEach((x, i) => cells.push((dd) => tile(x, i ? 'b' : 'a', dd)));
    m.slice(2).forEach((x) => cells.push((dd) => metric(x, dd)));
    return `  <!-- ============ 7. Key metrics + case studies ============ -->
  <section class="section" id="impact" aria-labelledby="impact-title">
    <div class="container">
      <div class="section-head rv">
        <span class="eyebrow">${t(s.eyebrow)}</span>
        <h2 class="h-xl" id="impact-title">${t(s.heading)}</h2>
      </div>

      <div class="bento">
${cells.map((f, i) => f(d[i] ?? delay(i))).join('\n')}
      </div>
    </div>
  </section>`;
  },

  about: (a) => `  <!-- ============ 8. About the company ============ -->
  <section class="section" id="about" aria-labelledby="about-title">
    <div class="container">
      <div class="about">
        <figure class="about__media rv">
          ${img(a.image, ' loading="lazy"')}
          <figcaption class="about__quote">
            <span class="eyebrow">${t(a.quoteLabel)}</span>
            <p>${t(a.quote)}</p>
          </figcaption>
        </figure>

        <div class="about__body">
          <span class="eyebrow rv">${t(a.eyebrow)}</span>
          <h2 class="h-lg rv" id="about-title">${t(a.heading)}</h2>
${list(a.paragraphs).map((p) => `          <p class="rv">${t(p)}</p>`).join('\n')}
          <div class="facts rv">
${list(a.facts).map((f) => `            <div class="fact"><span class="fact__value">${t(f.value)}</span><span class="fact__label">${t(f.label)}</span></div>`).join('\n')}
          </div>
        </div>
      </div>

      <div class="backers">
        <div class="backers__head rv">
          <span class="eyebrow">${t(a.backersLabel)}</span>
        </div>
        <div class="backers__grid rv">
${list(a.backers).map((l) => `          <div class="backer"><img${l.tall ? ' class="is-tall"' : ''} src="${attr(l.src)}" alt="${attr(l.alt)}" loading="lazy"></div>`).join('\n')}
        </div>
      </div>
    </div>
  </section>`,
};

export const HOME_SECTIONS = ['hero', 'featured', 'features', 'solutions', 'innovation', 'steps', 'specs', 'clients', 'impact', 'about'];

/* ============================================================ solution page */
const media = (m, theme, extra = '') => {
  if (m.type === 'phones') {
    return `<figure class="split__media sol-card sol-card--${attr(theme)} rv${extra}">
            <div class="phones">
${list(m.phones).map((p) => `              <div class="phone"><img src="${attr(p.src)}" alt="${attr(p.alt)}" width="750" height="1626" loading="lazy"></div>`).join('\n')}
            </div>
          </figure>`;
  }
  return `<figure class="split__media sol-card sol-card--${attr(theme)} rv${extra}">
            <div class="sol-card__media">${img(m.image || {}, ' loading="lazy"')}</div>
          </figure>`;
};

const solutionSections = {
  hero: (p) => `  <!-- ============ Page hero ============ -->
  <section class="hero" aria-labelledby="page-title">
    <div class="hero__panel hero__panel--page hero__panel--${attr(p.theme)}">
      <div class="hero__content">
        <p class="page-hero__crumb eyebrow load load-1"><a href="index.html#solutions">Solutions</a><span aria-hidden="true">/</span>${t(p.hero.crumb)}</p>
        <h1 class="hero__title h-xxl load load-2" id="page-title">${t(p.hero.title)}</h1>
        <p class="page-hero__lead lead load load-3">${t(p.hero.lead)}</p>
        <div class="hero__actions load load-4">
          <button class="btn btn--primary btn--lg" type="button" data-modal-open>
            Request a demo ${icon('arrow-right')}
          </button>
          <a class="btn btn--glass btn--lg" href="#details">See the details</a>
        </div>
      </div>
      <figure class="page-hero__shot load load-5">
        ${img(p.hero.image)}
      </figure>
    </div>
  </section>`,

  cards: (p) => `  <!-- ============ Overview cards ============ -->
  <section class="section" aria-labelledby="overview-title">
    <div class="container">
      <div class="section-head section-head--center rv">
        <span class="eyebrow">${t(p.cards.eyebrow)}</span>
        <h2 class="h-xl" id="overview-title">${t(p.cards.heading)}</h2>
      </div>
      <div class="tiles tiles--3">
${list(p.cards.items).map((it, i) => `        <article class="feature rv${delay(i)}">
          <span class="icon-tile">${icon(it.icon)}</span>
          <span class="feature__index">${pad2(i + 1)}</span>
          <h3 class="feature__title">${t(it.title)}</h3>
          <p class="feature__text">${t(it.text)}</p>
        </article>`).join('\n')}
      </div>
    </div>
  </section>`,

  details: (p) => {
    const d = p.details;
    const H = d.heading ? 'h3' : 'h2';
    const head = d.heading ? `      <div class="section-head rv">
        <span class="eyebrow">${t(d.eyebrow)}</span>
        <h2 class="h-xl" id="details-title">${t(d.heading)}</h2>${d.lead ? `\n        <p class="lead">${t(d.lead)}</p>` : ''}
      </div>\n` : '';
    let n = 0;
    const rows = list(d.rows).map((r, i) => {
      if (r.layout === 'modules') {
        return `        <article class="split mods" data-mods>
          <ul class="mods__list rv">
${list(r.modules).map((m, k) => `            <li class="sol-nav mods__item${k ? '' : ' is-active'}" data-mod="${k}">
              <h2 class="mods__title"><button class="sol-nav__btn" type="button" aria-expanded="${k ? 'false' : 'true'}">${t(m.title)}</button></h2>
              <div class="sol-nav__body"><div class="sol-nav__inner">
                ${list(m.paragraphs).map((x) => `<p>${t(x)}</p>`).join('\n                ')}
              </div></div>
            </li>`).join('\n')}
          </ul>
          <div class="mods__stage">
            ${media(r.media, p.theme, ' rv-d1 mods__media')}
            <div class="mods__steps" aria-hidden="true">${list(r.modules).map((_, k) => `<span data-mod-step="${k}"></span>`).join('')}</div>
          </div>
        </article>`;
      }
      n += 1;
      const checklist = list(r.checklist).filter((c) => c.text || c.bold);
      const body = checklist.length
        ? `<ul class="checklist">
${checklist.map((c) => `              <li>${icon('check')}<span>${c.bold ? `<strong>${t(c.bold)}</strong> ` : ''}${t(c.text)}</span></li>`).join('\n')}
            </ul>`
        : list(r.paragraphs).map((x) => `<p>${t(x)}</p>`).join('\n            ');
      return `        <article class="split${i % 2 ? ' split--reverse' : ''}">
          <div class="split__body rv">
            ${d.numbered ? `<span class="split__num">${n}</span>\n            ` : ''}<${H} class="h-lg">${t(r.title)}</${H}>
            ${body}
          </div>
          ${media(r.media, p.theme, ' rv-d1')}
        </article>`;
    }).join('\n');
    return `  <!-- ============ Detail rows ============ -->
  <section class="section" id="details"${d.heading ? ' aria-labelledby="details-title"' : ' aria-label="Details"'}>
    <div class="container">
${head}      <div class="splits">
${rows}
      </div>
    </div>
  </section>`;
  },

  impact: (p) => `  <!-- ============ Impact ============ -->
  <section class="section section--panel-blue" aria-labelledby="impact-title">
    <div class="container">
      <div class="section-head${p.impact.wide ? ' section-head--wide' : ''} rv">
        <span class="eyebrow">${t(p.impact.eyebrow)}</span>
        <h2 class="h-xl" id="impact-title">${t(p.impact.heading)}</h2>
      </div>
      <div class="tiles tiles--${list(p.impact.items).length === 3 ? 3 : 4}">
${list(p.impact.items).map((it, i) => `        <div class="benefit rv${delay(i)}">
          <div class="benefit__top">
            ${it.value ? `${it.pre ? `<p class="benefit__pre">${t(it.pre)}</p>\n            ` : ''}<p class="benefit__value">${accentValue(it.value)}</p>` : `<span class="icon-tile">${icon(it.icon)}</span>`}
          </div>
          <h3 class="benefit__title">${t(it.title)}</h3>
          <p class="benefit__text">${t(it.text)}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`,

  caseStudy: (p, pages) => {
    const cs = p.caseStudy || {};
    const c = cs.show && pages.find((x) => x.kind === 'case' && x.file === cs.page);
    if (!c) return '';
    return `  <!-- ============ Case study ============ -->
  <section class="section section--tight" aria-labelledby="case-title">
    <div class="container">
      <div class="case-banner case-banner--yellow rv">
        <div class="case-banner__media">${img({ w: 896, h: 1200, ...c.photo }, ' loading="lazy"')}</div>
        <div class="case-banner__body">
          <span class="eyebrow">Case study</span>
          <h2 class="h-lg" id="case-title">${t(cs.title || c.title)}</h2>
          <a class="btn btn--ink" href="${attr(c.file)}">Read the case study ${icon('arrow-right')}</a>
        </div>
      </div>
    </div>
  </section>`;
  },
};

export const SOLUTION_SECTIONS = ['hero', 'cards', 'details', 'impact', 'caseStudy'];

/* ========================================================== case study page */
const csList = (items, ic) => `<ul class="checklist">
${list(items).map((it) => `            <li>${icon(ic)}<span>${it.bold ? `<strong>${t(it.bold)}</strong> ` : ''}${t(it.text)}</span></li>`).join('\n')}
          </ul>`;

const csBlock = (label, title, b, ic, mod, d) => `        <article class="cs-block cs-block--${mod} rv${d}">
          <span class="eyebrow">${label}</span>
          <h2 class="h-lg">${title}</h2>
          ${list(b.paragraphs).map((x) => `<p>${t(x)}</p>`).join('\n          ')}
          ${b.listTitle ? `<p class="cs-block__lead">${t(b.listTitle)}</p>\n          ` : ''}${csList(b.list, ic)}
        </article>`;

const caseSections = {
  hero: (p) => `  <!-- ============ Case study hero ============ -->
  <section class="hero" aria-labelledby="page-title">
    <div class="hero__panel hero__panel--page hero__panel--case hero__panel--${attr(p.theme)}">
      <div class="hero__content">
        <p class="page-hero__crumb eyebrow load load-1"><span>Case study <span aria-hidden="true">/</span></span><a href="${attr(p.solution.href)}">${t(p.solution.name)}</a></p>
        <h1 class="hero__title load load-2" id="page-title">${t(p.title)}</h1>
        <div class="hero__actions load load-3">
          <a class="btn btn--primary btn--lg" href="#results">Discover the results ${icon('arrow-down')}</a>
          <a class="btn btn--glass btn--lg" href="${attr(p.solution.href)}">View the solution</a>
        </div>
      </div>
      <figure class="page-hero__shot page-hero__shot--photo load load-4">
        ${img({ w: 896, h: 1200, ...p.photo })}
      </figure>
    </div>
  </section>`,

  profile: (p) => {
    const pr = p.profile;
    const facts = [['plane', 'Industry', pr.industry], ['globe', 'Region', pr.region], ['forecast', 'Client since', pr.clientSince]];
    const [lead, ...rest] = list(p.overview);
    return `  <!-- ============ Client profile ============ -->
  <section class="section" aria-labelledby="profile-title">
    <div class="container cs-profile">
      <div class="cs-client rv">
        <div class="cs-client__head">
          <span class="eyebrow">The client profile</span>
          <h2 class="h-lg" id="profile-title">${t(pr.company)}</h2>${pr.about ? `\n          <p class="cs-client__about">${t(pr.about)}</p>` : ''}
        </div>
        <dl class="cs-client__facts">
${facts.map(([ic, k, v]) => `          <div class="cs-fact">
            <span class="icon-tile">${icon(ic)}</span>
            <dt>${k}</dt>
            <dd>${t(v)}</dd>
          </div>`).join('\n')}
        </dl>
      </div>
      <div class="cs-overview rv">
        <h2 class="h-lg">Operational overview</h2>
        <div class="cs-overview__body">
          <p class="cs-overview__lead">${t(lead)}</p>
          ${rest.map((x) => `<p>${t(x)}</p>`).join('\n          ')}
        </div>
      </div>
    </div>
  </section>`;
  },

  story: (p) => `  <!-- ============ Challenge & solution ============ -->
  <section class="section section--tight" aria-label="Challenge and solution">
    <div class="container">
      <div class="cs-story">
${csBlock('01', 'Challenge', p.challenge, 'alert', 'challenge', '')}
${csBlock('02', 'Solution', p.solutionBlock, 'check', 'solution', ' rv-d1')}
      </div>
    </div>
  </section>`,

  results: (p) => {
    const r = p.results;
    const rows = list(r.table).filter((x) => x.metric);
    const table = rows.length ? `      <div class="cs-table rv" role="table" aria-label="${attr(r.heading)}">
        <div class="cs-table__row cs-table__row--head" role="row">
          <span role="columnheader">Metric</span><span role="columnheader">Before</span><span role="columnheader">After</span><span role="columnheader">Impact</span>
        </div>
${rows.map((x) => `        <div class="cs-table__row" role="row">
          <span class="cs-table__metric" role="cell">${t(x.metric)}</span>
          <span role="cell" data-label="Before">${t(x.before)}</span>
          <span role="cell" data-label="After">${t(x.after)}</span>
          <span class="cs-table__impact" role="cell" data-label="Impact">${t(x.impact)}</span>
        </div>`).join('\n')}
      </div>
${r.note ? `      <p class="cs-note lead rv">${t(r.note)}</p>\n` : ''}` : '';
    const winsHead = rows.length && r.winsHeading ? `      <h3 class="cs-wins-title h-lg rv">${t(r.winsHeading)}</h3>\n` : '';
    return `  <!-- ============ Results ============ -->
  <section class="section section--panel-blue" id="results" aria-labelledby="results-title">
    <div class="container">
      <div class="section-head rv">
        <span class="eyebrow">Results</span>
        <h2 class="h-xl" id="results-title">${t(r.heading)}</h2>
      </div>
${table}${winsHead}      <div class="tiles tiles--4">
${list(r.wins).map((w, i) => `        <div class="benefit rv${delay(i)}">
          <div class="benefit__top">
            ${w.value ? `${w.pre ? `<p class="benefit__pre">${t(w.pre)}</p>\n            ` : ''}<p class="benefit__value">${accentValue(w.value, /([%+K]+)$/)}</p>` : `<span class="icon-tile">${icon(w.icon)}</span>`}
          </div>
          <p class="benefit__text benefit__text--lead">${t(w.text)}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;
  },

  quote: (p) => (p.quote && p.quote.show === false ? '' : `  <!-- ============ Client quote ============ -->
  <section class="section section--tight" aria-label="Client quote">
    <div class="container">
      <figure class="cs-quote cs-quote--yellow rv">
        <blockquote>
          ${list(p.quote.paragraphs).map((x) => `<p>${t(x)}</p>`).join('\n          ')}
        </blockquote>
        <figcaption><strong>${t(p.quote.name)}</strong><span>${t(p.quote.role)}</span></figcaption>
      </figure>
    </div>
  </section>`),
};

export const CASE_SECTIONS = ['hero', 'profile', 'story', 'results', 'quote'];

/* =============================================================== legal page */
const legalSections = {
  hero: (p) => `  <!-- ============ Legal page header ============ -->
  <section class="hero" aria-labelledby="page-title">
    <div class="hero__panel hero__panel--page hero__panel--legal">
      <div class="hero__content">
        <p class="page-hero__crumb eyebrow load load-1">${t(p.crumb || 'Legal')}</p>
        <h1 class="hero__title h-xxl load load-2" id="page-title">${t(p.title)}</h1>
        <p class="page-hero__lead lead load load-3">${t(p.lead)}</p>
      </div>
    </div>
  </section>`,

  body: (p) => {
    const secs = list(p.sections);
    const block = (b) => {
      if (b.type === 'list') return `          <ul class="legal__list">
${list(b.items).map((li) => `            <li>${t(li)}</li>`).join('\n')}
          </ul>`;
      if (b.type === 'principles') return `          <ol class="principles">
${list(b.items).map((x, n) => `            <li class="principle"><span class="principle__num">Principle ${n + 1}</span><span class="principle__title">${t(x)}</span></li>`).join('\n')}
          </ol>`;
      return `          <p>${t(b.text)}</p>`;
    };
    return `  <!-- ============ Policy ============ -->
  <section class="section" aria-label="${attr(p.title)}">
    <div class="container legal">
      <nav class="legal__toc" aria-label="Sections">
        <span class="eyebrow">Contents</span>
        <ol>
${secs.map((s, i) => `          <li><a href="#${attr(s.id)}" data-toc="${attr(s.id)}"><span>${pad2(i + 1)}</span>${t(s.title)}</a></li>`).join('\n')}
        </ol>
      </nav>
      <article class="legal__article">
${secs.map((s, i) => `        <section class="legal__section" id="${attr(s.id)}">
          <h2 class="h-md"><span class="legal__num">${pad2(i + 1)}</span>${t(s.title)}</h2>
${list(s.blocks).map(block).join('\n')}
        </section>`).join('\n')}
      </article>
    </div>
  </section>`;
  },
};

export const LEGAL_SECTIONS = ['hero', 'body'];

/* ================================================================== render */
const KINDS = {
  home: { sections: homeSections, order: HOME_SECTIONS, data: (p) => (k) => p.sections[k] },
  solution: { sections: solutionSections, order: SOLUTION_SECTIONS, data: (p) => () => p },
  case: { sections: caseSections, order: CASE_SECTIONS, data: (p) => () => p },
  legal: { sections: legalSections, order: LEGAL_SECTIONS, data: (p) => () => p },
};

// Marks the first element of a section so the admin preview can find it.
const mark = (html, id) => html.replace(/<(section|div|figure|article)\b/, `<$1 data-cms-section="${id}"`);

/**
 * Renders one page.
 * @param {object} site   content/site.json
 * @param {object[]} pages every page (needed for menus and case study links)
 * @param {object} page   the page to render
 * @param {{preview?: boolean}} opts preview adds section markers for the admin
 */
export function renderPage(site, pages, page, opts = {}) {
  const kind = KINDS[page.kind];
  if (!kind) throw new Error(`Unknown page kind: ${page.kind}`);
  const isHome = page.kind === 'home';
  // On inner pages, links to home-page anchors (except the shared contact block) point back to the home page.
  const link = (href) => (!isHome && /^#/.test(href || '') && href !== '#contact' ? `index.html${href}` : href);
  const get = kind.data(page);
  const body = kind.order.map((k) => {
    const html = kind.sections[k](get(k) || {}, pages);
    return html && opts.preview ? mark(html, k) : html;
  }).filter(Boolean);
  const cta = contact(site, page, isHome);
  return `${head(site, page, isHome)}
${header(site, pages, page, link)}
<main id="main">

${body.join('\n\n')}

${opts.preview ? mark(cta, 'contact') : cta}

</main>

${opts.preview ? mark(footer(site, pages, link), 'footer') : footer(site, pages, link)}

${tail()}`;
}

/** Renders every page: returns [{ file, html }]. */
export function renderSite(site, pages) {
  return pages.map((p) => ({ file: p.file, html: renderPage(site, pages, p) }));
}
