---
title: nozilla Whiteboard
author: nozilla
date: 2026-08-07
footer: nozilla · Gute digitale Dienste.
---

<!-- nzl
layout: title
transition: cut
background: paper
bare: true
notes: Neunzig Sekunden. Erst die Idee, dann weiter.
elements:
  - id: mark-title
    kind: wordmark
    x: 88
    y: 72
    w: 260
    h: 62
  - id: badge-title
    kind: badge
    x: 88
    y: 512
    w: 268
    h: 44
    tone: signal
    text: Markdown + Fläche
  - id: rule-title
    kind: connector
    x: 88
    y: 470
    w: 320
    h: 0
    connector: line
    strokeWeight: heavy
-->

# Folien, die sich wie ein Whiteboard benehmen.

Die Worte schreibst du in Markdown. Alles andere legst du von Hand.

---

<!-- nzl
layout: split
transition: fade
notes: Die zwei Hälften. Beim Reden auf die rechte Seite zeigen.
elements:
  - id: card-md
    kind: card
    x: 700
    y: 140
    w: 492
    h: 190
    icon: file-lines
    label: Inhalt
    title: Markdown ist die Quelle
    body: Überschriften, Listen, Code und Tabellen werden in der CI-Hierarchie gesetzt.
    reveal:
      step: 1
      animation: rise
  - id: card-canvas
    kind: card
    x: 700
    y: 360
    w: 492
    h: 190
    tone: signal
    icon: object-group
    label: Layout
    title: Die Fläche ist frei
    body: Ziehen, einrasten, duplizieren, stapeln — mit fertigen CI-Bausteinen.
    reveal:
      step: 2
      animation: rise
-->

## Eine Datei, zwei Denkweisen

- Die ==linke Hälfte== ist Prosa: sie fließt, sie bricht um, sie bleibt diffbar.
- Die ==rechte Hälfte== ist Layout: sie bleibt genau da, wo du sie hinlegst.
- Beides steht in derselben `.md`, die Versionsverwaltung sieht ein Artefakt.

---

<!-- nzl
layout: canvas
background: grid
transition: fade
notes: Alles hier kam aus der Seitenleiste. Nichts wurde von Hand eingefärbt.
elements:
  - id: h-lib
    kind: text
    x: 88
    y: 72
    w: 900
    h: 64
    text: Die CI-Bibliothek, unverändert
    typeStyle: h1
  - id: sub-lib
    kind: text
    x: 88
    y: 148
    w: 760
    h: 34
    text: Jede Kachel erbt Palette, Kanten und Strichstärken automatisch.
    typeStyle: lead
  - id: stat-1
    kind: card
    x: 88
    y: 216
    w: 254
    h: 180
    variant: stat
    label: Icons
    title: "462"
    body: Dialekt A, 4 px, square caps
  - id: stat-2
    kind: card
    x: 362
    y: 216
    w: 254
    h: 180
    variant: stat
    label: Farbrollen
    title: "3"
    body: Papier, Tinte, Signal
  - id: stat-3
    kind: card
    x: 636
    y: 216
    w: 254
    h: 180
    variant: stat
    tone: signal
    label: Radius
    title: "0"
    body: Überall, ohne Ausnahme
  - id: note-1
    kind: card
    x: 910
    y: 216
    w: 282
    h: 180
    variant: note
    icon: circle-info
    title: Kein Farbwähler
    body: Die Einschränkung ist das Merkmal — ein Deck kann nicht abdriften.
  - id: hex-1
    kind: shape
    x: 88
    y: 432
    w: 190
    h: 160
    shape: hexagon
    label: Formen
  - id: chev-1
    kind: shape
    x: 300
    y: 470
    w: 210
    h: 84
    shape: chevron
    label: Phase
    tone: signal
  - id: bubble-1
    kind: shape
    x: 532
    y: 432
    w: 232
    h: 160
    shape: callout
    label: Sprechblase
    shadow: md
  - id: frame-1
    kind: shape
    x: 786
    y: 432
    w: 180
    h: 160
    shape: frame
    fill: outline
    strokeWeight: heavy
  - id: icon-1
    kind: icon
    x: 988
    y: 432
    w: 96
    h: 96
    icon: rocket
    frame: box
    fill: framed
  - id: icon-2
    kind: icon
    x: 1096
    y: 432
    w: 96
    h: 96
    icon: shield-halved
    frame: box
    fill: framed
    tone: signal
  - id: badge-row
    kind: badge
    x: 988
    y: 548
    w: 204
    h: 44
    text: Fertig
    icon: check
-->

---

<!-- nzl
layout: split
transition: slide
notes: Der Export ist das Argument. Hier langsam sprechen.
elements:
  - id: exp-md
    kind: card
    x: 700
    y: 128
    w: 492
    h: 138
    variant: note
    icon: file-lines
    title: Markdown
    body: Inhalt und Position, zurück in die Datei geschrieben.
  - id: exp-svg
    kind: card
    x: 700
    y: 286
    w: 492
    h: 138
    variant: note
    icon: bezier-curve
    title: SVG
    body: Echte Pfade, echte Textknoten — kein foreignObject, kein Screenshot.
  - id: exp-pdf
    kind: card
    x: 700
    y: 444
    w: 492
    h: 138
    variant: note
    icon: file-pdf
    title: PDF
    body: Vektorseiten mit markierbarem, durchsuchbarem Text.
-->

## Export bleibt Vektor

Fläche, SVG-Schreiber und PDF-Schreiber lesen ==dieselbe Szene==.

Es gibt keinen zweiten Renderer, der widersprechen könnte. Was du legst, ist
das, was du lieferst.

---

<!-- nzl
layout: quote
background: ink
transition: cut
bare: true
elements:
  - id: quote-mark
    kind: wordmark
    x: 88
    y: 596
    w: 180
    h: 44
    variant: paper
-->

> Einschränkungen begrenzen ein Deck nicht.
> Sie sind der einzige Grund, warum es aussieht, als käme es aus einem Haus.

---

<!-- nzl
transition: fade
notes: Mit den Tasten schließen, damit die Leute es auch benutzen.
elements:
  - id: kbd
    kind: markdown
    x: 664
    y: 128
    w: 528
    h: 464
    fill: framed
    shadow: md
    padding: 28
    markdown: |
      ### Tasten

      | Was | Tasten |
      | --- | --- |
      | Folie vor / zurück | `→` `←` `Leer` |
      | Auswahl schieben | Pfeiltasten |
      | Duplizieren | `⌘D` |
      | Löschen | `⌫` |
      | Ebene vor / zurück | `⌘]` `⌘[` |
      | Alles wählen | `⌘A` |
      | Rückgängig / Wiederholen | `⌘Z` `⇧⌘Z` |
      | Übersicht | `⌘K` |
      | Präsentieren | `P` |
      | Markdown sichern | `⌘S` |
-->

## Loslegen

1. Eine `.md` irgendwo ins Fenster ziehen — sie wird geöffnet.
2. Links in der Bibliothek klicken — der Baustein kommt CI-konform an.
3. Ziehen mit Einrasten; `Alt` hält das Raster an.
4. `P` startet die Präsentation, `Esc` bringt dich zurück.

Der grüne Marker schreibt sich `==so==` — ein bis drei Wörter pro Absatz.
