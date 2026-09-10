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
      scroller: this.scroller,
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

  /* --- DOM ---------------------------------------------------------------
     No window chrome: full viewport, one narrow column, nothing else. */
  buildDOM() {
    const root = document.createElement('div');
    root.className = 'term';
    root.id = 'terminal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Terminal');
    root.hidden = true;
    root.dataset.termTheme = this.theme;

    /* The only exit affordance for a pointer user, now that there is no
       title bar. Esc does the same thing. */
    const esc = document.createElement('button');
    esc.type = 'button';
    esc.className = 'term__esc';
    esc.textContent = 'esc';
    esc.setAttribute('aria-label', 'Close terminal');
    esc.addEventListener('click', () => this.hide());

    const col = document.createElement('div');
    col.className = 'term__col';

    const output = document.createElement('div');
    output.className = 'term__output';
    output.setAttribute('role', 'log');
    output.setAttribute('aria-live', 'polite');
    output.setAttribute('aria-atomic', 'false');

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

    /* Typing shell commands on a phone is miserable, so the common ones stay
       one tap away. */
    const chips = document.createElement('div');
    chips.className = 'term__chips';
    ['help', 'whoami', 'work', 'projects', 'music', 'neofetch', 'clear', 'exit'].forEach((name) => {
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

    col.append(output, inputRow, chips);
    root.append(esc, col);

    // Clicking the empty ground focuses the prompt rather than dismissing —
    // with no panel edge, a click-outside-to-close would fire constantly.
    root.addEventListener('mousedown', (e) => {
      if (e.target === root || e.target === col) {
        e.preventDefault();
        this.inputEl.focus();
      }
    });

    document.body.appendChild(root);

    this.root = root;
    this.outputEl = output;
    this.inputEl = input;
    this.promptEl = prompt;
    this.scroller = root;
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

    // Force a reflow so the opacity transition has a start value to animate
    // from, rather than waiting on requestAnimationFrame. rAF is not
    // guaranteed to fire when the page isn't producing frames, and if it
    // doesn't, the overlay opens stuck at opacity 0 and unfocused.
    void this.root.offsetHeight;
    this.root.classList.add('is-open');
    this.inputEl.focus();

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
      ? ['> 正在读取 boxuan 档案…', "> 输入 'help' 查看命令 · esc 退出"]
      : ['> accessing boxuan archive...', "> type 'help' for commands · esc to exit"];
    if (konami) lines.push(`> ${konamiLine(lang)}`);

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
