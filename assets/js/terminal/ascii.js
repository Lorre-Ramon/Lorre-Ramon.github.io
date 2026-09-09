/* ===========================================================================
   ascii.js — banners and ASCII art
   =========================================================================== */

export const BANNER = [
  '██████╗  ██████╗ ██╗  ██╗██╗   ██╗ █████╗ ███╗   ██╗',
  '██╔══██╗██╔═══██╗╚██╗██╔╝██║   ██║██╔══██╗████╗  ██║',
  '██████╔╝██║   ██║ ╚███╔╝ ██║   ██║███████║██╔██╗ ██║',
  '██╔══██╗██║   ██║ ██╔██╗ ██║   ██║██╔══██║██║╚██╗██║',
  '██████╔╝╚██████╔╝██╔╝ ██╗╚██████╔╝██║  ██║██║ ╚████║',
  '╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝',
].join('\n');

/* The full banner is 52 columns and wraps badly under ~420px. */
export const BANNER_COMPACT = [
  '┌──────────────────────────┐',
  '│  b o x u a n   s h i     │',
  '│  施 博 轩                 │',
  '└──────────────────────────┘',
].join('\n');

const AVATAR = [
  '        .--------.        ',
  '       / .------. \\       ',
  '      / /        \\ \\      ',
  '      | |        | |      ',
  '     _| |________| |_     ',
  '   .\' |_|        |_| \'.   ',
  '   \'._____ ____ _____.\'   ',
  '   |     .\'____\'.     |   ',
  '   \'.__.\'.\'    \'.\'.__.\'   ',
  '   \'.__  |      |  __.\'   ',
  '   |   \'.\'.____.\'.\'   |   ',
  '   \'.____\'.____.\'____.\'   ',
  '   \'.______________.\'     ',
];

/** neofetch-style card: art on the left, facts pulled from content JSON. */
export function neofetch(content, lang, extra = {}) {
  const p = content.profile ?? {};
  const counts = {
    work: (content.experience ?? []).length,
    projects: (content.projects ?? []).length,
    research: (content.research ?? []).length,
    shelf: (content.shelf ?? []).length,
  };

  const rows = [
    [p.name ?? '', ''],
    ['─'.repeat(28), ''],
    ['os', 'the web, statically served'],
    ['host', 'github pages'],
    ['shell', 'bx-sh 1.0'],
    ['lang', lang === 'zh' ? '中文' : 'english'],
    ['theme', extra.theme ?? 'mono'],
    ['uptime', extra.uptime ?? '—'],
    ['location', p.location ?? ''],
    ['email', p.email ?? ''],
    ['roles', String(counts.work)],
    ['projects', String(counts.projects)],
    ['research', String(counts.research)],
    ['shelf', String(counts.shelf)],
  ];

  const text = rows.map(([k, v]) => (v === '' ? k : `${k.padEnd(10)} ${v}`));
  const height = Math.max(AVATAR.length, text.length);
  const pad = ' '.repeat(AVATAR[0].length);

  return Array.from({ length: height }, (_, i) =>
    `${AVATAR[i] ?? pad}  ${text[i] ?? ''}`.trimEnd()).join('\n');
}

export const COFFEE = [
  '      (  )   (   )  )',
  '       ) (   )  (  (',
  '       ( )  (    ) )',
  '       _____________',
  '      <_____________> ___',
  '      |             |/ _ \\',
  '      |               | | |',
  '      |               |_| |',
  '   ___|             |\\___/',
  '  /    \\___________/    \\',
  '  \\_____________________/',
].join('\n');

export const MATRIX_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789';
