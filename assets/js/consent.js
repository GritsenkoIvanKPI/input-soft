/* INPUT SOFT — cookie consent + Google Analytics 4 with Consent Mode v2.
   Google Analytics is only loaded after the visitor allows the Analytics category.
   The choice is stored in localStorage; the footer "Cookie settings" button reopens the preferences. */
(() => {
  const GA_ID = 'G-2RPJ90KHG0';
  const KEY = 'inputsoft-cookie-consent';
  const VERSION = 1; // bump to ask everyone again after changing categories
  const CATEGORIES = ['analytics', 'marketing', 'personalization'];

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Everything optional is denied until the visitor decides.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    personalization_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
  });

  const read = () => {
    try {
      const value = JSON.parse(window.localStorage.getItem(KEY));
      return value && value.v === VERSION ? value : null;
    } catch {
      return null;
    }
  };

  const write = (choice) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ ...choice, v: VERSION, ts: Date.now() }));
    } catch {
      /* storage unavailable (private mode): the choice applies to this page view only */
    }
  };

  let gaLoaded = false;
  const loadAnalytics = () => {
    if (gaLoaded) return;
    gaLoaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    gtag('js', new Date());
    gtag('config', GA_ID);
  };

  const apply = (choice) => {
    const state = (on) => (on ? 'granted' : 'denied');
    gtag('consent', 'update', {
      analytics_storage: state(choice.analytics),
      ad_storage: state(choice.marketing),
      ad_user_data: state(choice.marketing),
      ad_personalization: state(choice.marketing),
      personalization_storage: state(choice.personalization),
    });
    if (choice.analytics) loadAnalytics();
  };

  const stored = read();
  if (stored) apply(stored);

  const init = () => {
    const banner = document.querySelector('[data-cc-banner]');
    const prefs = document.querySelector('[data-cc-prefs]');
    if (!banner || !prefs) return;
    const boxes = [...prefs.querySelectorAll('[data-cc-category]')];
    let lastFocus = null;

    const setOpen = (el, open) => {
      el.classList.toggle('is-open', open);
      el.inert = !open;
    };

    const openPrefs = () => {
      const current = read() || {};
      boxes.forEach((box) => { box.checked = Boolean(current[box.dataset.ccCategory]); });
      lastFocus = document.activeElement;
      setOpen(prefs, true);
      document.body.classList.add('is-locked');
      setTimeout(() => prefs.querySelector('.modal__close').focus(), 50);
    };

    const closePrefs = () => {
      setOpen(prefs, false);
      document.body.classList.remove('is-locked');
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    };

    const save = (choice) => {
      write(choice);
      apply(choice);
      setOpen(banner, false);
      if (prefs.classList.contains('is-open')) closePrefs();
    };

    const all = (on) => Object.fromEntries(CATEGORIES.map((c) => [c, on]));

    document.querySelectorAll('[data-cc-accept]').forEach((b) => b.addEventListener('click', () => save(all(true))));
    document.querySelectorAll('[data-cc-deny]').forEach((b) => b.addEventListener('click', () => save(all(false))));
    document.querySelectorAll('[data-cc-open-prefs], [data-cc-settings]').forEach((b) => b.addEventListener('click', openPrefs));
    prefs.querySelectorAll('[data-cc-dismiss]').forEach((b) => b.addEventListener('click', closePrefs));
    prefs.querySelector('[data-cc-save]').addEventListener('click', () => {
      save(Object.fromEntries(boxes.map((box) => [box.dataset.ccCategory, box.checked])));
    });

    document.addEventListener('keydown', (e) => {
      if (!prefs.classList.contains('is-open')) return;
      if (e.key === 'Escape') closePrefs();
      if (e.key === 'Tab') {
        const focusables = [...prefs.querySelectorAll('button, input, a[href]')];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    if (!stored) setTimeout(() => setOpen(banner, true), 600);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
