/* ===========================================================================
   render.js — content JSON → DOM
   Every list that grows lives here. Adding an entry to content/site.*.json
   makes it appear on the page and, via vfs.js, inside the terminal too.
   Built with createElement/textContent throughout — never innerHTML — so
   content can never become a markup-injection surface.
   =========================================================================== */

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

function bulletList(items, className = 'entry__list') {
  const ul = el('ul', className);
  items.forEach((text) => ul.appendChild(el('li', null, text)));
  return ul;
}

function tagRow(stack) {
  if (!stack?.length) return null;
  const row = el('div', 'tags');
  stack.forEach((t) => row.appendChild(el('span', 'tag', t)));
  return row;
}

/* --- Experience & education share the two-column timeline entry ----------- */
function timelineEntry({ date, org, sub, highlights, stack, location }) {
  const entry = el('article', 'entry reveal');

  const meta = el('div', 'entry__meta');
  meta.appendChild(el('div', 'entry__date', date));
  entry.appendChild(meta);

  const body = el('div', 'entry__body');
  body.appendChild(el('h3', 'entry__org', org));
  if (sub) body.appendChild(el('div', 'entry__role', sub));
  if (location) body.appendChild(el('div', 't-caption', location));
  if (highlights?.length) body.appendChild(bulletList(highlights));
  const tags = tagRow(stack);
  if (tags) body.appendChild(tags);

  entry.appendChild(body);
  return entry;
}

export function renderExperience(node, items) {
  clear(node);
  items.forEach((job) => {
    node.appendChild(timelineEntry({
      date: job.date,
      org: job.team ? `${job.company} · ${job.team}` : job.company,
      sub: job.role,
      location: job.location,
      highlights: job.highlights,
      stack: job.stack,
    }));
  });
}

export function renderEducation(node, items) {
  clear(node);
  items.forEach((school) => {
    node.appendChild(timelineEntry({
      date: school.date,
      org: school.school,
      sub: school.degree,
      location: school.location,
      highlights: [school.detail].filter(Boolean),
      stack: school.coursework,
    }));
  });
}

/* --- Projects & research share the card ---------------------------------- */
function card({ title, sub, date, url, highlights, stack, linkLabel }) {
  const article = el('article', 'card reveal');

  const head = el('div', 'card__head');
  head.appendChild(el('h3', 'card__title', title));
  if (sub) head.appendChild(el('span', 'card__sub', sub));
  article.appendChild(head);

  if (date) article.appendChild(el('div', 'card__date', date));
  if (highlights?.length) article.appendChild(bulletList(highlights));

  const tags = tagRow(stack);
  if (tags) article.appendChild(tags);

  if (url) {
    const link = el('a', 'card__link', linkLabel);
    link.href = url;
    link.rel = 'noopener';
    if (!url.startsWith('mailto:')) link.target = '_blank';
    const wrap = el('div', 'tags');
    wrap.appendChild(link);
    article.appendChild(wrap);
  }
  return article;
}

export function renderProjects(node, items, lang) {
  clear(node);
  const label = lang === 'zh' ? '访问网站 →' : 'Visit site →';
  items.forEach((p) => {
    node.appendChild(card({
      title: p.name,
      sub: p.subtitle,
      date: p.role ? `${p.date} · ${p.role}` : p.date,
      url: p.url,
      highlights: p.highlights,
      stack: p.stack,
      linkLabel: label,
    }));
  });
}

export function renderResearch(node, items, lang) {
  clear(node);
  const label = lang === 'zh' ? '查看仓库 →' : 'View repo →';
  items.forEach((r) => {
    node.appendChild(card({
      title: r.title,
      sub: r.role,
      date: r.advisor ? `${r.date} · ${r.advisor}` : r.date,
      url: r.url,
      highlights: r.highlights,
      stack: r.stack,
      linkLabel: label,
    }));
  });
}

export function renderSkills(node, groups) {
  clear(node);
  groups.forEach((g) => {
    const block = el('div', 'skills__group reveal');
    block.appendChild(el('div', 'skills__group-name', g.group));
    const row = el('div', 'tags');
    g.items.forEach((item) => row.appendChild(el('span', 'tag', item)));
    block.appendChild(row);
    node.appendChild(block);
  });
}

export function renderShelf(node, items, lang) {
  clear(node);
  if (!items.length) {
    node.appendChild(el('p', 't-secondary',
      lang === 'zh' ? '还没有条目。' : 'Nothing here yet.'));
    return;
  }
  items.forEach((book) => {
    const row = el('div', 'shelf__item reveal');
    row.appendChild(el('div', 'shelf__title', book.title?.[lang] ?? book.title?.en ?? ''));
    row.appendChild(el('div', 'shelf__author', book.author?.[lang] ?? book.author?.en ?? ''));
    const note = book.note?.[lang] ?? book.note?.en;
    if (note) row.appendChild(el('p', 'shelf__note', note));
    node.appendChild(row);
  });
}

/**
 * Album grid. Cover art is hotlinked from Apple's CDN and each tile links to
 * the record: the images are copyrighted, so they are shown in the context of
 * a link to the release rather than copied into this repo.
 */
export function renderMusic(node, items, lang) {
  if (!node) return;
  clear(node);
  items.forEach((rec) => {
    const tile = el('a', 'album reveal');
    tile.href = rec.url || '#';
    tile.rel = 'noopener';
    if (rec.url) tile.target = '_blank';

    const frame = el('div', 'album__art');
    if (rec.art) {
      const img = el('img');
      img.src = rec.art;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 300; img.height = 300;   // reserve the box, so no layout shift
      // The cover is decoration; the title beneath already names the record.
      img.alt = '';
      frame.appendChild(img);
    }
    tile.appendChild(frame);

    tile.appendChild(el('div', 'album__work', rec.work?.[lang] ?? rec.work?.en ?? ''));
    tile.appendChild(el('div', 'album__performer', rec.performer?.[lang] ?? rec.performer?.en ?? ''));
    node.appendChild(tile);
  });
}

export function renderContact(node, links) {
  clear(node);
  links.forEach((link, i) => {
    const a = el('a', i === 0 ? 'btn btn--primary' : 'btn btn--secondary', link.label);
    a.href = link.url;
    a.rel = 'noopener';
    if (!link.url.startsWith('mailto:')) a.target = '_blank';
    node.appendChild(a);
  });
}

/** Render every data-driven region for a locale. */
export function renderAll(content, lang) {
  const at = (id) => document.getElementById(id);
  renderExperience(at('experience-list'), content.experience ?? []);
  renderEducation(at('education-list'), content.education ?? []);
  renderProjects(at('projects-list'), content.projects ?? [], lang);
  renderResearch(at('research-list'), content.research ?? [], lang);
  renderSkills(at('skills-list'), content.skills ?? []);
  renderShelf(at('shelf-list'), content.shelf ?? [], lang);
  renderMusic(at('music-list'), content.music ?? [], lang);
  renderContact(at('contact-links'), content.profile?.links ?? []);
}
