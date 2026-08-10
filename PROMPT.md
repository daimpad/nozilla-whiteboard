# Deck-Prompt

Ein Prompt, der ein Sprachmodell dazu bringt, **Markdown auszugeben, das dieses
Werkzeug direkt öffnet** — und das dabei die
[nozilla-CI](https://github.com/daimpad/nozilla-ci) einhält.

---

## Was der Prompt leistet

Ein Deck ohne Prompt zu erfragen liefert Prosa. Man bekommt Folientexte, muss
sie selbst aufteilen, selbst platzieren, selbst einfärben — und landet am Ende
doch bei Standardgrau mit runden Ecken.

Der Prompt schließt vier Lücken auf einmal:

**1 · Er nennt das Dateiformat.** Folientrenner, der `<!-- nzl … -->`-Block,
YAML-Einrückung, wo der Block relativ zum Fließtext steht. Ohne das errät ein
Modell irgendein Markdown, und der Parser sieht eine einzige lange Folie.

**2 · Er nennt das Vokabular vollständig.** Layouts, Hintergründe, Farbrollen,
Elementarten mit ihren Feldern, Kartenvarianten, Formen, Verbinder, Typo-Stufen,
Einblend-Animationen, erlaubte Icon-Namen. Ein Wert, den der Parser nicht kennt,
fällt beim Laden auf den Standard zurück — das Deck sieht dann anders aus als
gedacht, ohne dass jemand merkt warum.

**3 · Er gibt ein Koordinatensystem.** 1280 × 720, Satzspiegel, 8er-Raster,
„Text links, Karten ab x ≈ 700". Ohne Zahlen erfindet ein Modell Positionen, und
Elemente überlappen oder rutschen aus der Folie.

**4 · Er überträgt die CI als Regel, nicht als Stimmung.** Drei Farbrollen statt
Palette, höchstens ein Signal-Element pro Folie, Radius 0, harte Schatten,
höchstens drei grüne Marker pro Absatz, die Verbotsliste für Buzzwords, deutsche
Sprache mit Punkt am Satzende.

Dazu ein vollständiges Beispiel-Deck. Das trifft das Format erfahrungsgemäß
deutlich besser als jede Beschreibung — es lässt sich abschalten, wenn der
Prompt kürzer sein muss.

Am Ende steht eine Prüfliste, die das Modell vor der Ausgabe abhakt.

---

## Verwendung

### In der App (empfohlen)

Oben rechts auf **Prompt** klicken. Das Formular fragt Thema, Art, Publikum,
Ziel, Umfang und Material ab; rechts steht der fertige Prompt zum Kopieren.

Die Antwort des Modells fügst du unten wieder ein und drückst **Als Deck
öffnen** — fertig. Kein Dateiumweg, kein Copy-Paste in einen Editor.

Der Prompt wird dabei **aus dem laufenden Schema erzeugt**
(`src/lib/prompt/buildPrompt.ts`). Er kann deshalb nichts nennen, was der Parser
nicht kennt: kommt ein Layout dazu, steht es im nächsten Prompt.

### Von Hand

Den Block unten kopieren, `{{THEMA}}` ersetzen und die Zeilen unter „DER
AUFTRAG" anpassen.

---

## Der Prompt

<!-- BEGIN GENERATED PROMPT -->

```text
Du schreibst eine Präsentation für nozilla — eine Boutique-Agentur für
ehrliche Software. Die Ausgabe ist eine einzige Markdown-Datei, die das
nozilla Whiteboard direkt öffnet.

Du bist kein Werbetexter. Du schreibst Sätze, die etwas behaupten, und belegst
sie. Wenn im Material etwas fehlt, das die Aussage tragen müsste, schreibst du
das in die Notizen der Folie statt es zu erfinden.

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
• Der Folientrenner ist eine Zeile mit genau `---`, davor eine Leerzeile.
• Der `<!-- nzl … -->`-Block steht immer VOR dem Fließtext der Folie.
• Der Block ist YAML. Einrückung mit zwei Leerzeichen, keine Tabs.
• Weglassen ist erlaubt: was fehlt, bekommt den CI-Standard.
• Eine Folie ohne freie Elemente braucht den Block gar nicht.

════════════════════════════════════════════════════════════════
FLÄCHE UND KOORDINATEN
════════════════════════════════════════════════════════════════

Die Folie ist 1280 × 720 Einheiten (16:9).
Satzspiegel: links 88, rechts 1192, oben 72, unten 648.
Alle Werte auf ein Vielfaches von 8 runden.

Der Fließtext (das Markdown) wird vom Layout gesetzt. Freie Elemente legst du
selbst — beides auf derselben Folie ist der Normalfall:
Text links im Satzspiegel, Karten rechts ab x ≈ 700.

Elemente dürfen sich nicht überlappen und nicht über den Rand ragen.

════════════════════════════════════════════════════════════════
VOKABULAR — nur diese Werte sind gültig
════════════════════════════════════════════════════════════════

layout:
  title      Titelfolie — Kampagnensatz am Satzspiegel
  default    Standardfolie — Fließtext im Satzspiegel
  section    Kapiteltrenner
  split      Text links, Fläche rechts
  quote      Zitat
  statement  Eine Aussage, groß
  blank      Ohne Fließtext
  canvas     Nur freie Fläche

background:  paper · ink · signal · grid
transition:  none · cut · fade · slide · push

tone — die Farbrolle einer Fläche:
  paper     Standard — Papier mit Tintenkontur
  signal    Nur echte Handlungsaufforderungen — 5 % der Fläche
  ink       Invers — Tinte als Fläche, Papier als Schrift

fill:        none · outline · flat · framed
             none = nackt · outline = nur Kontur · flat = nur Fläche · framed = Fläche + Kontur
shadow:      none · sm · md · lg          (harter Versatz, kein Weichzeichner)
strokeWeight: hair · rule · strong · heavy

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

card.variant: feature · stat · step · quote · note
              feature = Icon + Titel + Text · stat = große Zahl (title) + Bezug (body)
              step = Nummer in label · quote = Zitat in title, Quelle in body
              note = Balken links, für Hinweise
shape:        rectangle · ellipse · diamond · triangle · hexagon · chevron · banner · callout · frame · bracket · cross
connector:    line · arrow · double-arrow · elbow

typeStyle (nur für kind: text):
  display     140 px
  headline    88 px
  h1          68 px
  h2          48 px
  h3          34 px
  h4          21 px
  lead        21 px
  body        16 px
  bodyStrong  16 px
  small       13 px
  label       12 px
  labelSmall  11 px
  code        13 px
  codeInline  15 px

reveal — Elemente nacheinander einblenden:
  reveal: { step: 1, animation: rise }
  step 0 = sofort mit der Folie. animation: cut · fade · rise · slide-left · slide-right · wipe

icon — nur Namen aus dieser Liste:
arrow-right, arrow-up, arrow-down, check, square-check, xmark, plus, circle-info, triangle-exclamation, circle-question, lightbulb, bolt, rocket, flag, bullseye, compass, map, route, flask, microscope, chart-line, chart-simple, chart-pie, table, list-check, clipboard, file-lines, file-pdf, folder, book, newspaper, pen-to-square, users, user, handshake, comment, comments, envelope, phone, clock, calendar-days, hourglass, stopwatch, code, terminal, database, server, cloud, gears, sliders, wrench, lock, shield-halved, key, eye, magnifying-glass, filter, money-bill, coins, cart-shopping, tag, star, heart, thumbs-up, layer-group, object-group, cube, puzzle-piece, link, share-nodes, building, globe, leaf, recycle, truck, box-open, core-ai-model, core-ai-prompt, core-ai-drift, core-data-pipe, core-data-cluster, core-ops-incident, core-ops-rollback, core-sec-key, core-sec-encrypt, core-a11y-contrast, core-team-review, core-team-handover, core-proto-loop, core-web-deploy, core-web-speed, core-ws-agenda, core-ws-vote, core-ws-timebox, core-legacy-crack, core-refactor

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
  Schreibweise: `==Wort==`
  Höchstens 3 pro Absatz, nur auf Schlüsselwörtern.
  Nie ein ganzer Satz, nie zwei Marker direkt hintereinander.

SPRACHE
  Deutsch. Direkt. Kurze Verben statt langer Substantivketten.
  Überschriften sind Sätze mit Punkt.
  Keine Emoji. Keine Ausrufezeichen.
  Verboten: seamless, disruptive, disruptiv, synergy, synergie, empowern, orchestrieren, ganzheitlich, innovativ, state-of-the-art, best-in-class, leverage.
  Behaupte etwas und belege es — keine Werbefloskeln.

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
- Sie lassen sich einzeln ersetzen.

════════════════════════════════════════════════════════════════
DER AUFTRAG
════════════════════════════════════════════════════════════════

Thema:       {{THEMA}}
Art:         Pitch — überzeugen, ein Angebot machen
Umfang:      8 Folien
Fußzeile:    nozilla · Gute digitale Dienste.

Aufbau:
• Erste Folie: layout: title, bare: true, mit der Wortmarke oben links.
• Danach eine Folie pro Gedanke. Ein Gedanke, eine Folie.
• Mindestens die Hälfte der Folien nutzt die freie Fläche (Karten, Formen, Verbinder).
• Zu jeder Folie `notes:` — ein bis zwei Sätze, was gesagt wird.
• Letzte Folie: was als Nächstes passiert, konkret.

════════════════════════════════════════════════════════════════
AUSGABE
════════════════════════════════════════════════════════════════

Gib ausschließlich den Inhalt der Markdown-Datei aus.
Kein Vorwort, keine Erklärung, kein umschließender Codeblock.
Beginne mit `---` (dem Deck-Frontmatter).

Prüfe vor der Ausgabe:
□ Jeder Folientrenner `---` hat eine Leerzeile davor.
□ Jeder `<!-- nzl`-Block ist mit `-->` geschlossen und sauber eingerückt.
□ Alle x/y/w/h liegen im Raster und innerhalb 1280 × 720.
□ Keine zwei Elemente überlappen sich.
□ Höchstens ein Signal-Element pro Folie.
□ Höchstens 3 grüne Marker pro Absatz.
□ Kein verbotenes Wort, kein Emoji, kein Ausrufezeichen.
□ Alle `icon:`-Werte stammen aus der Liste oben.
```

<!-- END GENERATED PROMPT -->

---

## Warum ein Generator, kein Textbaustein

Der Prompt muss dasselbe Vokabular nennen, gegen das der Parser prüft. Ein von
Hand gepflegter Prompt wäre in dem Moment falsch, in dem jemand ein Layout, eine
Kartenvariante oder eine Farbrolle ergänzt — und niemand merkt es, weil ein
falscher Wert stillschweigend auf den Standard zurückfällt.

Deshalb liest der Generator dieselben Konstanten wie der Parser. Der Test in
`src/lib/prompt/prompt.test.ts` hält beides zusammen:

- Jedes Layout, jeder Hintergrund, jede Farbrolle, jede Kartenvariante und jede
  Form muss im Prompt vorkommen.
- Jeder vorgeschlagene Icon-Name muss im echten Set existieren.
- Das mitgelieferte Beispiel muss selbst als Deck parsen — und sich an die
  Regeln halten, die es vorführt.
- Diese Datei muss den aktuellen Prompt enthalten.

Neu schreiben nach einer Änderung:

```bash
UPDATE_PROMPT=1 npx vitest run src/lib/prompt
```
