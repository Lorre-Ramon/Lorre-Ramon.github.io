# Personal Website — Debug Log

## 2026-09-09 — Invisible terminal overlay swallowing every click

**Issue**: The page rendered perfectly but nothing on it was clickable.
**Root cause**: `.term { display: flex }` is an author declaration; the UA
stylesheet's `[hidden] { display: none }` loses to it regardless of specificity,
because author styles outrank the UA origin. Setting `root.hidden = true` in JS
therefore did nothing, leaving a full-viewport `position: fixed` overlay at
z-index 500 sitting over the site at `opacity: 0`.
**Fix**: explicit `.term[hidden] { display: none !important; }` in terminal.css.
**Validation**: measured `getComputedStyle(term).display` → `none`, and
`document.elementFromPoint(centre)` → `SECTION.section` rather than the overlay.
**Why it matters**: silent failure mode. Every screenshot looks correct; only
interaction is dead. Any element given both a `display` rule and the `hidden`
attribute has this bug.

## 2026-09-09 — Scroll-reveal would strand content invisible without JS

**Issue**: `.reveal { opacity: 0 }` applied unconditionally from CSS. If JS
failed to load, every section heading and the About copy would stay invisible
permanently — the hero would render and the rest of the page would look empty.
**Root cause**: dimming was armed by CSS while the un-dimming lived in JS. A
code comment claimed progressive enhancement that the code did not implement.
**Fix**: scoped the dimming to `.js-reveal .reveal`, with `js-reveal` added to
`<html>` by `initReveal()` only after an IntersectionObserver is constructed.
Reduced-motion and missing-observer paths never add the class.
**Validation**: regression asserts `documentElement.classList.contains('js-reveal')`
after boot; with JS disabled the CSS rule cannot match.

## 2026-09-09 — `cat` reported failures as normal output

**Issue**: `cat nope.md` printed its error in body text while `cd nope` printed
red, so failures looked like content.
**Root cause**: `cat` mapped every argument to a string and joined, losing the
error/output distinction the shell's `{err, out}` return shape already supported.
**Fix**: collect errors and outputs separately and return both. Reading three
files where one is missing now prints the two that resolved *and* reds the one
that did not.
**Validation**: 4 assertions — missing file reds, mixed read shows both, `cat`
on a directory reds, ordinary `cat` stays plain.

## 2026-09-09 — Block ASCII banner rendered as broken rubble

**Issue**: The boot banner was illegible; letterforms had horizontal seams.
**Root cause**: the banner is one element containing newlines, inheriting the
`line-height: 1.55` used for prose output. Block characters only fuse into
letterforms near line-height 1.
**Fix**: `line-height: 1.05` on `.term__line--ascii`.
**Validation**: re-rendered; "BOXUAN" reads cleanly with its intended shadow.

---

## Two false alarms — recorded so they are not re-investigated

### "Mobile layout overflows at 390px"
Screenshots at `--window-size=390` showed text clipped at the right edge.
**Not a real bug.** Chrome headless clamps the layout viewport to a 500px
minimum, even under `--headless=new`. The screenshot is 390px wide but the page
laid out at 500px, so the right 110px is simply cropped. Instrumentation
confirmed `OVER(0)` overflowing elements and `container === clientWidth`.
**To actually test small viewports**: embed the page in an `<iframe width="390">`
— an iframe establishes a real layout viewport, and media queries inside it
evaluate against it. Verified 390 and 834 this way, both clean.

### "Dark mode toggle does not work"
`--bg` flipped to `#000000` but `getComputedStyle(body).backgroundColor` stayed
white after the toggle.
**Not a real bug.** CSS transitions do not advance under
`--virtual-time-budget`, so `body`'s 320ms `background-color` transition froze at
its start value. A probe element with `transition: none` and the same
`background: var(--bg)` read `rgb(0, 0, 0)` immediately.
**Heuristic**: if a computed style disagrees with its own custom property under
headless, suspect a transition before suspecting the cascade.

## 2026-09-10 — Terminal test assertions polluted by the output buffer
**Issue**: Two end-to-end checks failed — "/shelf gone from vfs" and "neofetch
shows records" — even though the `ls /` listing in the same failure message
plainly showed no `shelf/` directory.
**Root cause**: the assertions read `.term__output` in full, and the buffer
still held the echo and error text of an earlier `run("shelf")`. The site was
correct; the test was reading history.
**Fix**: a `fresh(cmd)` helper that runs `clear` before each command so an
assertion only ever sees the output it is about.
**Validation**: 13/13 checks pass. Worth remembering — any assertion against
this terminal must clear first, because output is append-only by design.

## 2026-09-10 — Poem extraction off by one line
**Issue**: Extracting the verse from the Wikisource HTML yielded 31 lines, not
32, and the guard refused to write the file.
**Root cause**: the extraction was anchored to a fixed offset (`lines[3:35]`)
computed before a zero-width space was stripped. Removing it collapsed a line
and shifted every index by one.
**Fix**: anchor to the end instead — `lines[-32:]` — since the poem terminates
the page. Kept the assertions on line count and final punctuation.
**Validation**: 4 stanzas × 8 lines written; `node --check` parses; the rendered
output was confirmed in a real browser.
