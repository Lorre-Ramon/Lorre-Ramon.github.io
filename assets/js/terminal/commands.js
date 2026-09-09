/* ===========================================================================
   commands.js — the command registry
   Each command gets a context object and returns output (string) or handles
   its own printing. Nothing here ever touches innerHTML.
   =========================================================================== */

import { normalize, resolve, listDir, renderTree } from './vfs.js';
import { BANNER, BANNER_COMPACT, neofetch, COFFEE, MATRIX_CHARS } from './ascii.js';

const T = {
  noSuchFile: { en: (p) => `cat: ${p}: No such file or directory`,
                zh: (p) => `cat: ${p}: 没有那个文件或目录` },
  isDir:      { en: (p) => `cat: ${p}: Is a directory`,
                zh: (p) => `cat: ${p}: 是一个目录` },
  noSuchDir:  { en: (p) => `cd: ${p}: No such directory`,
                zh: (p) => `cd: ${p}: 没有那个目录` },
  notFound:   { en: (c) => `bx-sh: command not found: ${c}. Try 'help'.`,
                zh: (c) => `bx-sh: 未找到命令：${c}。试试 'help'。` },
};
const t = (key, lang, arg) => T[key][lang === 'zh' ? 'zh' : 'en'](arg);

export const commands = {
  help: {
    desc: { en: 'list available commands', zh: '列出可用命令' },
    run(ctx) {
      const visible = Object.entries(commands).filter(([, c]) => !c.hidden);
      const width = Math.max(...visible.map(([n]) => n.length)) + 2;
      const lines = visible.map(([name, c]) =>
        `  ${name.padEnd(width)}${c.desc[ctx.lang === 'zh' ? 'zh' : 'en']}`);
      const hint = ctx.lang === 'zh'
        ? "\n提示：Tab 补全，↑/↓ 翻历史，Esc 退出。还有几个命令没有列出来。"
        : "\nTab completes. ↑/↓ walks history. Esc closes. A few commands aren't listed.";
      return [ctx.lang === 'zh' ? '可用命令：' : 'Available commands:', ...lines, hint].join('\n');
    },
  },

  ls: {
    desc: { en: 'list directory contents', zh: '列出目录内容' },
    run(ctx, args) {
      const path = normalize(ctx.cwd, args[0] ?? '.');
      const node = resolve(ctx.vfs, path);
      if (!node) return { err: t('noSuchDir', ctx.lang, args[0] ?? '.') };
      if (node.type === 'file') return node.name;
      const entries = listDir(node);
      if (!entries.length) return '';
      return entries.map((c) => (c.type === 'dir' ? `${c.name}/` : c.name)).join('   ');
    },
  },

  cd: {
    desc: { en: 'change directory', zh: '切换目录' },
    run(ctx, args) {
      const target = args[0] ?? '/';
      const path = normalize(ctx.cwd, target);
      const node = resolve(ctx.vfs, path);
      if (!node || node.type !== 'dir') return { err: t('noSuchDir', ctx.lang, target) };
      ctx.setCwd(path);
      return '';
    },
  },

  pwd: {
    desc: { en: 'print working directory', zh: '显示当前目录' },
    run(ctx) { return ctx.cwd || '/'; },
  },

  cat: {
    desc: { en: 'print a file', zh: '打印文件内容' },
    run(ctx, args) {
      if (!args[0]) return { err: 'cat: missing operand' };
      // Failures are reported through `err` so they render red, the same way
      // `cd` reports a bad path. Reading three files where one is missing
      // still prints the two that resolved.
      const errs = [];
      const outs = [];
      args.forEach((arg) => {
        const node = resolve(ctx.vfs, normalize(ctx.cwd, arg));
        if (!node) errs.push(t('noSuchFile', ctx.lang, arg));
        else if (node.type === 'dir') errs.push(t('isDir', ctx.lang, arg));
        else outs.push(node.body);
      });
      return { err: errs.join('\n'), out: outs.join('\n\n') };
    },
  },

  tree: {
    desc: { en: 'show the filesystem as a tree', zh: '以树状显示文件系统' },
    run(ctx, args) {
      const path = normalize(ctx.cwd, args[0] ?? '.');
      const node = resolve(ctx.vfs, path);
      if (!node || node.type !== 'dir') return { err: t('noSuchDir', ctx.lang, args[0] ?? '.') };
      return [path, ...renderTree(node)].join('\n');
    },
  },

  whoami:  { desc: { en: 'who is this', zh: '我是谁' },
             run: (ctx) => resolve(ctx.vfs, '/whoami.txt')?.body ?? '' },
  about:   { desc: { en: 'the short version', zh: '简介' },
             run: (ctx) => resolve(ctx.vfs, '/about.txt')?.body ?? '' },
  skills:  { desc: { en: 'tools and methods', zh: '技能与工具' },
             run: (ctx) => resolve(ctx.vfs, '/skills.txt')?.body ?? '' },
  contact: { desc: { en: 'how to reach me', zh: '联系方式' },
             run: (ctx) => resolve(ctx.vfs, '/contact.txt')?.body ?? '' },

  work: {
    desc: { en: 'work experience', zh: '实习经历' },
    run: (ctx) => summarize(ctx, 'work'),
  },
  projects: {
    desc: { en: 'things I have built', zh: '项目经历' },
    run: (ctx) => summarize(ctx, 'projects'),
  },
  research: {
    desc: { en: 'research', zh: '研究经历' },
    run: (ctx) => summarize(ctx, 'research'),
  },
  education: {
    desc: { en: 'education', zh: '教育背景' },
    run: (ctx) => summarize(ctx, 'education'),
  },
  shelf: {
    desc: { en: 'what I am reading', zh: '书架' },
    run: (ctx) => summarize(ctx, 'shelf'),
  },
  music: {
    desc: { en: 'what I am listening to', zh: '唱片' },
    run: (ctx) => summarize(ctx, 'music'),
  },

  resume: {
    desc: { en: 'open the resume (PDF)', zh: '打开简历 (PDF)' },
    run(ctx) {
      // The page, not the PDF: it renders from the same content JSON, so it can
      // never go stale, and it reads properly on a phone.
      const url = '/resume.html';
      window.open(url, '_blank', 'noopener');
      return ctx.lang === 'zh'
        ? `正在新标签页打开 ${url}（页面内可打印为 PDF）。`
        : `Opening ${url} in a new tab — print to PDF from there.`;
    },
  },

  lang: {
    desc: { en: 'switch language: lang en | zh', zh: '切换语言：lang en | zh' },
    run(ctx, args) {
      const target = args[0];
      if (!target) return `${ctx.lang}`;
      if (!['en', 'zh'].includes(target)) return { err: 'lang: expected "en" or "zh"' };
      ctx.setLang(target);
      return target === 'zh' ? '语言已切换为中文。' : 'Language set to English.';
    },
  },

  theme: {
    desc: { en: 'terminal theme: mono | green | amber', zh: '终端主题：mono | green | amber' },
    run(ctx, args) {
      const target = args[0];
      if (!target) return ctx.theme;
      if (!['mono', 'green', 'amber'].includes(target)) {
        return { err: 'theme: expected "mono", "green" or "amber"' };
      }
      ctx.setTheme(target);
      return `theme → ${target}`;
    },
  },

  neofetch: {
    desc: { en: 'system info', zh: '系统信息' },
    run: (ctx) => ({ ascii: neofetch(ctx.content, ctx.lang, { theme: ctx.theme, uptime: ctx.uptime() }) }),
  },

  banner: {
    desc: { en: 'print the banner', zh: '打印横幅' },
    run: (ctx) => ({ ascii: ctx.narrow() ? BANNER_COMPACT : BANNER }),
  },

  history: {
    desc: { en: 'command history', zh: '命令历史' },
    run: (ctx) => ctx.history.map((c, i) => `  ${String(i + 1).padStart(3)}  ${c}`).join('\n'),
  },

  echo: {
    desc: { en: 'print arguments', zh: '打印参数' },
    run: (ctx, args) => args.join(' '),
  },

  clear: {
    desc: { en: 'clear the screen', zh: '清屏' },
    run(ctx) { ctx.clear(); return ''; },
  },

  exit: {
    desc: { en: 'close the terminal', zh: '关闭终端' },
    run(ctx) { ctx.close(); return ''; },
  },

  /* --- undocumented ------------------------------------------------------ */

  sudo: {
    hidden: true,
    desc: { en: '', zh: '' },
    run: (ctx) => ({
      err: ctx.lang === 'zh'
        ? 'sudo: 施博轩 不在 sudoers 文件中。此事将被上报。'
        : 'sudo: boxuan is not in the sudoers file. This incident will be reported.',
    }),
  },

  matrix: {
    hidden: true,
    desc: { en: '', zh: '' },
    run(ctx) {
      if (ctx.reducedMotion()) return { ascii: MATRIX_CHARS };
      ctx.matrix();
      return '';
    },
  },

  coffee: {
    hidden: true,
    desc: { en: '', zh: '' },
    run: (ctx) => ({
      ascii: `${COFFEE}\n\n${ctx.lang === 'zh' ? '  ☕ 还在煮。' : '  ☕ Still brewing.'}`,
    }),
  },

  credits: {
    hidden: true,
    desc: { en: '', zh: '' },
    run: (ctx) => [
      'bx-sh 1.0',
      '',
      ctx.lang === 'zh'
        ? '纯客户端实现。没有后端，没有冷启动，离线可用。'
        : 'Entirely client-side. No backend, no cold start, works offline.',
      ctx.lang === 'zh'
        ? '文件系统由 content/site.*.json 生成——与页面同源。'
        : 'The filesystem is generated from content/site.*.json — same source as the page.',
      '',
      ctx.lang === 'zh' ? '排版参考 apple.com 的生产样式表。' : 'Type scale extracted from apple.com production CSS.',
    ].join('\n'),
  },
};

/** Shared summary renderer for the section commands. */
function summarize(ctx, dirName) {
  const node = resolve(ctx.vfs, `/${dirName}`);
  const entries = listDir(node);
  if (!entries.length) {
    return ctx.lang === 'zh' ? '（暂无条目）' : '(nothing here yet)';
  }
  const hint = ctx.lang === 'zh'
    ? `\n用 'cat /${dirName}/<文件>' 查看详情。`
    : `\nUse 'cat /${dirName}/<file>' for detail.`;
  return [
    entries.map((c) => `  ${c.name}`).join('\n'),
    hint,
  ].join('\n');
}

export function commandNames({ includeHidden = false } = {}) {
  return Object.entries(commands)
    .filter(([, c]) => includeHidden || !c.hidden)
    .map(([name]) => name);
}

export function lookup(name) {
  return commands[name] ?? null;
}

export const notFoundMessage = (name, lang) => t('notFound', lang, name);
