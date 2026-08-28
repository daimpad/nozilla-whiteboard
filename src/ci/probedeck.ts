/**
 * Das Probedeck des Generators.
 *
 * Vier Folien, die zusammen jede Rolle einmal zeigen, die ein Erscheinungsbild
 * belegt: die vier Untergründe, die vier Flächenrollen, die Typo-Leiter von der
 * Kampagnengröße bis zur Fußzeile, ein Codeblock, die Wortmarke, ein Zeichen.
 * Wer die Vorschau durchblättert, hat seine CI gesehen.
 *
 * ## Warum nicht die Willkommensmappe
 *
 * Weil sie für Zilla Slab ausgemessen ist. Jeder von Hand gelegte Titel darin
 * steht in einem Kasten, dessen Breite gegen *diese* Schrift gerechnet wurde —
 * eine Grotesk läuft rund zehn Prozent breiter, und fließender Text passt sich
 * an, ein frei platzierter Titel nicht. Eine Vorschau auf dieser Mappe zeigte
 * einem Kunden mit breiter Schrift Überläufe, die **nicht seine Schuld sind**,
 * und er verstellte seine Typo-Leiter, um ein fremdes Deck zu reparieren.
 *
 * Deshalb hier: keine von Hand gelegten Titel, großzügige Kästen, Fließtext
 * überall dort, wo es geht.
 */
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

# Die Kampagnengröße

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
`;
