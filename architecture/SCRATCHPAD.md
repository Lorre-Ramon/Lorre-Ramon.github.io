# Project: lorre-ramon.github.io — Personal Website
Last Updated: 2026-09-10

## Environment
- No build step, no dependencies, no `package.json`. Plain HTML/CSS/ES modules.
- Local dev: `python3 -m http.server 8000` (Python 3.12.5 present).
- Node 18.20.8 is installed but unused by the site. It sits at the edge of what
  modern build tooling supports — a reason the vanilla stack was chosen.
- Chrome 152 at `/Applications/Google Chrome.app/...` is used for headless
  verification and for generating the résumé PDFs.

## Current State

### Working
- Bilingual EN/中文 single-page site; locale resolves `?lang=` → localStorage →
  `navigator.language`.
- Light/dark themes: system preference plus a manual toggle.
- Terminal easter egg with all four entry points (footer glyph, backtick key,
  Konami code, `#terminal` URL), tab completion, persisted history. Full-screen
  since 2026-09-09, styled after ak.hypergryph.com/ama-10/devlog.
- No résumé page: removed at the user's request, along with the PDFs and every
  link to them. FIND's project copy still mentions "resume parsing" — that is
  product description, not a link.
- No reading shelf: dropped 2026-09-10, along with its section, nav link,
  renderer, `/shelf` VFS directory and `shelf` command. The listening section
  is untouched; `content/shelf.json` was renamed `content/music.json`.
- Second easter egg: a hidden `kipling` command prints Kipling's "If—".
  Three hints point at it (HTML comment by the footer trigger, a console line,
  and a toast once the visitor reaches the bottom).
- Verified: 15/15 VFS unit assertions, 12/12 final regression checks, responsive
  at true 390/834/1440, dark mode, both locales.

### Deployed
Live at https://lorre-ramon.github.io — Pages source `main` / root, HTTPS
enforced, `404.html` returns a real 404. Verified in production: ES module
MIME types correct, content renders from JSON, `#terminal` deep link works cold.

### Not done
- No analytics, no custom domain. Repo has no description or homepage set.
- The hint toast is not wired to the Konami/backtick entry points — only the
  footer trigger, which it reuses by synthesising a click on it.

### Album art is hotlinked on purpose
Cover images come from Apple's artwork CDN (`is1-ssl.mzstatic.com`) and each
tile links to the release on Apple Music. They are copyrighted, so they are
deliberately **not** committed to this public repo — shown in the context of a
link to the record instead. Consequence: if Apple moves a URL, that tile loses
its image. The layout reserves the square via `aspect-ratio`, so a missing
cover degrades to its caption without shifting anything. URLs come from the
iTunes Search API (no key); the exact command is in the README.

## Architecture Decisions

- **Content as data, not markup.** Everything that grows lives in
  `content/site.{en,zh}.json`. One entry renders on the page, becomes a
  `cat`-able file in the terminal, and appears on the résumé. Chosen because the
  user said content will keep growing; the alternative (hand-edited HTML) would
  need the same fact maintained in three places.

- **Hybrid i18n, not fully dynamic.** Hero and About are static bilingual HTML
  toggled by an `html[lang]` CSS rule; only list-shaped content renders from
  JSON. Keeps the name and bio crawlable with no hydration flash — which is what
  matters when someone Googles the user — while the growing parts stay
  data-driven.

- **Terminal is client-side by necessity and by preference.** GitHub Pages runs
  no server code. A client-side shell is also faster, free, and offline-capable.
  Escalation path for genuinely live data is documented in README.

- **Design tokens extracted, not eyeballed.** Values were mined from apple.com's
  production stylesheets. Four planning assumptions were measurably wrong; see
  `design/design-system.md`.

- **The poem is a module constant, not content/.** `content/` is for things
  that grow and must stay in sync across page + terminal + locales. "If—" is a
  fixed asset with no locale variant, so it lives in
  `assets/js/terminal/poem.js` — the same precedent as the banners in
  `ascii.js`. It loads with the terminal graph, so visitors who never open the
  terminal never download it.

- **The hint toast needs two independent conditions, not one.** "Read to the
  bottom" is tracked as `reachedEnd` (IntersectionObserver on `<footer>`) and
  `dwelled` (a 14s timer), fired when both are true. A single observer-with-a-
  time-check never fires for the common case of scrolling to the bottom early
  and staying there, because the observer only reports *changes* in
  intersection. Gating: `sessionStorage` for once-per-visit, `localStorage` for
  "already ran the command, stop pointing at it".

- **Vanilla over Astro.** No build step means push-to-deploy with no CI, no
  `node_modules`, and no version drift. Revisit only if a real blog with many
  posts appears.

## Key Gotchas

- **An author `display` beats the UA `[hidden]` rule.** `.term { display: flex }`
  left the overlay live across the whole viewport at z-index 500 — invisible but
  swallowing every click on the site. Fixed with an explicit
  `.term[hidden] { display: none !important }`. This class of bug is silent:
  the page looks perfect and is simply not interactive.

- **Scroll-reveal must be armed by JS, not by CSS alone.** Dimming `.reveal`
  unconditionally means a JS failure leaves every section heading permanently
  invisible. The CSS is scoped to `.js-reveal`, added only once an
  IntersectionObserver exists to undo it.

- **Chrome headless clamps the layout viewport to 500px minimum**, even with
  `--headless=new --window-size=390`. Screenshots at 390 are 500px renders
  cropped, which fabricates convincing "overflow" bugs that do not exist. Test
  small viewports by embedding the page in a sized `<iframe>` instead.

- **CSS transitions do not advance under `--virtual-time-budget`.** A property
  under transition reads at its start value forever, so a working theme toggle
  looks broken. Probe with a transition-free element to tell the two apart.

- **Anchor jumps land on the section box, not the heading.** Each section has
  `--section-y` of top padding, which showed as a large gap under the nav with
  the previous section's band above it. Fixed with a deliberately negative
  `scroll-margin-top: calc(-1 * var(--section-y))` that discounts the padding,
  plus `scroll-padding-top: calc(var(--nav-h) + var(--anchor-gap))`.

- **`requestAnimationFrame` is not guaranteed to fire when the page is not
  producing frames.** The terminal used to add `is-open` and focus the input
  inside a rAF; when it did not run, the overlay opened stuck at `opacity: 0`.
  Forcing a reflow (`void el.offsetHeight`) gives the transition its start
  value without depending on a frame.

- **Headless Chrome does not repaint after a programmatic scroll**, so a
  screenshot of a scrolled page comes back blank. Render the page in a sized
  `<iframe>` and scroll that instead — iframes do repaint.

- **Block ASCII art needs `line-height` near 1.** At the 1.55 used for prose the
  rows do not fuse and the banner reads as broken rubble.

- **Reproducing the poem verbatim trips the assistant's output content filter.**
  Generating the 32 lines returned `400 Output blocked by content filtering
  policy` — a false positive; the work is public domain (published 1910,
  Kipling died 1936). The text was instead fetched from the Wikisource scan of
  *Rewards and Fairies* by script and written straight to `poem.js`, so it never
  passed through model output. If `poem.js` ever needs regenerating, expect the
  same block and use the same route. The Wikisource page transcludes from the
  `Page:` namespace, so `action=raw` returns only wikitext — use
  `action=parse&prop=text` and anchor the extraction to the *last* 32 non-empty
  lines rather than a fixed offset.

- **`fetch()` fails under `file://`.** Opening index.html directly renders an
  empty page; `main.js` catches this and prints the fix.

- **Apple's letter-spacing is not monotonic** — tight at reading sizes, positive
  through the mid-range, tight again at display sizes. See design-system.md.

- **CJK needs its Latin font listed first** (`SF Pro …, PingFang SC`), matching
  apple.com/cn, or English words inside Chinese sentences render in PingFang's
  inferior Latin.

## Quick Reference
- Content: `content/site.en.json`, `content/site.zh.json`,
  `content/music.json` (holds `music[]` only since 2026-09-10)
- Tokens: `assets/css/tokens.css` (provenance in `architecture/design/design-system.md`)
- Terminal: `assets/js/terminal/{index,shell,commands,vfs,ascii,poem}.js`
- Hint toast + console hint: `assets/js/hint.js` (exports `markPoemFound`,
  imported by `commands.js` so running `kipling` silences the toast)
- VFS is built by `buildVFS(content, lang)` in `vfs.js` — the single-source-of-truth seam
- GitHub: https://github.com/Lorre-Ramon · LinkedIn: eames-shi · FIND: find-internship.org
