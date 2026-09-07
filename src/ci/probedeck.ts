/**
 * Das Probedeck des Generators.
 *
 * Sechs Folien, an denen ein Entwurf zu beurteilen ist: die vier Untergründe,
 * die vier Flächenrollen, die Typo-Leiter von der Kampagnengröße bis zur
 * Fußzeile, beide Codeuntergründe, die vier Strichstärken, die vier
 * Schattenstufen, die Wortmarke und zwei Zeichen.
 *
 * ## Die Zusage, die hier stand, und was sie wert war
 *
 * „Vier Folien, die zusammen **jede Rolle einmal zeigen**." Nachgemessen wurde
 * das, indem jede einstellbare Rolle eines Entwurfs einzeln verstellt und das
 * erzeugte Markup verglichen wurde: **neunzehn von siebenunddreißig** ließen
 * das Bild unverändert. Darunter die Kampagnengröße — auf einer Folie, die
 * „Die Kampagnengröße" überschrieben war und h1 zeigte, denn `#` ist in
 * Markdown h1 und keine Leiter führt hier weiter hinauf.
 *
 * Was danach noch stumm bleibt, steht in `STUMME_ROLLEN` — mit Grund, und
 * `probedeck.test.ts` hält beide Richtungen: keine Rolle darf still
 * verschwinden, und keine darf auf der Liste stehen, die das Bild sehr wohl
 * bewegt.
 *
 * ## Warum nicht die Willkommensmappe
 *
 * Weil sie für Zilla Slab ausgemessen ist. Jeder von Hand gelegte Titel darin
 * steht in einem Kasten, dessen Breite gegen *diese* Schrift gerechnet wurde —
 * eine Grotesk läuft rund zehn Prozent breiter, und fließender Text passt sich
 * an, ein frei platzierter Titel nicht. Eine Vorschau auf dieser Mappe zeigte
 * einer Marke mit breiter Schrift Überläufe, die **nicht ihre Schuld sind**,
 * und jemand verstellte ihre Typo-Leiter, um ein fremdes Deck zu reparieren.
 *
 * Deshalb hier: keine von Hand gelegten Titel, großzügige Kästen, Fließtext
 * überall dort, wo es geht.
 */
/**
 * Die Rollen, die auf keiner Probefolie zu sehen sind — und warum.
 *
 * Acht von siebenunddreißig, und keine davon aus Nachlässigkeit: eine Folie
 * kann sie nicht malen. Sieben sind Farben, die in diesem Werkzeug **kein
 * Zeichner liest**; drei davon landen immerhin in der Themenpalette einer
 * `.pptx`, vier in gar keiner Ausgabe. Sie stehen trotzdem im Formular, denn
 * sie stehen in der CI, und die erzeugte Designdatei trägt sie weiter.
 *
 * Der Satz je Rolle ist die Antwort auf die Frage, die sonst jeder selbst
 * stellen müsste: „Ich habe das geändert und sehe nichts — ist es angekommen?"
 * Ein Bedienelement, das bei acht Feldern nichts bewegt und dazu schweigt, ist
 * die Sorte, an der man an sich selbst zweifelt; das steht in `CLAUDE.md`
 * schon zweimal.
 *
 * Geprüft wird die Liste in **beide** Richtungen (`probedeck.test.ts`): keine
 * stumme Rolle darf fehlen, und keine genannte darf das Bild in Wahrheit
 * bewegen. Ohne die zweite Hälfte bliebe sie stehen, wenn eine Folie
 * dazukommt, die die Rolle zeigt — und behauptete weiter, man sähe nichts.
 */
export const STUMME_ROLLEN: Record<string, string> = {
  'palette.signalStrong': 'Kein Zeichner liest sie; sie geht als accent2 in die .pptx.',
  'palette.paperDeep':
    'Malt die Fläche *neben* der Folie und geht als accent4 in die .pptx — auf der Folie steht sie nie.',
  'palette.ink900': 'Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen.',
  'palette.ink700': 'Kein Zeichner liest sie; sie geht als accent5 und folHlink in die .pptx.',
  'palette.ink600': 'Kein Zeichner liest sie; sie geht als accent6 in die .pptx.',
  'palette.warn': 'Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen.',
  'palette.danger': 'Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen.',
  'palette.info': 'Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen.',
};

export const PROBEDECK = `---
title: Probe
footer: Probe · So sieht diese CI aus.
---

<!-- nzl
layout: title
elements:
  - id: marke
    kind: wordmark
    x: 88
    y: 208
    w: 420
    h: 96
  - id: zeichen
    kind: icon
    x: 984
    y: 208
    w: 96
    h: 96
    icon: rocket
-->

# Die erste Überschrift

Der Fließtext darunter, in der Schrift des Fließtextes.

---

<!-- nzl
layout: split
background: cream
elements:
  - id: papier
    kind: card
    x: 704
    y: 152
    w: 480
    h: 128
    tone: paper
    variant: feature
    label: Ton
    title: Papier
    body: Der warme Hausfarbton dieser Marke.
  - id: weiss
    kind: card
    x: 704
    y: 296
    w: 480
    h: 128
    tone: white
    variant: feature
    label: Ton
    title: Weiß
    body: Das reine Weiß daneben — die beiden müssen zwei sein.
  - id: signalkarte
    kind: card
    x: 704
    y: 440
    w: 480
    h: 128
    tone: signal
    variant: feature
    label: Ton
    title: Signal
    body: Nur echte Handlungsaufforderungen.
-->

## Untergrund Creme, drei Flächenrollen

Fließtext in der Größe des Fließtextes, damit die Zeile zu beurteilen ist.
Ein **fetter** Einschub, ein *kursiver*, ein ==Marker== in der Signalfarbe
und ein \`codeInline\` in der Monospace.

\`\`\`ts
const codeblock = 'auf seinem eigenen Untergrund';
\`\`\`

---

<!-- nzl
layout: split
background: ink
elements:
  - id: tinte
    kind: card
    x: 704
    y: 200
    w: 480
    h: 160
    tone: ink
    variant: stat
    label: Auf Tinte
    title: 72 %
    body: Der gedämpfte Nebensatz trägt den Unterton des Papiers.
-->

## Untergrund Tinte

Hier steht das Papier als Schrift, und die gedämpfte Stufe daneben muss
denselben Unterton haben wie dieser Satz.

\`\`\`ts
const auchHier = 'ein Codeblock braucht seinen Untergrund';
\`\`\`

---

<!-- nzl
layout: default
background: signal
-->

## Untergrund Signal

Schwarz auf der Handlungsfarbe — das Paar, das im Mischer fest verdrahtet ist
und sich nur über die Palette reparieren lässt.

\`\`\`ts
const codeAufSignal = 'auf der weichen Stufe des Signals';
\`\`\`

---

<!-- nzl
layout: default
elements:
  - id: kampagne
    kind: text
    x: 88
    y: 152
    w: 1104
    h: 208
    typeStyle: display
    text: Kampagne.
  - id: schlagzeile
    kind: text
    x: 88
    y: 392
    w: 1104
    h: 136
    typeStyle: headline
    text: Die Schlagzeile darunter.
-->

---

<!-- nzl
layout: split
elements:
  - id: haar
    kind: shape
    x: 704
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: hair
  - id: linie
    kind: shape
    x: 832
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: rule
  - id: stark
    kind: shape
    x: 960
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: strong
  - id: schwer
    kind: shape
    x: 1088
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: heavy
  - id: ohne
    kind: shape
    x: 704
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: none
  - id: klein
    kind: shape
    x: 832
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: sm
  - id: mittel
    kind: shape
    x: 960
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: md
  - id: gross
    kind: shape
    x: 1088
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: lg
  - id: pixelzeichen
    kind: icon
    x: 704
    y: 472
    w: 96
    h: 96
    icon: core-pixel-crown
-->

### Auf hellem Papier

Vier Strichstärken, vier Schattenstufen und ein Pixelzeichen: nur dort steht
die tiefe Stufe der Signalfarbe. Der Codeblock darunter liegt auf der zweiten
Papierstufe — die gibt es nur auf diesem Untergrund.

\`\`\`ts
const aufPapier = 'die zweite Papierstufe';
\`\`\`
`;
