/**
 * Der Deck-Prompt.
 *
 * Aufgabe: ein Sprachmodell dazu bringen, Markdown auszugeben, das dieses
 * Werkzeug **ohne Nacharbeit** öffnen kann — und das dabei die nozilla-CI
 * einhält.
 *
 * Warum erzeugt und nicht geschrieben: der Prompt muss das exakte Vokabular
 * nennen, das der Parser akzeptiert — Layouts, Hintergründe, Farbrollen,
 * Elementarten, Kartenvarianten, Formen, Typo-Stufen, Icon-Namen. Das steht
 * alles in `theme.config.ts`, `model/types.ts` und dem generierten Icon-Set.
 * Ein von Hand gepflegter Prompt wäre in dem Moment falsch, in dem jemand ein
 * Layout ergänzt. Hier kann er es nicht sein: er liest dieselben Konstanten,
 * gegen die der Parser prüft.
 */
import {
  canvas,
  MAX_MARKERS_PER_PARAGRAPH,
  forbiddenWords,
  revealAnimations,
  slideLayouts,
  slideTransitions,
  strokeNames,
  shadowNames,
  toneNames,
  typeScale,
  elementTones,
} from '@/theme';
import { layoutDescriptions } from '@/lib/layout/slideLayout';
import { iconNames } from '@/assets/icons';
import { nozillaIcons } from '@/theme';
import {
  cardVariants,
  connectorKinds,
  fillStyles,
  shapeNames,
  slideBackgrounds,
} from '@/model/types';

/* -------------------------------------------------------------------------- */
/* Der Auftrag                                                                 */
/* -------------------------------------------------------------------------- */

export const deckPurposes = [
  'pitch',
  'review',
  'workshop',
  'schulung',
  'bericht',
  'konzept',
] as const;
export type DeckPurpose = (typeof deckPurposes)[number];

export const purposeLabels: Record<DeckPurpose, string> = {
  pitch: 'Pitch — überzeugen, ein Angebot machen',
  review: 'Review — Stand zeigen, Entscheidungen holen',
  workshop: 'Workshop — gemeinsam arbeiten, Fläche brauchen',
  schulung: 'Schulung — erklären, Schritt für Schritt',
  bericht: 'Bericht — Zahlen und Ergebnisse zeigen',
  konzept: 'Konzept — eine Idee ausbreiten',
};

export interface DeckBrief {
  /** Worum es geht. Das Einzige, was wirklich Pflicht ist. */
  topic: string;
  purpose: DeckPurpose;
  /** Wer im Raum sitzt. */
  audience: string;
  /** Was danach passieren soll. */
  goal: string;
  slideCount: number;
  /** Stichpunkte, Zahlen, Zitate — alles, was rein soll. */
  material: string;
  /** Wie das Deck heißen soll; leer = das Modell entscheidet. */
  title: string;
  footer: string;
  /** Freie Fläche mit Karten und Formen statt reiner Textfolien. */
  richCanvas: boolean;
  /** Präsentationsnotizen mitschreiben. */
  notes: boolean;
}

export const emptyBrief: DeckBrief = {
  topic: '',
  purpose: 'pitch',
  audience: '',
  goal: '',
  slideCount: 8,
  material: '',
  title: '',
  footer: 'nozilla · Gute digitale Dienste.',
  richCanvas: true,
  notes: true,
};

/* -------------------------------------------------------------------------- */
/* Icon-Auswahl                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 554 Icon-Namen sprengen jeden Prompt. Diese Auswahl deckt ab, was in Decks
 * tatsächlich gebraucht wird; der Prompt sagt ausdrücklich, dass nur Namen aus
 * der Liste erlaubt sind.
 *
 * Die Liste wird **nicht** gegen das Set gefiltert, sondern dagegen geprüft
 * (`missingSuggestedIcons`). Gefiltert hat sie sich jahrelang selbst — und
 * damit auch den Test stillgelegt, der sie prüfen sollte: vier Namen standen
 * hier, die es im Set nie gab, und niemand konnte es merken. Ein toter Name
 * gehört ersetzt, nicht verschwiegen.
 *
 * Am Ende steht eine Handvoll aus dem Kern-Set (`core-*`). Es sind die
 * Zeichen, die nozilla für die eigenen Themen gezeichnet hat und für die der
 * Font-Awesome-Nachbau nichts Vergleichbares hat.
 */
const SUGGESTED_ICONS = [
  'arrow-right',
  'arrow-up',
  'arrow-down',
  'check',
  'square-check',
  'xmark',
  'plus',
  'circle-info',
  'triangle-exclamation',
  'circle-question',
  'lightbulb',
  'bolt',
  'rocket',
  'flag',
  'bullseye',
  'compass',
  'map',
  'route',
  'flask',
  'microscope',
  'chart-line',
  'chart-simple',
  'chart-pie',
  'table',
  'list-check',
  'clipboard',
  'file-lines',
  'file-pdf',
  'folder',
  'book',
  'newspaper',
  'pen-to-square',
  'users',
  'user',
  'handshake',
  'comment',
  'comments',
  'envelope',
  'phone',
  'clock',
  'calendar-days',
  'hourglass',
  'stopwatch',
  'code',
  'terminal',
  'database',
  'server',
  'cloud',
  'gears',
  'sliders',
  'wrench',
  'lock',
  'shield-halved',
  'key',
  'eye',
  'magnifying-glass',
  'filter',
  'money-bill',
  'coins',
  'cart-shopping',
  'tag',
  'star',
  'heart',
  'thumbs-up',
  'layer-group',
  'object-group',
  'cube',
  'puzzle-piece',
  'link',
  'share-nodes',
  'building',
  'globe',
  'leaf',
  'recycle',
  'truck',
  'box-open',

  /* Kern-Set — nozillas eigene Themen. */
  'core-ai-model',
  'core-ai-prompt',
  'core-ai-drift',
  'core-data-pipe',
  'core-data-cluster',
  'core-ops-incident',
  'core-ops-rollback',
  'core-sec-key',
  'core-sec-encrypt',
  'core-a11y-contrast',
  'core-team-review',
  'core-team-handover',
  'core-proto-loop',
  'core-web-deploy',
  'core-web-speed',
  'core-ws-agenda',
  'core-ws-vote',
  'core-ws-timebox',
  'core-legacy-crack',
  'core-refactor',
];

/** Für Tests: Namen aus der Auswahl, die es im nozilla-Set nicht (mehr) gibt. */
export function missingSuggestedIcons(): string[] {
  const known = new Set(Object.keys(nozillaIcons.icons));
  return SUGGESTED_ICONS.filter((name) => !known.has(name));
}

/**
 * Wie viele Namen der Prompt höchstens aufzählt. 554 sprengen ihn; bei rund
 * 150 bleibt er lesbar.
 */
const PROMPT_ICON_LIMIT = 150;

/**
 * Die Namen, die im Prompt stehen dürfen.
 *
 * Die kuratierte Auswahl gilt für das nozilla-Set. Trägt ein Kunde ein eigenes
 * Set, gehen die meisten dieser Namen ins Leere — dann zählt der Prompt lieber
 * dessen eigene Zeichen auf als eine Liste, die zu nichts führt. Die Grenze
 * liegt bei einem Fünftel: was darüber übrig bleibt, ist ein ergänztes Set und
 * kein anderes.
 */
export function promptIcons(): string[] {
  const known = new Set(iconNames());
  const kept = SUGGESTED_ICONS.filter((name) => known.has(name));
  if (kept.length >= SUGGESTED_ICONS.length / 5) return kept;
  return iconNames().slice(0, PROMPT_ICON_LIMIT);
}

/* -------------------------------------------------------------------------- */
/* Prompt bauen                                                                */
/* -------------------------------------------------------------------------- */

const list = (values: readonly string[]) => values.join(' · ');

/** Der Regel- und Formatteil. Ohne Auftrag — der kommt aus dem Brief. */
export function buildSchemaSection(): string {
  const layouts = slideLayouts
    .map((layout) => `  ${layout.padEnd(10)} ${layoutDescriptions[layout]}`)
    .join('\n');

  const tones = toneNames
    .map((tone) => `  ${tone.padEnd(9)} ${elementTones[tone].hint}`)
    .join('\n');

  const typeStyles = (Object.keys(typeScale) as Array<keyof typeof typeScale>)
    .map((name) => `  ${name.padEnd(11)} ${typeScale[name].size} px`)
    .join('\n');

  return `
════════════════════════════════════════════════════════════════
DATEIFORMAT
════════════════════════════════════════════════════════════════

Eine einzige Markdown-Datei. Aufbau:

  ---                       ← Deck-Frontmatter (YAML), einmal ganz oben
  title: …
  author: …
  footer: …
  ---

  <!-- nzl                  ← Metadaten dieser Folie (YAML), optional
  layout: title
  background: paper
  notes: Was die vortragende Person sagt.
  elements:
    - kind: card
      x: 700
      y: 140
      w: 492
      h: 190
      title: …
      body: …
  -->

  # Überschrift der Folie

  Fließtext, Listen, Tabellen, Code — normales Markdown.

  ---                       ← Trenner: neue Folie

  ## Nächste Folie

Regeln zum Format:
• Der Folientrenner ist eine Zeile mit genau \`---\`, davor eine Leerzeile.
• Der \`<!-- nzl … -->\`-Block steht immer VOR dem Fließtext der Folie.
• Der Block ist YAML. Einrückung mit zwei Leerzeichen, keine Tabs.
• Weglassen ist erlaubt: was fehlt, bekommt den CI-Standard.
• Eine Folie ohne freie Elemente braucht den Block gar nicht.

════════════════════════════════════════════════════════════════
FLÄCHE UND KOORDINATEN
════════════════════════════════════════════════════════════════

Die Folie ist ${canvas.width} × ${canvas.height} Einheiten (16:9).
Satzspiegel: links ${canvas.margin.left}, rechts ${canvas.width - canvas.margin.right}, oben ${canvas.margin.top}, unten ${canvas.height - canvas.margin.bottom}.
Alle Werte auf ein Vielfaches von ${canvas.gridSize} runden.

Der Fließtext (das Markdown) wird vom Layout gesetzt. Freie Elemente legst du
selbst — beides auf derselben Folie ist der Normalfall:
Text links im Satzspiegel, Karten rechts ab x ≈ 700.

Elemente dürfen sich nicht überlappen und nicht über den Rand ragen.

════════════════════════════════════════════════════════════════
VOKABULAR — nur diese Werte sind gültig
════════════════════════════════════════════════════════════════

layout:
${layouts}

background:  ${list(slideBackgrounds)}
transition:  ${list(slideTransitions)}

tone — die Farbrolle einer Fläche:
${tones}

fill:        ${list(fillStyles)}
             none = nackt · outline = nur Kontur · flat = nur Fläche · framed = Fläche + Kontur
shadow:      ${list(shadowNames)}          (harter Versatz, kein Weichzeichner)
strokeWeight: ${list(strokeNames)}

kind — die Elementarten und ihre Felder:
  text       text, typeStyle, align (left|center|right), valign (top|middle|bottom)
  markdown   markdown, align
  card       variant, label, title, body, icon
  badge      text, icon
  icon       icon, frame (none|box)
  shape      shape, label
  connector  connector, dashed, label
  image      src, alt, fit (cover|contain)
  wordmark   variant (auto|ink|paper|mono)

card.variant: ${list(cardVariants)}
              feature = Icon + Titel + Text · stat = große Zahl (title) + Bezug (body)
              step = Nummer in label · quote = Zitat in title, Quelle in body
              note = Balken links, für Hinweise
shape:        ${list(shapeNames)}
connector:    ${list(connectorKinds)}

typeStyle (nur für kind: text):
${typeStyles}

reveal — Elemente nacheinander einblenden:
  reveal: { step: 1, animation: rise }
  step 0 = sofort mit der Folie. animation: ${list(revealAnimations)}

icon — nur Namen aus dieser Liste:
${promptIcons().join(', ')}

════════════════════════════════════════════════════════════════
DIE CI — nicht verhandelbar
════════════════════════════════════════════════════════════════

FARBE hat genau drei Rollen. Du wählst nie einen Farbwert, nur eine Rolle.
  Papier  Untergrund, rund 60 % der Fläche
  Tinte   Schrift, Linien, Konturen, rund 35 %
  Signal  Grün, nur echte Handlungsaufforderungen, höchstens 5 %
Höchstens EIN Signal-Element pro Folie. Grün ist kein Dekor.

FORM
  Radius 0. Immer. Es gibt keine runde Ecke.
  Schatten sind harte Versätze (shadow: sm|md|lg), nie weich.
  Keine Verläufe, keine Weichzeichner, kein Glas.

TYPOGRAFIE
  Überschriften: Zilla Slab Bold. Fließtext: Inter. Labels: Space Mono.
  Labels werden automatisch in Versalien gesetzt — schreib sie normal.

DER GRÜNE MARKER — das Signature-Element
  Schreibweise: \`==Wort==\`
  Höchstens ${MAX_MARKERS_PER_PARAGRAPH} pro Absatz, nur auf Schlüsselwörtern.
  Nie ein ganzer Satz, nie zwei Marker direkt hintereinander.

SPRACHE
  Deutsch. Direkt. Kurze Verben statt langer Substantivketten.
  Überschriften sind Sätze mit Punkt.
  Keine Emoji. Keine Ausrufezeichen.
  Verboten: ${forbiddenWords.join(', ')}.
  Behaupte etwas und belege es — keine Werbefloskeln.`.trim();
}

/** Ein knappes, vollständiges Beispiel. Zeigt mehr als jede Beschreibung. */
export function buildExampleSection(): string {
  return `
════════════════════════════════════════════════════════════════
BEISPIEL — so sieht das Ergebnis aus
════════════════════════════════════════════════════════════════

---
title: Ablösung der Altplattform
author: nozilla
footer: nozilla · Gute digitale Dienste.
---

<!-- nzl
layout: title
background: paper
bare: true
notes: Erst das Problem benennen, dann das Angebot.
elements:
  - kind: wordmark
    x: 88
    y: 72
    w: 240
    h: 56
-->

# Die Altplattform kostet mehr, als sie trägt.

Ein Vorschlag, wie wir sie in zwei Quartalen ablösen.

---

<!-- nzl
layout: split
notes: Zahlen langsam vorlesen, sie tragen die Folie.
elements:
  - kind: card
    x: 700
    y: 152
    w: 492
    h: 176
    variant: stat
    label: Wartung
    title: 38 %
    body: der Entwicklungszeit fließen in Fehlerbehebung.
  - kind: card
    x: 700
    y: 360
    w: 492
    h: 176
    variant: stat
    tone: signal
    label: Ziel
    title: 12 %
    body: nach der Ablösung, gemessen über zwei Quartale.
    reveal:
      step: 1
      animation: rise
-->

## Wo die Zeit hingeht

Drei Viertel der Meldungen betreffen ==zwei Module==. Beide stammen aus der
ersten Ausbaustufe und sind seit vier Jahren nicht angefasst worden.

- Sie halten den Rest des Systems auf.
- Sie sind der Grund für die langen Freigaben.
- Sie lassen sich einzeln ersetzen.`.trim();
}

/** Der Auftragsteil — alles, was aus dem Brief kommt. */
export function buildBriefSection(brief: DeckBrief): string {
  const lines: string[] = [];

  lines.push('════════════════════════════════════════════════════════════════');
  lines.push('DER AUFTRAG');
  lines.push('════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Thema:       ${brief.topic.trim() || '(bitte erfragen)'}`);
  lines.push(`Art:         ${purposeLabels[brief.purpose]}`);
  if (brief.audience.trim()) lines.push(`Publikum:    ${brief.audience.trim()}`);
  if (brief.goal.trim()) lines.push(`Ziel danach: ${brief.goal.trim()}`);
  lines.push(`Umfang:      ${brief.slideCount} Folien`);
  if (brief.title.trim()) lines.push(`Titel:       ${brief.title.trim()}`);
  if (brief.footer.trim()) lines.push(`Fußzeile:    ${brief.footer.trim()}`);

  if (brief.material.trim()) {
    lines.push('');
    lines.push('Material, das verarbeitet werden soll:');
    lines.push('---');
    lines.push(brief.material.trim());
    lines.push('---');
  }

  lines.push('');
  lines.push('Aufbau:');
  lines.push(`• Erste Folie: layout: title, bare: true, mit der Wortmarke oben links.`);
  lines.push('• Danach eine Folie pro Gedanke. Ein Gedanke, eine Folie.');
  lines.push(
    brief.richCanvas
      ? '• Mindestens die Hälfte der Folien nutzt die freie Fläche (Karten, Formen, Verbinder).'
      : '• Vorwiegend Fließtext; freie Elemente nur, wo sie wirklich etwas zeigen.',
  );
  lines.push(
    brief.notes
      ? '• Zu jeder Folie `notes:` — ein bis zwei Sätze, was gesagt wird.'
      : '• Keine Notizen.',
  );
  lines.push('• Letzte Folie: was als Nächstes passiert, konkret.');

  return lines.join('\n');
}

export interface PromptOptions {
  /** Das Beispiel weglassen — spart rund ein Drittel der Länge. */
  withExample?: boolean;
}

/**
 * Den vollständigen Prompt bauen: Rolle, Regeln, Format, Vokabular, Beispiel,
 * Auftrag, Ausgabeformat.
 */
export function buildPrompt(brief: DeckBrief, options: PromptOptions = {}): string {
  const { withExample = true } = options;

  return [
    `Du schreibst eine Präsentation für nozilla — eine Boutique-Agentur für
ehrliche Software. Die Ausgabe ist eine einzige Markdown-Datei, die das
nozilla Whiteboard direkt öffnet.

Du bist kein Werbetexter. Du schreibst Sätze, die etwas behaupten, und belegst
sie. Wenn im Material etwas fehlt, das die Aussage tragen müsste, schreibst du
das in die Notizen der Folie statt es zu erfinden.`,
    buildSchemaSection(),
    withExample ? buildExampleSection() : '',
    buildBriefSection(brief),
    `════════════════════════════════════════════════════════════════
AUSGABE
════════════════════════════════════════════════════════════════

Gib ausschließlich den Inhalt der Markdown-Datei aus.
Kein Vorwort, keine Erklärung, kein umschließender Codeblock.
Beginne mit \`---\` (dem Deck-Frontmatter).

Prüfe vor der Ausgabe:
□ Jeder Folientrenner \`---\` hat eine Leerzeile davor.
□ Jeder \`<!-- nzl\`-Block ist mit \`-->\` geschlossen und sauber eingerückt.
□ Alle x/y/w/h liegen im Raster und innerhalb ${canvas.width} × ${canvas.height}.
□ Keine zwei Elemente überlappen sich.
□ Höchstens ein Signal-Element pro Folie.
□ Höchstens ${MAX_MARKERS_PER_PARAGRAPH} grüne Marker pro Absatz.
□ Kein verbotenes Wort, kein Emoji, kein Ausrufezeichen.
□ Alle \`icon:\`-Werte stammen aus der Liste oben.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
