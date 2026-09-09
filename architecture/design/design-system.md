# Design System — boxuanshi.dev

**Status:** Phase 0 deliverable. Awaiting review before any page code is written.
**Method:** Values extracted from Apple's live production stylesheets on 2026-09-09, not reproduced from memory. Raw frequency counts in `apple-reference/raw-extraction.md`.

> The Chrome extension wasn't connected, so instead of screenshots I pulled the actual CSS
> from `apple.com/`, `apple.com/macbook-air/`, and `apple.com/cn/` and mined it directly.
> This turned out to be the better artifact: real declared values beat eyeballed ones.

---

## What the extraction corrected

Four assumptions from the approved plan were wrong. Each is now evidence-based:

| Assumption in plan | What Apple actually ships | Evidence |
|---|---|---|
| Easing `cubic-bezier(0.28, 0.11, 0.32, 1)` | **`cubic-bezier(0.4, 0, 0.6, 1)`** is the workhorse | 122 uses vs. 8 |
| Hero tracking `-0.03em` | **`-0.015em` at 80px** — far subtler | Product page hero rules |
| Tracking tightens as text grows | **Non-monotonic** — see optical curve below | 17px `-0.022em`, 24px `+0.009em` |
| Section titles bold (700) | **600 semibold**, never 700 | Every display rule |

The tracking curve is the single most important finding. It is not linear.

---

## 1. Typography

### The optical size rule

Apple swaps font family **and flips tracking direction** at ~20px. Miss this and the page reads as a Bootstrap site with a nice palette.

| Size | Family | Weight | Line-height | **Tracking** |
|---|---|---|---|---|
| 12px caption | Text | 400 | 1.333 | `-0.01em` |
| 14px small | Text | 400 | 1.429 | `-0.016em` |
| **17px body** | **Text** | **400** | **1.4706** (25px) | **`-0.022em`** ← tightest |
| 19px lead | Display | 400 | 1.211 | `+0.012em` ← flips positive |
| 21px | Display | 600 | 1.190 | `+0.011em` |
| 24px | Display | 600 | 1.167 | `+0.009em` |
| 32/40px | Display | 600 | 1.1 | `~0em` |
| 48px | Display | 600 | **1.0** | `-0.003em` |
| 56px | Display | 600 | **1.0** | `-0.005em` |
| 64px | Display | 600 | **1.0** | `-0.009em` |
| **80px hero** | Display | 600 | **1.0** | `-0.015em` |

Read down the tracking column: `-0.022` → `+0.012` → `+0.009` → `0` → `-0.015`. Tight at reading sizes, **loose through the mid-range**, tight again at display sizes. Every display size is `line-height: 1`.

### Font stacks

Apple serves licensed SF Pro webfonts we can't use. But SF *is* the system font on Apple hardware, so `-apple-system` gets the real thing for most visitors, with Inter — designed on SF's skeleton — as the fallback everywhere else.

```css
--font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter",
                "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-text:    -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter",
                "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-mono:    ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
```

### 中文 — Latin font goes first

From `apple.com/cn`: `"SF Pro SC", "SF Pro Display", …, "PingFang HK"`. The Latin face is listed **before** the CJK face, so Latin glyphs render in SF and only Chinese glyphs fall through to PingFang. Reversing this makes English words inside Chinese sentences render in PingFang's Latin — noticeably worse.

```css
html[lang="zh"] {
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter",
                  "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
}
```

**Two CJK-specific overrides** (Apple's Latin metrics do not transfer):

1. **Tracking → `0`.** Negative tracking on Hanzi collides the strokes. All the `-0.022em` values above apply to Latin only.
2. **Line-height → `1.7`** for body (vs 1.47). Hanzi are denser and need more leading. Chinese text also runs ~30% shorter than the same English, so bilingual layouts must not be height-locked.

---

## 2. Color

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--bg` | `#ffffff` | `#000000` | Apple uses true black in dark mode |
| `--bg-subtle` | `#f5f5f7` | `#161617` | alternating section bands |
| `--bg-raised` | `#fafafc` | `#1d1d1f` | cards |
| `--text` | `#1d1d1f` | `#f5f5f7` | never pure black on white |
| `--text-secondary` | `#6e6e73` | `#86868b` | |
| `--text-tertiary` | `#86868b` | `#6e6e73` | |
| `--hairline` | `#d2d2d7` | `#333336` | 1px dividers |
| `--accent` | `#0071e3` | `#2997ff` | dark mode lightens the blue |
| `--accent-hover` | `#0077ed` | `#2997ff` | |

`#0071e3` was the single most frequent color in the extraction (23 uses). One accent, used sparingly.

## 3. Layout

Apple's real responsive ladder:

| Breakpoint | Container |
|---|---|
| ≤ 734px | fluid, 22px gutters |
| 735–1068px | **692px** |
| 1069–1440px | **980px** |
| ≥ 1441px | 980px (does not grow) |

637 and 588 rules keyed to 734px/1068px respectively — these are the load-bearing breakpoints. The container **stops growing at 980px**; ultra-wide screens get more margin, never longer line lengths.

Section rhythm: 100–140px vertical padding. Whitespace is the primary compositional tool.

## 4. Shape & motion

```css
--radius-button: 980px;   /* the pill — verbatim from Apple */
--radius-card: 12px;
--radius-panel: 18px;

--ease: cubic-bezier(0.4, 0, 0.6, 1);   /* 122 uses — the default */
--ease-emphasis: cubic-bezier(0.25, 0.1, 0.3, 1);

--dur-micro: 80ms;    /* hover states */
--dur-fast: 240ms;
--dur-base: 320ms;    /* most common non-zero duration */
--dur-slow: 560ms;    /* scroll reveals */
```

Primary button: `#0071e3` bg, `#fff` text, `padding: 11px 21px`, `border-radius: 980px`, 17px/400/`-0.022em`.

Shadows: **essentially none.** Apple separates surfaces with hairlines and background shifts. Any `box-shadow` beyond a faint hover lift is off-language.

All motion wrapped in `@media (prefers-reduced-motion: no-preference)`.

---

## 5. How this applies to a personal site

Apple's language is built for product marketing — enormous hero imagery, short declarative copy. A résumé site has more text and no product shots. Adaptations:

- **Hero at 56px, not 80px.** A person's name at 80px reads as self-important; a MacBook at 80px reads as confident. Scale down one step.
- **Restraint is the transferable part** — the type scale, hairlines, whitespace, single accent. Not the marketing bombast.
- **Text-forward substitute for hero imagery**: the hero is name + one line + generous negative space, carrying the composition through type alone.
- **The terminal is the personality.** Because the visible site stays disciplined, the easter egg is a genuine surprise. If the main site were already playful, the terminal would just be more noise. The restraint upstream is what earns the payoff.
