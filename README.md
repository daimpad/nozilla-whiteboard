# Nozilla Whiteboard

A local-first, browser-only tool that is a **Markdown presentation deck** and a
**freeform whiteboard canvas** at the same time — and stays strictly inside the
Nozilla corporate identity while you use it.

Write the words in Markdown. Arrange everything else by hand. Save the whole
thing — content *and* canvas positions — back into one `.md` file.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

No server, no database, no account. Everything happens in the browser and
everything you keep is a file on your disk.

---

## What it does

### Markdown engine

- Loads a deck from a `.md` file (button, `⌘O`, or drop the file on the window).
- Splits slides on a `---` line. The splitter ignores `---` inside fenced code
  blocks and HTML comments, and refuses to mistake a Setext `Heading\n---`
  underline for a slide break.
- Deck-level YAML frontmatter (`title`, `author`, `date`, `footer`); unknown
  keys are preserved verbatim through a save.
- Per-slide metadata in an HTML comment: layout, transition, background,
  presenter notes and the full canvas element list.
- Renders headings, lists (bulleted / numbered / task), code blocks, block
  quotes, tables, inline emphasis, links and images — all typeset with the CI
  type scale.

### Interactive canvas

- Drag, resize (8 handles) and rotate anything; multi-select with shift-click or
  a marquee.
- Snap to the 8 px CI grid **and** to smart guides: sibling edges and centres,
  slide edges and centre lines, and the CI safe-area margins. Hold `Alt` to
  ignore snapping.
- Duplicate (`⌘D`), delete (`⌫`), layer (`⌘]` / `⌘[`), align, distribute, lock.
- Undo / redo with gesture-aware history — a drag is one undo step, not sixty.

### Presentation

- `P` to present, `Esc` to exit, `F` for fullscreen, `N` for presenter notes.
- Six slide transitions and six element reveal animations; elements carry a
  reveal *step* so a slide can be walked through one idea at a time.
- Overview grid (`⌘K`) and an always-visible filmstrip for jumping and
  reordering.
- Honours `prefers-reduced-motion`.

### Export & import

| Format | What you get |
| --- | --- |
| **Markdown** | The deck, plus every canvas position, in one re-importable `.md` |
| **SVG** | Real `<path>`/`<text>` vectors — no `foreignObject`, no rasterisation |
| **PDF** | Vector pages with selectable, searchable text |

---

## The architecture that matters

Almost every feature above falls out of one decision: **there is a single
rendering pipeline**, and the editor is a client of it like everything else.

```
 Slide ──► buildSlideScene() ──► Scene { ScenePrim[] }
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              primsToSvgMarkup   sceneToSvg     scenesToPdf
              (live canvas)      (.svg file)    (.pdf file)
```

A `Scene` is flat and fully resolved: every colour is a literal, every glyph run
is positioned, every curve is a cubic Bézier. The on-screen canvas renders by
injecting **the exact markup the SVG exporter produces**, so the editor is
literally WYSIWYG with respect to export — there is no second renderer that
could disagree.

Two supporting pieces make that possible:

- **`src/lib/geometry/path.ts`** — one normalised segment list (move / line /
  cubic / close) for all geometry. Elliptical arcs are deliberately unsupported
  because PDF has no arc operator; circles become Béziers instead.
- **`src/lib/text/typeset.ts`** — a small Markdown typesetter that measures with
  the real font (canvas `measureText`) and emits positioned, styled text lines.
  That is what makes exported text *text* rather than a screenshot.

### Layout

```
theme.config.ts              The CI. One file. Everything reads from it.
src/
  assets/       icons.ts     56 icons as structured primitives (not path blobs)
                presets.ts   the CI asset palette the sidebar offers
  model/        types.ts     deck / slide / element model
                factory.ts   the only way an element is created or normalised
  lib/
    markdown/   deck.ts      Markdown ⇄ Deck (the file format)
    geometry/   path.ts      segments, matrices, path parsing
                shapes.ts    CI shape and connector geometry
                snap.ts      grid snapping, smart guides, resize maths
    text/       measure.ts   font metrics (+ a deterministic test fallback)
                typeset.ts   Markdown → positioned text
    layout/     slideLayout.ts  the flow frame for each layout preset
    export/     scene.ts     Slide → Scene  ◄── the hub
                svg.ts       Scene → SVG
                pdf.ts       Scene → PDF
                images.ts    image resolution for export
                download.ts  File System Access API + fallbacks
  state/        deckStore.ts state, actions, undo/redo
                persistence.ts  localStorage autosave (as Markdown)
  components/   canvas · panels · chrome · present · ui
```

---

## The file format

A deck that has never been touched by the canvas is just ordinary Markdown. A
deck saved from the canvas is ordinary Markdown plus one metadata comment per
slide:

```md
---
title: Quarterly Review
footer: Nozilla — Internal
---

<!-- nzl
layout: title
transition: rise
background: brand
notes: Ninety seconds on this one.
elements:
  - id: badge-1
    kind: badge
    x: 88
    y: 96
    w: 210
    h: 40
    tone: inverse
    text: Markdown + Canvas
    icon: sparkle
-->

# Decks that behave like whiteboards

---

## Second slide
```

Design rules the writer follows:

- **Only what changed is written.** Any property still equal to its CI default
  is omitted, so the metadata stays readable and diffs stay small.
- **Round trips are lossless.** `parse(serialize(deck))` reproduces the deck,
  and `serialize` is idempotent. Both are tested against the shipped deck.
- **Hand edits degrade gracefully.** A bad value falls back to the CI default
  instead of failing the file; a broken element never takes the deck with it.
- **Content containing `-->` is safe.** The writer escapes it reversibly
  (`-->` ⇄ `--&gt;` ⇄ `--&&gt;` …) so prose can talk about the format itself.

---

## Corporate identity

`theme.config.ts` is the single source of truth, and everything downstream is
generated from it:

- `tailwind.config.ts` builds the utility classes from it — the default Tailwind
  palette is **replaced**, so a stray `bg-blue-500` fails to compile rather than
  silently going off-brand.
- `src/theme/index.ts` publishes it as CSS custom properties at boot.
- The exporters read it directly, because they have no DOM to read from.

| | |
| --- | --- |
| **Palette** | Cobalt (primary), Ember (accent), Verdigris (support), Amber / Coral (status), Graphite (neutral) — 10 steps each |
| **Tones** | 7 element tones. There is deliberately **no colour picker**: an author picks a tone, not a hex |
| **Type** | Display → overline, 11 steps, with line height and tracking per step |
| **Form** | 8 radii, 5 named line weights, a 4 px spacing grid |
| **Motion** | 5 durations, 4 easing curves, one stagger interval |
| **Canvas** | 1280 × 720 authoring units, 8 px grid, CI safe-area margins |

### Using the licensed brand face

The app ships with a system-font stack so it looks right on a fresh checkout.
To use the real face, drop the `.woff2` files into `public/fonts/` and set
`webfont.enabled = true` in `theme.config.ts`. Nothing else changes: the
`@font-face` rules are generated from the same config at runtime.

---

## Keyboard

| | |
| --- | --- |
| `→` `←` `Space` | Next / previous slide (or reveal step, when presenting) |
| Arrow keys | Nudge the selection by one grid step (`⇧` = five) |
| `⌘D` / `⌫` | Duplicate / delete the selection |
| `⌘]` `⌘[` | Bring forward / send backward (`⇧` = to front / to back) |
| `⌘A` / `Esc` | Select all / clear the selection |
| `⌘Z` `⇧⌘Z` | Undo / redo |
| `⌘O` `⌘S` | Open / save Markdown |
| `⌘K` | Overview |
| `P` / `Esc` | Present / exit |
| `N` / `F` | Presenter notes / fullscreen (while presenting) |
| `G` | Toggle the grid |

Shortcuts are inert while you are typing in a field.

---

## Development

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # serve the build
npm test           # 399 unit tests
npm run lint
npm run typecheck
```

The test suite covers the parts where a regression would be invisible until it
reached a file: the Markdown splitter and round trip, the path parser and
transforms, snapping and resize maths, line breaking and typesetting, the scene
builder, the SVG writer, the PDF geometry translation, and the store's history
and layer semantics. The bundled deck (`src/decks/welcome.md`) doubles as an
end-to-end fixture.

### Notes and limitations

- **PDF fonts.** A PDF cannot reference a web font without embedding it, so the
  exporter uses the metric-compatible core fonts named in `theme.config.ts`.
  Line breaking has already happened against the real on-screen metrics and
  every line is emitted at an absolute position, so the substitution never
  reflows a deck — only the glyph shapes differ slightly.
- **Images.** Drop an image on the canvas and it is embedded as a data URI, so
  the deck stays a single portable file. Images referenced by relative path in
  Markdown resolve against the page, which means they need to live under
  `public/`.
- **Raw HTML in Markdown** is sanitised for display and is not typeset into
  SVG/PDF — exporting it as vector text would misrepresent it.
