/* ===========================================================================
   i18n.js — locale state
   Single source of truth for language. The page renderer and the terminal
   both subscribe, so `lang zh` inside the terminal switches the page too.
   =========================================================================== */

const SUPPORTED = ['en', 'zh'];
const STORAGE_KEY = 'bx.lang';
const subscribers = new Set();

let current = 'en';
const cache = new Map();

/** Resolution order: ?lang= → localStorage → navigator → 'en'. */
function resolveInitial() {
  const param = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED.includes(param)) return param;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
  } catch { /* private mode — fall through to navigator */ }

  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

export function getLang() {
  return current;
}

export function setLang(lang, { persist = true } = {}) {
  if (!SUPPORTED.includes(lang) || lang === current) return current;
  current = lang;

  document.documentElement.lang = lang;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* non-fatal */ }
  }
  subscribers.forEach((fn) => fn(lang));
  return current;
}

export function toggleLang() {
  return setLang(current === 'en' ? 'zh' : 'en');
}

export function onLangChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/**
 * Load a locale's content bundle. Cached, so toggling back and forth is free.
 * Note these fetches only work over HTTP — opening index.html via file://
 * fails on CORS. Serve with `python3 -m http.server`.
 */
export async function loadContent(lang = current) {
  if (cache.has(lang)) return cache.get(lang);

  const promise = (async () => {
    const [site, shelf] = await Promise.all([
      fetch(`/content/site.${lang}.json`).then((r) => {
        if (!r.ok) throw new Error(`site.${lang}.json → ${r.status}`);
        return r.json();
      }),
      fetch('/content/shelf.json').then((r) => (r.ok ? r.json() : { items: [] })),
    ]);
    return { ...site, shelf: shelf.items ?? [] };
  })();

  cache.set(lang, promise);
  return promise;
}

export function initLang() {
  current = resolveInitial();
  document.documentElement.lang = current;
  return current;
}

export { SUPPORTED };
