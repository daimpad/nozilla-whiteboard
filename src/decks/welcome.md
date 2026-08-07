---
title: Nozilla Whiteboard
author: Nozilla Design
date: 2026-08-07
footer: Nozilla — Internal
---

<!-- nzl
layout: title
transition: rise
background: brand
bare: true
notes: Ninety seconds. Land the hybrid idea, then move.
elements:
  - id: badge-intro
    kind: badge
    x: 88
    y: 96
    w: 210
    h: 40
    tone: inverse
    fill: solid
    text: Markdown + Canvas
    icon: sparkle
  - id: icon-mark
    kind: icon
    x: 1064
    y: 96
    w: 128
    h: 128
    tone: inverse
    icon: nozilla
    strokeWeight: heavy
    opacity: 0.35
  - id: rule-title
    kind: connector
    x: 88
    y: 470
    w: 260
    h: 0
    tone: inverse
    connector: line
    strokeWeight: heavy
-->

# Decks that behave like whiteboards

Write the words in Markdown. Arrange everything else by hand.

---

<!-- nzl
layout: split
transition: fade
notes: The two halves of the tool. Point at the canvas while you talk.
elements:
  - id: card-md
    kind: card
    x: 664
    y: 168
    w: 300
    h: 190
    icon: document
    title: Markdown is the source
    body: Headings, lists, code and tables are typeset with the CI scale.
    reveal:
      step: 1
      animation: rise
  - id: card-canvas
    kind: card
    x: 664
    y: 380
    w: 300
    h: 190
    tone: accent
    icon: layers
    title: The canvas is freeform
    body: Drag, snap, duplicate and layer pre-built CI elements over the top.
    reveal:
      step: 2
      animation: rise
  - id: arrow-link
    kind: connector
    x: 592
    y: 300
    w: 56
    h: 0
    tone: neutral
    connector: arrow
    strokeWeight: medium
-->

## One file, two ways to think

- The **left half** is prose: it flows, it reflows, it stays diffable.
- The **right half** is layout: it stays exactly where you put it.
- Both live in the same `.md`, so version control sees one artefact.

```md
<!-- nzl
elements:
  - kind: badge
    x: 88
    y: 96
    text: Anything you place
-->
```

---

<!-- nzl
layout: canvas
background: grid
transition: zoom
notes: Everything here came out of the sidebar. Nothing was hand-coloured.
elements:
  - id: heading-lib
    kind: text
    x: 88
    y: 84
    w: 620
    h: 60
    text: The CI library, unedited
    typeStyle: h1
  - id: sub-lib
    kind: text
    x: 88
    y: 146
    w: 620
    h: 34
    text: Every tile below inherits palette, radii and line weights automatically.
    typeStyle: lead
    tone: neutral
  - id: stat-1
    kind: card
    x: 88
    y: 224
    w: 236
    h: 172
    tone: primary
    variant: stat
    eyebrow: Icons
    title: "56"
    body: Stroke-consistent, arc-free
  - id: stat-2
    kind: card
    x: 344
    y: 224
    w: 236
    h: 172
    tone: support
    variant: stat
    eyebrow: Shapes
    title: "12"
    body: Containers, frames, callouts
  - id: stat-3
    kind: card
    x: 600
    y: 224
    w: 236
    h: 172
    tone: accent
    variant: stat
    eyebrow: Tones
    title: "7"
    body: Locked to the CI ramp
  - id: callout-1
    kind: card
    x: 856
    y: 224
    w: 336
    h: 172
    tone: warning
    variant: callout
    icon: bulb
    title: No colour picker
    body: Constraint is the feature — a deck cannot drift off-brand.
  - id: hex-1
    kind: shape
    x: 88
    y: 432
    w: 180
    h: 156
    shape: hexagon
    label: Shapes
    tone: primary
  - id: chev-1
    kind: shape
    x: 292
    y: 470
    w: 200
    h: 80
    shape: chevron
    label: Flow
    tone: support
  - id: bubble-1
    kind: shape
    x: 516
    y: 432
    w: 232
    h: 156
    shape: callout
    label: Speech bubble
    tone: accent
  - id: frame-1
    kind: shape
    x: 772
    y: 432
    w: 200
    h: 156
    shape: frame
    fill: outline
    strokeWeight: bold
    tone: neutral
  - id: icon-tile-1
    kind: icon
    x: 996
    y: 432
    w: 88
    h: 88
    icon: rocket
    frame: square
    fill: soft
    tone: primary
  - id: icon-tile-2
    kind: icon
    x: 1096
    y: 432
    w: 88
    h: 88
    icon: shield
    frame: circle
    fill: soft
    tone: support
  - id: badge-row
    kind: badge
    x: 996
    y: 540
    w: 188
    h: 40
    text: Shipped
    icon: check
    fill: soft
    tone: support
-->

---

<!-- nzl
layout: split
transition: slide
notes: Talk through the export guarantee — this is the differentiator.
elements:
  - id: export-md
    kind: card
    x: 700
    y: 132
    w: 492
    h: 130
    tone: neutral
    variant: callout
    icon: document
    title: Markdown
    body: Content and canvas positions, written back into frontmatter-style metadata.
  - id: export-svg
    kind: card
    x: 700
    y: 278
    w: 492
    h: 130
    tone: primary
    variant: callout
    icon: box
    title: SVG
    body: Real paths and real text nodes — no foreignObject, no screenshots.
  - id: export-pdf
    kind: card
    x: 700
    y: 424
    w: 492
    h: 130
    tone: accent
    variant: callout
    icon: book
    title: PDF
    body: Vector pages with selectable, searchable text.
-->

## Exports that stay vectors

The canvas, the SVG writer and the PDF writer all consume **one scene model**.

There is no second renderer that could disagree, so what you arrange is
literally what you ship.

---

<!-- nzl
layout: quote
background: subtle
transition: fade
bare: true
elements:
  - id: quote-icon
    kind: icon
    x: 608
    y: 168
    w: 64
    h: 64
    icon: quote
    tone: primary
    fill: none
-->

> Constraints do not limit a deck.
> They are the only reason it looks like it came from one company.

---

<!-- nzl
transition: rise
notes: Close on the shortcuts so people can actually use it.
elements:
  - id: kbd-card
    kind: markdown
    x: 664
    y: 150
    w: 528
    h: 430
    fill: soft
    tone: neutral
    padding: 28
    markdown: |
      ### Shortcuts

      | Action | Keys |
      | --- | --- |
      | Next / previous slide | `→` `←` `Space` |
      | Nudge selection | Arrow keys |
      | Duplicate | `⌘D` |
      | Delete | `⌫` |
      | Layer forward / back | `⌘]` `⌘[` |
      | Select all | `⌘A` |
      | Undo / redo | `⌘Z` `⇧⌘Z` |
      | Overview | `⌘K` |
      | Present | `P` |
      | Save Markdown | `⌘S` |
-->

## Get going

1. Drop a `.md` file anywhere on the window to open it.
2. Click anything in the left library to place it — it arrives on-brand.
3. Drag with snapping; hold `Alt` to ignore the grid.
4. Press `P` to present, `Esc` to come back.
