/* ===========================================================================
   hint.js — the nudge toward `kipling`
   Three hints lead to the same place: an HTML comment beside the footer
   trigger, a line in the console, and the toast below — which only surfaces
   once the visitor has actually read to the bottom.
   Built with createElement/textContent, like everything else here.
   =========================================================================== */

import { getLang, onLangChange } from './i18n.js';

const FOUND_KEY = 'bx.poem.found';   // localStorage — they already ran it
const SHOWN_KEY = 'bx.hint.shown';   // sessionStorage — once per visit
const DWELL_MS = 14000;

/* --- memory ---------------------------------------------------------------
   Both reads have to survive private mode, where the accessors throw. */
export function markPoemFound() {
  try { localStorage.setItem(FOUND_KEY, '1'); } catch { /* non-fatal */ }
}

const hasFoundPoem = () => {
  try { return localStorage.getItem(FOUND_KEY) === '1'; } catch { return false; }
};

const shownThisVisit = () => {
  try { return sessionStorage.getItem(SHOWN_KEY) === '1'; } catch { return false; }
};

const markShown = () => {
  try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch { /* non-fatal */ }
};

/* --- copy -----------------------------------------------------------------
   The command stays Latin in both locales — it is what gets typed. */
const COMMAND = 'Kipling';

const COPY = {
  en: { label: 'Try command:', close: 'Dismiss' },
  zh: { label: '试试命令：', close: '关闭' },
};

const copyFor = (lang) => COPY[lang === 'zh' ? 'zh' : 'en'];

/* --- console hint --------------------------------------------------------- */
function logHint(lang) {
  // The console keeps the longer form: it is the subtler of the three hints,
  // and whoever opens devtools has gone looking.
  const quote = lang === 'zh'
    ? '“如果周围的人都失去理智、并把过错推到你身上，而你仍能保持冷静……”'
    : '“If you can keep your head when all about you / Are losing theirs and blaming it on you…”';
  const attr = lang === 'zh'
    ? '— 鲁德亚德·吉卜林（Rudyard Kipling）。在 ~ $ 提示符后键入他的姓氏。'
    : '— Rudyard Kipling. Type his surname at the ~ $ prompt.';
  console.log(`%c${quote}\n%c${attr}`,
    'font-style:italic;line-height:1.6', 'color:#86868b');
}

/* --- toast ---------------------------------------------------------------- */
function buildToast(lang) {
  const c = copyFor(lang);

  const root = document.createElement('div');
  root.className = 'hint';
  root.setAttribute('role', 'status');

  // The body opens the terminal but types nothing — finding the command is
  // still the visitor's to do.
  const body = document.createElement('button');
  body.type = 'button';
  body.className = 'hint__body';

  const line = document.createElement('span');
  line.className = 'hint__line';
  line.textContent = c.label;

  const cmd = document.createElement('code');
  cmd.className = 'hint__cmd';
  cmd.textContent = COMMAND;

  line.appendChild(cmd);
  body.appendChild(line);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'hint__close';
  close.textContent = '✕';
  close.setAttribute('aria-label', c.close);

  root.append(body, close);
  return { root, body, close, line };
}

function showToast() {
  markShown();

  const { root, body, close, line } = buildToast(getLang());
  document.body.appendChild(root);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dismiss = () => {
    root.classList.remove('is-visible');
    if (reduced) root.remove();
    else setTimeout(() => root.remove(), 240);
  };

  close.addEventListener('click', dismiss);
  body.addEventListener('click', () => {
    dismiss();
    // Reuse the footer glyph's own handler rather than reaching into the
    // terminal instance — one entry point, one behaviour.
    document.getElementById('terminal-trigger')?.click();
  });

  // Keep it in step with the header toggle while it is on screen.
  const off = onLangChange((next) => {
    const c = copyFor(next);
    line.firstChild.nodeValue = c.label;         // leave the <code> in place
    close.setAttribute('aria-label', c.close);
  });
  root.addEventListener('transitionend', () => { if (!root.isConnected) off(); });

  void root.offsetHeight;               // give the transition a start value
  root.classList.add('is-visible');
}

/* --- trigger --------------------------------------------------------------
   Two conditions, tracked separately: the footer has been seen, and the
   visitor has been here long enough for that to mean they read something.
   Tracking them apart is what makes the case of "scrolled to the bottom at
   4s and stayed there" still fire at 14s, rather than never. */
function armToast() {
  const footer = document.querySelector('footer');
  if (!footer || !('IntersectionObserver' in window)) return;

  let reachedEnd = false;
  let dwelled = false;
  let observer = null;

  const maybeShow = () => {
    if (!reachedEnd || !dwelled) return;
    observer?.disconnect();
    showToast();
  };

  setTimeout(() => { dwelled = true; maybeShow(); }, DWELL_MS);

  observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { reachedEnd = true; maybeShow(); }
  }, { threshold: 0.4 });

  observer.observe(footer);
}

export function initHint() {
  if (hasFoundPoem()) return;         // they've run it; stop pointing at it
  logHint(getLang());
  if (shownThisVisit()) return;
  armToast();
}
