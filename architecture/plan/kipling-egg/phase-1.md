# Kipling easter egg — Phase 1

## Goal
A hidden terminal command that prints Rudyard Kipling's "If—", plus hints on the
page that let a visitor discover the word "Kipling" without being told outright.

## Changes Made
- `assets/js/terminal/poem.js` — new. `TITLE`, `ATTRIBUTION`, `STANZAS`
  (4 × 8 lines) and `render()`. Text transcribed from the Wikisource scan of
  *Rewards and Fairies* (1910).
- `assets/js/terminal/commands.js` — hidden `kipling` command; calls
  `markPoemFound()` so the toast stops appearing, and appends a short zh note
  explaining the text is left in the original. Added an `ALIASES` map consulted
  by `lookup()` so `Kipling` and `KIPLING` resolve — dispatch is otherwise
  case-sensitive, and the hint names a surname, so a capital K is what people
  actually type.
- `assets/js/hint.js` — new. Owns all three hints' state and the toast.
- `assets/js/main.js` — imports and calls `initHint()` after `initTerminal()`.
- `index.html` — HTML comment beside the footer trigger, quoting the opening
  lines and signing them.
- `assets/css/layout.css` — `.hint*` rules; corner card on desktop, full-width
  bar under 734px.

## Decisions
- Printed as a plain string, not `{ascii: …}`: `.term__line` is already
  `white-space: pre-wrap`, so line breaks survive and long lines wrap on a
  phone, while `--ascii` is dimmed and set at `line-height: 1.05` for banners.
- English in both locales. A translation would be a different poem; the zh path
  gets a one-line note rather than a rendering.
- zh hint copy carries the Latin spelling "Rudyard Kipling" alongside 吉卜林 —
  a reader given only the transliteration cannot type the command.
- The toast opens the terminal but types nothing; finding the command is still
  the visitor's to do. It reuses `#terminal-trigger`'s own click handler rather
  than reaching into the Terminal instance.

## Not Done Yet
- The toast only knows about the footer trigger. A visitor who opens the
  terminal by backtick or Konami still sees it later.
