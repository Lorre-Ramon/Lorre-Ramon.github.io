# lorre-ramon.github.io

Personal site for **Boxuan Shi / 施博轩** — bilingual, Apple-minimalist, with a
client-side terminal easter egg.

No build step. No dependencies. No backend. Push and it's live.

## Run locally

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

**Serve it over HTTP.** Opening `index.html` via `file://` fails: the content
`fetch()` calls are blocked by CORS and the page renders empty.

## Adding content

Everything that grows lives in `content/`. Add an entry once and it appears in
**three** places automatically — the page, the terminal's virtual filesystem,
and the résumé:

| To add | Edit | Appears at |
|---|---|---|
| A job | `content/site.en.json` + `content/site.zh.json` → `experience[]` | `#work`, `/work/<id>.md`, résumé |
| A project | same files → `projects[]` | `#projects`, `/projects/<id>.md`, résumé |
| A book | `content/shelf.json` → `items[]` | `#shelf`, `/shelf/<id>.md` |

Both locale files must stay structurally identical — same keys, same `id`s. The
renderer and the filesystem builder are locale-agnostic and assume that.

## The terminal

Four ways in: the `~ $ ▮` glyph in the footer, the <kbd>`</kbd> key, the Konami
code, or `/#terminal` (shareable, Back-button friendly).

It is entirely client-side. GitHub Pages runs no server code, and this needs
none — which makes it instant, free, and offline-capable. The virtual filesystem
is generated from the same content JSON as the page, so `cat /work/apple.md`
can never disagree with the card on the page.

`help` lists commands. A few are not listed.

### If you ever want genuinely live data

Ascending order of complexity, all still free:

1. **Client-side fetch to a public API** — works today, subject to CORS and
   unauthenticated rate limits. No secrets possible.
2. **A scheduled GitHub Action that commits a JSON file** — cron regenerates
   `content/live.json`; secrets live in Actions secrets. Still 100% static.
   This is the right answer for "latest commits" or "currently reading".
3. **A function on Vercel or Cloudflare Workers**, called from the page — only
   if a secret is needed at request time. Adds a second deploy target.

## Résumé

`resume.html` renders from the same content JSON, so it cannot drift from the
site. It carries **no phone number** by construction. The committed PDFs in
`assets/resume/` are generated from it:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --no-pdf-header-footer --virtual-time-budget=9000 \
  --print-to-pdf="assets/resume/boxuan-shi-resume.pdf" \
  "http://localhost:8000/resume.html?lang=en"
```

Regenerate them after changing content, or they go stale.

## Design

Tokens in `assets/css/tokens.css` were extracted from apple.com's production
stylesheets rather than eyeballed — see `architecture/design/design-system.md`
for provenance and the four assumptions the extraction corrected.

The one worth knowing: Apple's letter-spacing is **not monotonic**. It runs
tight at reading sizes (`-0.022em` at 17px), flips *positive* through the
mid-range (`+0.012em` at 19px), then tightens again at display sizes
(`-0.015em` at 80px). Reproducing that curve is most of what makes text read as
Apple rather than as Helvetica with a nice palette.

中文 overrides both: tracking to `0` (negative tracking collides Hanzi strokes)
and body line-height to `1.7`.

## Layout

```
index.html · resume.html · 404.html
assets/css/    tokens · base · layout · terminal
assets/js/     i18n · render · main
assets/js/terminal/   index (overlay) · shell (line editing) · commands · vfs · ascii
content/       site.en.json · site.zh.json · shelf.json
architecture/  design docs, plans, session notes
```

## Deploy

Pages serves `main` at the repository root. `.nojekyll` stops Jekyll from
processing the site. Pushing to `main` publishes.
