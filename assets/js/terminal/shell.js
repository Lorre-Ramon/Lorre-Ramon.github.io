/* ===========================================================================
   shell.js — line editing, history, completion, dispatch
   All output goes through textContent. The terminal is never an injection
   surface, even though every keystroke in it is the visitor's own.
   =========================================================================== */

import { commands, commandNames, lookup, notFoundMessage } from './commands.js';
import { completionsAt, normalize } from './vfs.js';

const HISTORY_KEY = 'bx.term.history';
const HISTORY_MAX = 100;

/** Minimal tokenizer: whitespace-separated, with quoted strings held together. */
function tokenize(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.slice(-HISTORY_MAX) : [];
  } catch { return []; }
}

function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX))); }
  catch { /* private mode — history is simply not persisted */ }
}

export class Shell {
  constructor({ output, input, prompt, ctx }) {
    this.output = output;
    this.input = input;
    this.promptEl = prompt;
    this.ctxProvider = ctx;

    this.cwd = '/';
    this.history = loadHistory();
    this.historyIndex = this.history.length;
    this.draft = '';

    this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  /* --- context handed to every command ---------------------------------- */
  context() {
    return {
      ...this.ctxProvider(),
      cwd: this.cwd,
      setCwd: (path) => { this.cwd = path; this.renderPrompt(); },
      history: this.history,
      clear: () => this.clear(),
    };
  }

  renderPrompt() {
    this.promptEl.textContent = `~${this.cwd === '/' ? '' : this.cwd} $`;
  }

  /* --- output ------------------------------------------------------------ */
  print(text, kind = 'out') {
    if (text == null || text === '') return;
    const line = document.createElement('div');
    line.className = `term__line term__line--${kind}`;
    line.textContent = text;                 // never innerHTML
    this.output.appendChild(line);
    this.scrollToEnd();
    return line;
  }

  printEcho(line) {
    const row = document.createElement('div');
    row.className = 'term__line term__line--echo';

    const prompt = document.createElement('span');
    prompt.className = 'term__echo-prompt';
    prompt.textContent = `~${this.cwd === '/' ? '' : this.cwd} $ `;

    const cmd = document.createElement('span');
    cmd.textContent = line;

    row.append(prompt, cmd);
    this.output.appendChild(row);
    this.scrollToEnd();
  }

  clear() {
    while (this.output.firstChild) this.output.removeChild(this.output.firstChild);
  }

  scrollToEnd() {
    const scroller = this.output.parentElement ?? this.output;
    scroller.scrollTop = scroller.scrollHeight;
  }

  /* --- dispatch ---------------------------------------------------------- */
  run(rawLine) {
    const line = rawLine.trim();
    this.printEcho(rawLine);

    if (line) {
      if (this.history[this.history.length - 1] !== line) {
        this.history.push(line);
        saveHistory(this.history);
      }
      this.historyIndex = this.history.length;
    }
    if (!line) return;

    const [name, ...args] = tokenize(line);
    const command = lookup(name);
    const ctx = this.context();

    if (!command) {
      this.print(notFoundMessage(name, ctx.lang), 'err');
      return;
    }

    let result;
    try {
      result = command.run(ctx, args);
    } catch (err) {
      this.print(`bx-sh: ${name}: ${err.message}`, 'err');
      return;
    }

    if (result == null || result === '') return;
    if (typeof result === 'string') { this.print(result, 'out'); return; }
    if (result.err)   this.print(result.err, 'err');
    if (result.ascii) this.print(result.ascii, 'ascii');
    if (result.out)   this.print(result.out, 'out');
  }

  /* --- key handling ------------------------------------------------------ */
  onKeyDown(e) {
    const { key, ctrlKey } = e;

    if (ctrlKey && (key === 'c' || key === 'C')) {
      e.preventDefault();
      this.printEcho(`${this.input.value}^C`);
      this.input.value = '';
      return;
    }
    if (ctrlKey && (key === 'l' || key === 'L')) {
      e.preventDefault();
      this.clear();
      return;
    }
    if (ctrlKey && (key === 'd' || key === 'D')) {
      e.preventDefault();
      this.context().close();
      return;
    }

    switch (key) {
      case 'Enter': {
        e.preventDefault();
        const value = this.input.value;
        this.input.value = '';
        this.run(value);
        break;
      }
      case 'ArrowUp':
        e.preventDefault();
        this.walkHistory(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.walkHistory(1);
        break;
      case 'Tab':
        e.preventDefault();
        this.complete();
        break;
      default:
        break;
    }
  }

  walkHistory(step) {
    if (!this.history.length) return;
    if (this.historyIndex === this.history.length) this.draft = this.input.value;

    const next = this.historyIndex + step;
    if (next < 0) return;
    if (next >= this.history.length) {
      this.historyIndex = this.history.length;
      this.input.value = this.draft;
    } else {
      this.historyIndex = next;
      this.input.value = this.history[next];
    }
    // Park the caret at the end, where a shell would leave it.
    requestAnimationFrame(() => {
      const end = this.input.value.length;
      this.input.setSelectionRange(end, end);
    });
  }

  /**
   * Tab completion. First token completes against command names; any later
   * token completes against the virtual filesystem at the current path.
   */
  complete() {
    const value = this.input.value;
    const parts = value.split(/\s+/);
    const isFirst = parts.length === 1;
    const partial = parts[parts.length - 1] ?? '';
    const ctx = this.context();

    const candidates = isFirst
      ? commandNames().filter((n) => n.startsWith(partial))
      : completionsAt(ctx.vfs, this.cwd, partial);

    if (!candidates.length) return;

    if (candidates.length === 1) {
      parts[parts.length - 1] = candidates[0];
      const joined = parts.join(' ');
      // Directories keep the caret inside; commands and files get a space.
      this.input.value = candidates[0].endsWith('/') ? joined : `${joined} `;
      return;
    }

    const prefix = commonPrefix(candidates);
    if (prefix.length > partial.length) {
      parts[parts.length - 1] = prefix;
      this.input.value = parts.join(' ');
    }
    this.printEcho(value);
    this.print(candidates.join('   '), 'muted');
  }
}

function commonPrefix(items) {
  if (!items.length) return '';
  let prefix = items[0];
  for (const item of items.slice(1)) {
    while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) break;
  }
  return prefix;
}

export { tokenize, normalize };
