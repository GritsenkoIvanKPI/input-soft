/* INPUT SOFT — shared site behaviour. Every block is guarded, so pages can include only what they need. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Typography: at least two words on every line ---------- */
  // After layout, finds lines that hold a single word and joins that word to its neighbour
  // with a non-breaking space, re-measuring until every line has 2+ words (or no join fits).
  // Re-runs on resize from the original text, so it adapts to every screen width.
  const wrapSelector = 'h1, h2, h3, h4, p, li:not(.step):not(.sol-nav), figcaption, address, label, .step__title, .case-chip__title, .mega__title, .mega__desc, .mega__case, .fact__label, .check > span, .link, .hero__announce > span';
  const NBSP = '\u00A0';
  const originals = new Map(); // text node -> original data

  const textNodesOf = (el) => {
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.data.trim() && !n.parentElement.closest('.sr-only, svg')) nodes.push(n);
    }
    return nodes;
  };

  const measureWords = (nodes) => {
    const words = [];
    const range = document.createRange();
    nodes.forEach((node) => {
      const re = /[^\s\u00A0]+/g;
      let m;
      while ((m = re.exec(node.data))) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        const real = /[\p{L}\p{N}]/u.test(m[0]);
        // a hyphenated word split across lines also counts as a word on each following line
        rects.forEach((rect, k) => words.push({ node, start: m.index, end: m.index + m[0].length, rect, real, part: k > 0 }));
      }
    });
    return words;
  };

  const groupLines = (words) => {
    const lines = [];
    words.forEach((w) => {
      const mid = w.rect.top + w.rect.height / 2;
      const line = lines.find((l) => Math.abs(l.mid - mid) < Math.max(4, w.rect.height * 0.45));
      if (line) line.words.push(w); else lines.push({ mid, words: [w] });
    });
    return lines;
  };

  // Replace the whitespace between word a and word b with one non-breaking space.
  const join = (a, b) => {
    if (a.node === b.node) {
      a.node.data = a.node.data.slice(0, a.end) + NBSP + a.node.data.slice(b.start);
    } else {
      a.node.data = a.node.data.slice(0, a.end) + NBSP;
      b.node.data = b.node.data.slice(b.start);
    }
  };

  const fixElement = (el) => {
    const nodes = textNodesOf(el);
    if (!nodes.length) return;
    nodes.forEach((n) => { if (!originals.has(n)) originals.set(n, n.data); });
    const width = el.getBoundingClientRect().width;
    if (!width) return;
    // Balanced wrapping can leave a lone word that no join can fix; fall back to normal wrapping first.
    const hasSingle = () => {
      const lines = groupLines(measureWords(nodes));
      return lines.length > 1 && lines.some((l) => l.words.filter((w) => w.real && !w.part).length + l.words.filter((w) => w.part).length === 1);
    };
    if (hasSingle()) el.classList.add('wrap-greedy');
    const skip = new Set();
    for (let pass = 0; pass < 12; pass++) {
      const words = measureWords(nodes);
      if (words.filter((w) => w.real).length < 2) return;
      const lines = groupLines(words);
      if (lines.length < 2) return;
      const i = lines.findIndex((l, idx) => l.words.filter((w) => w.real).length === 1 && !skip.has(idx));
      if (i === -1) return;
      const word = lines[i].words.find((w) => w.real);
      if (word.part) {
        // the lone piece is the tail of a hyphenated word: make its hyphen non-breaking, then re-measure
        const d = word.node.data;
        word.node.data = d.slice(0, word.start) + d.slice(word.start, word.end).replace(/-/g, '\u2011') + d.slice(word.end);
        continue;
      }
      const all = words.filter((w) => !w.part);
      const at = all.indexOf(word);
      // prefer pulling the previous word down; for the first line, pull the next word up
      const pair = i > 0 ? [all[at - 1], word] : [word, all[at + 1]];
      if (!pair[0] || !pair[1]) { skip.add(i); continue; }
      const snapshot = nodes.map((n) => n.data);
      join(pair[0], pair[1]);
      if (el.scrollWidth > Math.ceil(el.clientWidth) + 1 || el.getBoundingClientRect().width > width + 1) {
        nodes.forEach((n, k) => { n.data = snapshot[k]; });
        skip.add(i);
      }
    }
  };

  const fixAllLines = () => {
    originals.forEach((data, node) => { node.data = data; });
    $$('.wrap-greedy').forEach((el) => el.classList.remove('wrap-greedy'));
    $$(wrapSelector).forEach(fixElement);
  };
  window.fixLineBreaks = fixAllLines; // re-run after injecting new content

  let lastWidth = window.innerWidth;
  let resizeTimer;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fixAllLines, 150);
  });

  /* ---------- Nav: background on scroll ---------- */
  const nav = $('[data-nav]');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Solutions dropdown ---------- */
  $$('[data-dropdown]').forEach((item) => {
    const trigger = $('button', item);
    const panel = $('.mega', item);
    let closeTimer;
    const setOpen = (open) => {
      trigger.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    };
    trigger.addEventListener('click', () => setOpen(trigger.getAttribute('aria-expanded') !== 'true'));
    item.addEventListener('mouseenter', () => { clearTimeout(closeTimer); setOpen(true); });
    item.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => setOpen(false), 160); });
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) { setOpen(false); trigger.focus(); }
    });
  });

  /* ---------- Mobile menu ---------- */
  const burger = $('[data-burger]');
  const mobileMenu = $('[data-mobile-menu]');
  if (burger && mobileMenu) {
    const setMenu = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      $('use', burger).setAttribute('href', open ? '#i-close' : '#i-menu');
      mobileMenu.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      if (open) nav.classList.add('is-scrolled');
    };
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    $$('a, button', mobileMenu).forEach((el) => el.addEventListener('click', () => setMenu(false)));
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('.rv');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Marquee: duplicate track for a seamless loop ---------- */
  $$('[data-marquee]').forEach((marquee) => {
    const track = $('.marquee__track', marquee);
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    $$('img', clone).forEach((img) => { img.alt = ''; });
    marquee.appendChild(clone);
  });

  /* ---------- Solutions: sticky list follows the card in view ---------- */
  const solutions = $('[data-solutions]');
  if (solutions) {
    const navItems = $$('.sol-nav', solutions);
    const cards = $$('[data-sol-card]', solutions);
    const activate = (key) => {
      navItems.forEach((li) => {
        const on = li.dataset.sol === key;
        li.classList.toggle('is-active', on);
        $('.sol-nav__btn', li).setAttribute('aria-expanded', String(on));
      });
    };
    navItems.forEach((li) => {
      $('.sol-nav__btn', li).addEventListener('click', () => {
        const card = cards.find((c) => c.dataset.solCard === li.dataset.sol);
        activate(li.dataset.sol);
        if (card) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      });
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) activate(entry.target.dataset.solCard); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      cards.forEach((card) => io.observe(card));
    }
  }

  /* ---------- Steps: tabs with auto-advance ---------- */
  const steps = $('[data-steps]');
  if (steps) {
    const items = $$('.step', steps);
    const frames = $$('.steps__frame', steps);
    const duration = 7000;
    let current = 0;
    let timer;
    let started = false;
    steps.style.setProperty('--step-dur', `${duration}ms`);

    const show = (i) => {
      current = (i + items.length) % items.length;
      items.forEach((item, n) => {
        const on = n === current;
        item.classList.toggle('is-active', on);
        $('.step__btn', item).setAttribute('aria-expanded', String(on));
        // restart the progress animation
        const bar = $('.step__progress', item);
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = '';
      });
      frames.forEach((f, n) => f.classList.toggle('is-active', n === current));
      const counter = $('[data-step-current]', steps);
      if (counter) counter.textContent = String(current + 1);
    };
    const schedule = () => {
      clearTimeout(timer);
      if (reduceMotion) return;
      timer = setTimeout(() => { show(current + 1); schedule(); }, duration);
    };

    items.forEach((item, n) => $('.step__btn', item).addEventListener('click', () => { show(n); schedule(); }));
    const prev = $('[data-step-prev]', steps);
    const next = $('[data-step-next]', steps);
    if (prev) prev.addEventListener('click', () => { show(current - 1); schedule(); });
    if (next) next.addEventListener('click', () => { show(current + 1); schedule(); });
    steps.addEventListener('mouseenter', () => { clearTimeout(timer); steps.classList.add('is-paused'); });
    steps.addEventListener('mouseleave', () => { steps.classList.remove('is-paused'); if (started) { show(current); schedule(); } });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) { started = true; show(0); schedule(); }
          if (!entry.isIntersecting && started) clearTimeout(timer);
          if (entry.isIntersecting && started && !steps.matches(':hover')) schedule();
        });
      }, { threshold: 0.35 }).observe(steps);
    }
  }

  /* ---------- Count-up metrics ---------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    const run = (el) => {
      const target = Number(el.dataset.count);
      const t0 = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased).toString();
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  }

  /* ---------- Lead form (validation + submit) ---------- */
  const initForm = (form) => {
    const ok = $('[data-form-ok]', form);
    const err = $('[data-form-error]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      ok.classList.remove('is-visible');
      err.classList.remove('is-visible');
      if (!form.checkValidity()) {
        err.classList.add('is-visible');
        const firstInvalid = $(':invalid', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      const submit = $('[type="submit"]', form);
      submit.disabled = true;
      try {
        // Connect to the CRM / form backend here, e.g.:
        // await fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form) });
        await new Promise((r) => setTimeout(r, 500));
        form.reset();
        ok.classList.add('is-visible');
      } catch {
        err.classList.add('is-visible');
      } finally {
        submit.disabled = false;
      }
    });
  };

  const sourceForm = $('[data-lead-form]');
  if (sourceForm) initForm(sourceForm);

  /* ---------- Request a demo modal (reuses the lead form) ---------- */
  const modal = $('[data-modal]');
  if (modal && sourceForm) {
    const slot = $('[data-modal-slot]', modal);
    const form = sourceForm.cloneNode(true);
    form.classList.remove('rv', 'rv-d1', 'is-in');
    $$('[id]', form).forEach((el) => { el.id = `m-${el.id}`; });
    $$('label[for]', form).forEach((el) => { el.htmlFor = `m-${el.htmlFor}`; });
    $('h3', form).textContent = 'Request a demo';
    $('.form-card__head p', form).textContent = 'Tell us about your operation, and our experts will schedule a personalized demo.';
    slot.appendChild(form);
    initForm(form);

    let lastFocus;
    const open = () => {
      lastFocus = document.activeElement;
      modal.classList.add('is-open');
      document.body.classList.add('is-locked');
      setTimeout(() => $('input', form).focus(), 50);
    };
    const close = () => {
      modal.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    };
    $$('[data-modal-open]').forEach((btn) => btn.addEventListener('click', open));
    $$('[data-modal-close]', modal).forEach((btn) => btn.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const focusables = $$('button, input, select, textarea, a[href]', modal).filter((el) => !el.disabled);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fixAllLines);
})();
