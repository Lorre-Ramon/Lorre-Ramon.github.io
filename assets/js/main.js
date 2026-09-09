/* ===========================================================================
   main.js — page boot
   =========================================================================== */

import { initLang, getLang, setLang, toggleLang, onLangChange, loadContent } from './i18n.js';
import { renderAll } from './render.js';
import { initTerminal } from './terminal/index.js';

const THEME_KEY = 'bx.theme';

/* --- Theme ---------------------------------------------------------------- */
function readTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return ['light', 'dark'].includes(stored) ? stored : 'auto';
  } catch { return 'auto'; }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.dataset.theme = theme;

  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '◑' : theme === 'light' ? '◐' : '◐';
  document.getElementById('theme-toggle')
    ?.setAttribute('aria-pressed', String(theme === 'dark'));
}

function initTheme() {
  let theme = readTheme();
  applyTheme(theme);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // From 'auto', the first click flips away from whatever the system gives.
    theme = theme === 'auto' ? (systemDark ? 'light' : 'dark')
          : theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* non-fatal */ }
  });
}

/* --- Scroll reveal --------------------------------------------------------
   Progressive enhancement: the .js-reveal class below is what actually arms
   the dimming in CSS, and it is only added once an observer exists to undo it.
   No JS, no observer, or reduced motion → content just shows. */
let observer = null;

function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Arm the CSS only now that something can undim it again.
  document.documentElement.classList.add('js-reveal');

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  observeAll();
}

function observeAll() {
  if (!observer) return;
  document.querySelectorAll('.reveal:not(.is-visible)').forEach((node) => observer.observe(node));
}

/* --- Nav ------------------------------------------------------------------ */
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => { nav.dataset.scrolled = String(window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* --- Language ------------------------------------------------------------- */
function updateLangButton(lang) {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  // The button always shows the language you'd switch TO.
  btn.textContent = lang === 'en' ? '中文' : 'EN';
  btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切换到英文');
}

async function renderFor(lang) {
  const content = await loadContent(lang);
  renderAll(content, lang);
  observeAll();

  document.title = content.meta?.title ?? 'Boxuan Shi';
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', content.meta?.description ?? '');
  updateLangButton(lang);
}

/* --- Boot ----------------------------------------------------------------- */
async function boot() {
  const lang = initLang();
  initTheme();
  initNav();
  initReveal();

  try {
    await renderFor(lang);
  } catch (err) {
    // Most likely cause by far: the page was opened over file://, where
    // fetch() cannot read the JSON. Say so rather than failing silently.
    console.error('[bx] content failed to load:', err);
    document.getElementById('experience-list')?.append(
      Object.assign(document.createElement('p'), {
        className: 't-secondary',
        textContent: 'Content failed to load. If you opened this file directly, '
                   + 'serve it over HTTP instead: python3 -m http.server 8000',
      }));
  }

  onLangChange((next) => { renderFor(next).catch((e) => console.error('[bx]', e)); });

  document.getElementById('lang-toggle')?.addEventListener('click', () => toggleLang());

  initTerminal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
