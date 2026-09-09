# Project: lorre-ramon.github.io — Personal Website
Last Updated: 2026-09-09

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
  Konami code, `#terminal` URL), 28 commands, tab completion, persisted history.
- `resume.html` renders from the same content JSON; PDFs generated from it and
  committed to `assets/resume/`.
- Verified: 15/15 VFS unit assertions, 12/12 final regression checks, responsive
  at true 390/834/1440, dark mode, both locales.

### Deployed
Live at https://lorre-ramon.github.io — Pages source `main` / root, HTTPS
enforced, `404.html` returns a real 404. Verified in production: ES module
MIME types correct, content renders from JSON, `#terminal` deep link works cold.

### Not done
- Shelf notes are descriptive (what each book is), not personal reactions.
- No analytics, no custom domain. Repo has no description or homepage set.

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

- **Block ASCII art needs `line-height` near 1.** At the 1.55 used for prose the
  rows do not fuse and the banner reads as broken rubble.

- **`fetch()` fails under `file://`.** Opening index.html directly renders an
  empty page; `main.js` catches this and prints the fix.

- **Apple's letter-spacing is not monotonic** — tight at reading sizes, positive
  through the mid-range, tight again at display sizes. See design-system.md.

- **CJK needs its Latin font listed first** (`SF Pro …, PingFang SC`), matching
  apple.com/cn, or English words inside Chinese sentences render in PingFang's
  inferior Latin.

## Quick Reference
- Content: `content/site.en.json`, `content/site.zh.json`, `content/shelf.json`
- Tokens: `assets/css/tokens.css` (provenance in `architecture/design/design-system.md`)
- Terminal: `assets/js/terminal/{index,shell,commands,vfs,ascii}.js`
- VFS is built by `buildVFS(content, lang)` in `vfs.js` — the single-source-of-truth seam
- Résumé source: `resume.html`; PDFs regenerated via the Chrome command in README
- GitHub: https://github.com/Lorre-Ramon · LinkedIn: eames-shi · FIND: find-internship.org
