/* ===========================================================================
   vfs.js — virtual filesystem built FROM the content JSON
   This is the point of the whole design: add a project to content/site.*.json
   and it becomes both a card on the page and a cat-able file at
   /projects/<id>. There is no second place to maintain.
   =========================================================================== */

const dir = (name) => ({ type: 'dir', name, children: new Map() });
const file = (name, body) => ({ type: 'file', name, body });

const add = (parent, node) => { parent.children.set(node.name, node); return node; };

const wrap = (label, value) => (value ? `${label}: ${value}\n` : '');
const bullets = (items = []) => items.map((h) => `  - ${h}`).join('\n\n');

function jobFile(job) {
  const body = [
    `${job.company}${job.team ? ` — ${job.team}` : ''}`,
    '='.repeat(48),
    wrap('Role', job.role) + wrap('Where', job.location) + wrap('When', job.date),
    '',
    bullets(job.highlights),
    '',
    job.stack?.length ? `Stack: ${job.stack.join(', ')}` : '',
  ].join('\n');
  return file(`${job.id}.md`, body);
}

function projectFile(p) {
  const body = [
    `${p.name}${p.subtitle ? ` — ${p.subtitle}` : ''}`,
    '='.repeat(48),
    wrap('Role', p.role) + wrap('When', p.date) + wrap('URL', p.url),
    '',
    bullets(p.highlights),
    '',
    p.stack?.length ? `Stack: ${p.stack.join(', ')}` : '',
  ].join('\n');
  return file(`${p.id}.md`, body);
}

function researchFile(r) {
  const body = [
    r.title,
    '='.repeat(48),
    wrap('Role', r.role) + wrap('Advisor', r.advisor) + wrap('When', r.date) + wrap('Repo', r.url),
    '',
    bullets(r.highlights),
    '',
    r.stack?.length ? `Stack: ${r.stack.join(', ')}` : '',
  ].join('\n');
  return file(`${r.id}.md`, body);
}

function schoolFile(s) {
  const body = [
    s.school,
    '='.repeat(48),
    wrap('Degree', s.degree) + wrap('Where', s.location) + wrap('When', s.date) + wrap('Detail', s.detail),
    '',
    s.coursework?.length ? `Coursework: ${s.coursework.join(', ')}` : '',
  ].join('\n');
  return file(`${s.id}.md`, body);
}

/** Build the whole tree for one locale's content bundle. */
export function buildVFS(content, lang) {
  const root = dir('/');
  const p = content.profile ?? {};

  add(root, file('about.txt', (p.bio ?? []).join('\n\n')));
  add(root, file('whoami.txt', [
    p.name,
    p.tagline,
    '',
    wrap('Location', p.location) + wrap('Email', p.email),
    (p.links ?? []).map((l) => `${l.label}: ${l.url}`).join('\n'),
  ].join('\n')));

  const work = add(root, dir('work'));
  (content.experience ?? []).forEach((job) => add(work, jobFile(job)));

  const projects = add(root, dir('projects'));
  (content.projects ?? []).forEach((proj) => add(projects, projectFile(proj)));

  const research = add(root, dir('research'));
  (content.research ?? []).forEach((r) => add(research, researchFile(r)));

  const education = add(root, dir('education'));
  (content.education ?? []).forEach((s) => add(education, schoolFile(s)));

  const shelf = add(root, dir('shelf'));
  (content.shelf ?? []).forEach((b) => {
    const title = b.title?.[lang] ?? b.title?.en ?? b.id;
    const author = b.author?.[lang] ?? b.author?.en ?? '';
    const note = b.note?.[lang] ?? b.note?.en ?? '';
    add(shelf, file(`${b.id}.md`, `${title}\n${'='.repeat(40)}\n${author} · ${b.year ?? ''}\n\n${note}`));
  });

  add(root, file('skills.txt',
    (content.skills ?? []).map((g) => `${g.group}\n  ${g.items.join(', ')}`).join('\n\n')));

  add(root, file('contact.txt',
    [wrap('Email', p.email), (p.links ?? []).map((l) => `${l.label}: ${l.url}`).join('\n')].join('\n')));

  return root;
}

/* --- Path handling -------------------------------------------------------- */

export function normalize(cwd, target) {
  if (!target || target === '.') return cwd;
  const parts = (target.startsWith('/') ? target : `${cwd}/${target}`).split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return `/${stack.join('/')}`;
}

export function resolve(root, path) {
  if (path === '/' || path === '') return root;
  let node = root;
  for (const part of path.split('/').filter(Boolean)) {
    if (node.type !== 'dir') return null;
    node = node.children.get(part);
    if (!node) return null;
  }
  return node;
}

export function listDir(node) {
  if (!node || node.type !== 'dir') return [];
  return [...node.children.values()]
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
}

/** Recursive tree rendering, in the shape `tree(1)` produces. */
export function renderTree(node, prefix = '') {
  const entries = listDir(node);
  return entries.flatMap((child, i) => {
    const last = i === entries.length - 1;
    const line = `${prefix}${last ? '└── ' : '├── '}${child.name}${child.type === 'dir' ? '/' : ''}`;
    return child.type === 'dir'
      ? [line, ...renderTree(child, `${prefix}${last ? '    ' : '│   '}`)]
      : [line];
  });
}

/** Candidate names under `path` for tab completion. */
export function completionsAt(root, cwd, partial) {
  const slash = partial.lastIndexOf('/');
  const dirPart = slash === -1 ? '' : partial.slice(0, slash + 1);
  const namePart = slash === -1 ? partial : partial.slice(slash + 1);
  const node = resolve(root, normalize(cwd, dirPart || '.'));
  if (!node || node.type !== 'dir') return [];
  return listDir(node)
    .filter((child) => child.name.startsWith(namePart))
    .map((child) => `${dirPart}${child.name}${child.type === 'dir' ? '/' : ''}`);
}
