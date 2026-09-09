/* ===========================================================================
   index.js — terminal overlay lifecycle
   Four entry points: the footer glyph, the backtick key, the Konami code,
   and a #terminal URL. All of them land here.
   =========================================================================== */

import { Shell } from './shell.js';
import { buildVFS } from './vfs.js';
import { BANNER, BANNER_COMPACT, MATRIX_CHARS } from './ascii.js';
import { getLang, setLang, onLangChange, loadContent } from '../i18n.js';

const HASH = '#terminal';
const THEME_KEY = 'bx.term.theme';
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const narrow = () => window.innerWidth < 460;

/** Regions made inert while the dialog is open, so the page behind it is
 *  unreachable by keyboard and invisible to screen readers. */
const BACKDROP_REGIONS = ['nav', 'main', 'footer'];

export class Terminal {
  constructor() {
    this.open = false;
    this.booted = false;
    this.content = null;
    this.vfs = null;
    this.lastFocus = null;
    this.openedAt = 0;
    this.matrixTimer = null;
    this.theme = this.readTheme();

    this.buildDOM();
    this.shell = new Shell({
      output: this.outputEl,
      input: this.inputEl,
      prompt: this.promptEl,
      ctx: () => this.shellContext(),
    });
    this.shell.renderPrompt();

    this.bindTriggers();

    // Rebuild the filesystem when the page language changes, so `lang zh`
    // and the header toggle stay in lockstep.
    onLangChange(async (lang) => {
      this.content = await loadContent(lang);
      this.vfs = buildVFS(this.content, lang);
      this.inputEl.setAttribute('aria-label',
        lang === 'zh' ? '终端输入' : 'Terminal input');
    });
  }

  readTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return ['mono', 'green', 'amber'].includes(stored) ? stored : 'mono';
    } catch { return 'mono'; }
  }

  setTheme(theme) {
    this.theme = theme;
    this.root.dataset.termTheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* non-fatal */ }
  }

  /* --- DOM --------------------------------------------------------------- */
  buildDOM() {
    const root = document.createElement('div');
    root.className = 'term';
    root.id = 'terminal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Terminal');
    root.hidden = true;
    root.dataset.termTheme = this.theme;

    const panel = document.createElement('div');
    panel.className = 'term__panel';

    /* title bar */
    const bar = document.createElement('div');
    bar.className = 'term__bar';
    const dots = document.createElement('div');
    dots.className = 'term__dots';
    ['r', 'y', 'g'].forEach((c) => {
      const dot = document.createElement('span');
      dot.className = `term__dot term__dot--${c}`;
      dots.appendChild(dot);
    });
    const title = document.createElement('span');
    title.className = 'term__title';
    title.textContent = 'boxuan@github-pages — bx-sh';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'term__close';
    close.setAttribute('aria-label', 'Close terminal');
    close.textContent = 'esc';
    close.addEventListener('click', () => this.hide());
    bar.append(dots, title, close);

    /* scrolling output */
    const scroller = document.createElement('div');
    scroller.className = 'term__scroll';
    const output = document.createElement('div');
    output.className = 'term__output';
    output.setAttribute('role', 'log');
    output.setAttribute('aria-live', 'polite');
    output.setAttribute('aria-atomic', 'false');
    scroller.appendChild(output);

    /* input line */
    const inputRow = document.createElement('form');
    inputRow.className = 'term__inputline';
    inputRow.addEventListener('submit', (e) => e.preventDefault());

    const prompt = document.createElement('span');
    prompt.className = 'term__prompt';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'term__input';
    input.setAttribute('aria-label', 'Terminal input');
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    inputRow.append(prompt, input);

    /* Mobile affordance: typing shell commands on a phone is miserable, so
       the common ones are one tap away. */
    const chips = document.createElement('div');
    chips.className = 'term__chips';
    ['help', 'whoami', 'work', 'projects', 'neofetch', 'clear', 'exit'].forEach((name) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'term__chip';
      chip.textContent = name;
      chip.addEventListener('click', () => {
        this.shell.run(name);
        this.inputEl.focus();
      });
      chips.appendChild(chip);
    });

    panel.append(bar, scroller, inputRow, chips);
    root.appendChild(panel);

    // Clicking the backdrop (but not the panel) dismisses.
    root.addEventListener('mousedown', (e) => {
      if (e.target === root) this.hide();
    });

    document.body.appendChild(root);

    this.root = root;
    this.outputEl = output;
    this.inputEl = input;
    this.promptEl = prompt;
    this.scroller = scroller;
  }

  /* --- context for commands --------------------------------------------- */
  shellContext() {
    return {
      vfs: this.vfs,
      content: this.content,
      lang: getLang(),
      setLang: (lang) => setLang(lang),
      theme: this.theme,
      setTheme: (theme) => this.setTheme(theme),
      close: () => this.hide(),
      matrix: () => this.runMatrix(),
      reducedMotion,
      narrow,
      uptime: () => `${Math.max(1, Math.round((Date.now() - this.openedAt) / 1000))}s`,
    };
  }

  /* --- triggers ---------------------------------------------------------- */
  bindTriggers() {
    document.getElementById('terminal-trigger')
      ?.addEventListener('click', () => this.show());

    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
      if (this.open) {
        if (e.key === 'Escape') { e.preventDefault(); this.hide(); }
        return;
      }

      // Backtick opens — but never while the visitor is typing somewhere.
      if (e.key === '`' && !isTypingTarget(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        this.show();
        return;
      }

      // Konami code.
      const expected = KONAMI[konamiIndex];
      const pressed = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (pressed === expected) {
        konamiIndex += 1;
        if (konamiIndex === KONAMI.length) {
          konamiIndex = 0;
          this.show({ konami: true });
        }
      } else {
        konamiIndex = pressed === KONAMI[0] ? 1 : 0;
      }
    });

    window.addEventListener('hashchange', () => this.syncToHash());
  }

  syncToHash() {
    if (location.hash === HASH) this.show({ fromHash: true });
    else if (this.open) this.hide({ fromHash: true });
  }

  /* --- show / hide -------------------------------------------------------- */
  async show({ konami = false, fromHash = false } = {}) {
    if (this.open) return;

    if (!this.content) {
      const lang = getLang();
      this.content = await loadContent(lang);
      this.vfs = buildVFS(this.content, lang);
    }

    this.lastFocus = document.activeElement;
    this.open = true;
    this.openedAt = Date.now();
    this.root.hidden = false;
    document.body.classList.add('is-term-open');
    setBackdropInert(true);

    // Make the terminal shareable and Back-button friendly.
    if (!fromHash && location.hash !== HASH) {
      history.pushState(null, '', HASH);
    }

    requestAnimationFrame(() => {
      this.root.classList.add('is-open');
      this.inputEl.focus();
    });

    if (!this.booted) { this.boot(konami); this.booted = true; }
    else if (konami) this.shell.print(konamiLine(getLang()), 'muted');
  }

  hide({ fromHash = false } = {}) {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('is-open');
    document.body.classList.remove('is-term-open');
    setBackdropInert(false);
    this.stopMatrix();

    const finish = () => { this.root.hidden = true; };
    if (reducedMotion()) finish();
    else setTimeout(finish, 240);

    if (!fromHash && location.hash === HASH) {
      history.pushState(null, '', location.pathname + location.search);
    }
    this.lastFocus?.focus?.();
  }

  /* --- boot sequence ------------------------------------------------------ */
  boot(konami) {
    const lang = getLang();
    this.shell.print(narrow() ? BANNER_COMPACT : BANNER, 'ascii');

    const lines = lang === 'zh'
      ? ['bx-sh 1.0 — 纯静态，无后端。', "输入 'help' 查看命令，Esc 退出。"]
      : ['bx-sh 1.0 — static, no backend.', "Type 'help' for commands. Esc to leave."];
    if (konami) lines.push(konamiLine(lang));

    if (reducedMotion()) {
      lines.forEach((line) => this.shell.print(line, 'muted'));
      return;
    }
    lines.forEach((line, i) => {
      setTimeout(() => this.shell.print(line, 'muted'), 110 * (i + 1));
    });
  }

  /* --- matrix ------------------------------------------------------------- */
  runMatrix() {
    this.stopMatrix();
    const line = this.shell.print(' ', 'ascii');
    const cols = Math.min(60, Math.floor(this.scroller.clientWidth / 9)) || 40;
    const rows = 12;
    let ticks = 0;

    this.matrixTimer = setInterval(() => {
      const frame = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
          (Math.random() < 0.22
            ? MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
            : ' ')).join('')).join('\n');
      line.textContent = frame;
      this.shell.scrollToEnd();
      if (++ticks > 26) this.stopMatrix();
    }, 90);
  }

  stopMatrix() {
    if (this.matrixTimer) { clearInterval(this.matrixTimer); this.matrixTimer = null; }
  }
}

function konamiLine(lang) {
  return lang === 'zh'
    ? '↑↑↓↓←→←→BA — 你知道该按什么。'
    : '↑↑↓↓←→←→BA — you knew what to press.';
}

function isTypingTarget(node) {
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
}

function setBackdropInert(on) {
  BACKDROP_REGIONS.forEach((selector) => {
    const node = document.querySelector(selector);
    if (!node) return;
    if (on) { node.inert = true; node.setAttribute('aria-hidden', 'true'); }
    else { node.inert = false; node.removeAttribute('aria-hidden'); }
  });
}

export function initTerminal() {
  const terminal = new Terminal();
  if (location.hash === HASH) terminal.show({ fromHash: true });
  return terminal;
}
