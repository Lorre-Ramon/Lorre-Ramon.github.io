# Learning Log

A running log of key takeaways from coding sessions.

---

## Author `display` rules beat the UA `[hidden]` attribute · 2026-09-09

**Context**: A finished page rendered perfectly but nothing on it was clickable.

**What I learned**: The `hidden` attribute hides elements via the *user-agent*
stylesheet rule `[hidden] { display: none }`. Author styles outrank the UA origin
regardless of specificity, so any author rule that sets `display` on the same
element silently defeats `hidden`. Setting `el.hidden = true` in JS then does
nothing visible-looking but leaves the element in layout. For a
`position: fixed; inset: 0` overlay at a high z-index with `opacity: 0`, the
result is an invisible sheet of glass over the entire page that eats every
click. Screenshots look perfect; only interaction is dead. Any component that
both styles `display` and relies on `hidden` needs an explicit
`[hidden] { display: none !important }` escape hatch.

**Example**:
```css
.overlay { display: flex; }              /* beats the UA [hidden] rule */
.overlay[hidden] { display: none !important; }   /* restores it */
```
Detect it with `document.elementFromPoint(innerWidth/2, innerHeight/2)` — if
that returns your overlay instead of page content, this is the bug.

**Tags**: `#gotcha` `#debugging` `#css`

---

## Progressive enhancement must be armed by JS, never by CSS alone · 2026-09-09

**Context**: Scroll-reveal animations dimmed content that JS was supposed to
bring back.

**What I learned**: When CSS hides something and JS reveals it, a JS failure is
unrecoverable — the content stays hidden forever. The dimming must be *armed* by
the same layer that can undo it. Add a class to `<html>` from JS only after the
mechanism that reverses the effect exists, and scope the hiding rule to that
class. Then no-JS, an unsupported API, and reduced-motion all degrade to
"content simply visible" for free. The tell that I had this backwards was a code
comment describing progressive enhancement the code did not implement — comments
claiming a property are worth verifying against what the code does.

**Example**:
```css
.js-reveal .reveal { opacity: 0; transform: translateY(24px); }
.js-reveal .reveal.is-visible { opacity: 1; transform: none; }
```
```js
if (!('IntersectionObserver' in window)) return;   // never arms → always visible
document.documentElement.classList.add('js-reveal');
```

**Tags**: `#pattern` `#dx` `#css`

---

## Headless Chrome clamps the layout viewport to 500px · 2026-09-09

**Context**: Mobile screenshots showed text clipped off the right edge that did
not exist in the page.

**What I learned**: `--window-size=390,844` does not give a 390px layout
viewport. Chrome enforces a minimum window width around 500px, even with
`--headless=new`, so the page lays out at 500px and the screenshot crops to 390 —
producing convincing "overflow" bugs that are pure artifact. Never diagnose
responsive layout from a headless screenshot alone; measure
`documentElement.clientWidth` first and confirm it matches what you asked for.
To genuinely test a small viewport without the DevTools Protocol, embed the page
in a sized `<iframe>`: an iframe establishes a real layout viewport and media
queries inside evaluate against it.

**Example**:
```js
// in a harness page, then read frame.contentDocument
`<iframe src="/" width="390" height="1500">`
// verify: d.documentElement.clientWidth === 390
```

**Tags**: `#tooling` `#testing` `#gotcha`

---

## CSS transitions freeze under `--virtual-time-budget` · 2026-09-09

**Context**: A working dark-mode toggle appeared broken in automated tests.

**What I learned**: Chrome's virtual time clock does not advance CSS transitions.
A property under transition reads at its *start* value indefinitely, so
`getComputedStyle(body).backgroundColor` returned white even though the custom
property `--bg` had correctly flipped to `#000000`. The giveaway is a computed
style disagreeing with its own custom property — the cascade is almost never
wrong there. Isolate it by appending a probe element with the same
`background: var(--token)` and `transition: none`: if the probe is correct, the
tokens work and only the animation is frozen.

**Tags**: `#tooling` `#testing` `#debugging` `#css`

---

## Extract design tokens from production CSS, don't reproduce them from memory · 2026-09-09

**Context**: Building an "Apple-style" site; gathered reference material before
writing any page code.

**What I learned**: I had confident, specific, wrong beliefs about a design
system I have seen thousands of times. Mining the actual stylesheets corrected
**four of four** assumptions: the workhorse easing was
`cubic-bezier(0.4, 0, 0.6, 1)` (122 uses) not the curve I "remembered" (8 uses);
hero tracking was `-0.015em` not `-0.03em`; section titles are 600 semibold and
never 700; and letter-spacing is **not monotonic** with size — it runs tight at
reading sizes (`-0.022em` at 17px), flips *positive* through the mid-range
(`+0.012em` at 19px), then tightens again at display sizes. That curve, plus the
font swap from SF Text to SF Display at ~20px, is most of what makes text read
as Apple rather than as Helvetica with a nice palette. Frequency counts also
distinguish the real default from the exception, which memory cannot.

**Example**:
```bash
curl -s https://www.apple.com/<page>/ | grep -oE 'href="[^"]*\.css[^"]*"'
grep -ohE 'cubic-bezier\([^)]+\)' *.css | sort | uniq -c | sort -rn
```

**Tags**: `#tooling` `#architecture` `#css`

---

## CJK typography: list the Latin font first, and drop the tracking · 2026-09-09

**Context**: Building a bilingual EN/中文 site where Latin metrics had to be
adapted rather than reused.

**What I learned**: Apple's own Chinese sites order the stack
`"SF Pro SC", "SF Pro Display", …, "PingFang HK"` — Latin face **before** the CJK
face. Font fallback is per-glyph, so Latin characters render in SF and only
Hanzi fall through to PingFang. Reversing the order makes English words inside
Chinese sentences render in PingFang's weaker Latin. Two metrics must also
change: negative letter-spacing collides Hanzi strokes, so tracking goes to `0`;
and Hanzi are visually denser, so body line-height goes to roughly `1.7` against
`1.47` for Latin. Chinese text also runs ~30% shorter than the same English, so
bilingual layouts must not be height-locked.

**Example**:
```css
:root[lang="zh"] {
  --font-text: -apple-system, "SF Pro Text", "Inter", "PingFang SC", sans-serif;
  --ls-body: 0;
  --lh-body: 1.7;
}
```

**Tags**: `#pattern` `#css` `#i18n`

---
