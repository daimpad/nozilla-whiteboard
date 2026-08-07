# nozilla Whiteboard

Ein lokales Werkzeug im Browser, das zwei Dinge gleichzeitig ist: eine
**Markdown-Präsentation** und eine **freie Fläche**. Es kann nur eines
herstellen — Material, das der
[nozilla Corporate Identity](https://github.com/daimpad/nozilla-ci) entspricht.

Die Worte schreibst du in Markdown. Alles andere legst du von Hand. Am Ende
steht wieder eine `.md` — Inhalt und Positionen in einer Datei.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

Kein Server, keine Datenbank, kein Konto. Alles passiert im Browser, alles was
bleibt ist eine Datei auf der Platte.

---

## Die CI ist nicht Stil, sondern Statik

Die Marken-Vorgaben sind hier keine Empfehlung, an die man sich erinnern muss.
Sie sind so eingebaut, dass ein Verstoß gar nicht erst entstehen kann:

| Regel | Wie sie erzwungen wird |
| --- | --- |
| Radius ist 0 | `borderRadius` hat in Tailwind genau einen Wert. `rounded-lg` existiert nicht. Formen nehmen keinen Radius-Parameter entgegen. |
| Schatten sind harte Versätze | Ein Schatten ist eine zweite, versetzte Fläche in Tinte. Es gibt keinen Weichzeichner — auch deshalb exportiert er exakt nach PDF. |
| Farbe hat drei Rollen | Ein Element wählt eine Rolle (`paper`, `paperAlt`, `signal`, `ink`), keinen Farbwert. **Einen Farbwähler gibt es nicht.** |
| Keine fremden Icons | Das Set sind die 462 Icons des CI-Repos, aus deren Geometrie generiert. |
| Drei Schriften | Zilla Slab · Inter · Space Mono, selbst gehostet aus dem CI-Repo. Labels werden automatisch in Versalien mit 0,12 em gesetzt. |
| Grüner Marker | `==so==` im Markdown. Wird auf Fläche, in SVG und in PDF identisch gezeichnet. |

Die Standard-Tailwind-Palette ist **ersetzt**, nicht erweitert: ein
versehentliches `bg-blue-500` ist ein sichtbarer Fehler und kein stiller
CI-Bruch.

---

## Was das Werkzeug kann

**Markdown-Motor.** Deck aus einer `.md` laden (Knopf, `⌘O`, oder Datei ins
Fenster ziehen). Folientrenner ist `---`; der Trenner wird in Codeblöcken und
HTML-Kommentaren ignoriert und verwechselt eine Setext-Überschrift nicht mit
einem Folienwechsel. Deck-Frontmatter oben, Folien-Metadaten je Folie in einem
`<!-- nzl … -->`-Block. Überschriften, Listen, Aufgabenlisten, Code, Zitate,
Tabellen, Bilder — gesetzt in der CI-Hierarchie.

**Freie Fläche.** Ziehen, größer ziehen, drehen; Mehrfachauswahl per Shift oder
Gummiband. Einrasten auf das 8er-Raster *und* auf Hilfslinien: Kanten und
Mitten der Nachbarn, Folienränder, Satzspiegel. `Alt` hält das Raster an.
Duplizieren, löschen, stapeln, ausrichten, verteilen, sperren. Rückgängig und
Wiederholen mit Gesten-Bewusstsein — ein Zug ist ein Schritt, nicht sechzig.

**Präsentation.** `P` startet, `Esc` beendet, `F` Vollbild, `N` Notizen.
Übergänge und Einblendungen; Elemente tragen einen Schritt, damit eine Folie
Gedanke für Gedanke aufgeht. Übersicht mit `⌘K`, Filmstreifen immer sichtbar.
`prefers-reduced-motion` wird beachtet.

**Export.**

| Format | Was herauskommt |
| --- | --- |
| **Markdown** | Das Deck samt aller Positionen, wieder ladbar |
| **SVG** | Echte `<path>`/`<text>`-Vektoren — kein `foreignObject`, keine Rasterung |
| **PDF** | Vektorseiten mit markierbarem, durchsuchbarem Text |

**Prompt-Generator.** Ein Formular beschreibt den Auftrag, daraus entsteht ein
Prompt, der ein Sprachmodell fertiges Deck-Markdown schreiben lässt. Die Antwort
fügst du zurück ein und das Deck ist offen. Siehe [`PROMPT.md`](./PROMPT.md).

---

## Die Architektur in einem Bild

Fast alles oben fällt aus einer Entscheidung: **es gibt genau eine
Zeichenstrecke**, und der Editor ist ihr Kunde wie alle anderen.

```
 Folie ──► buildSlideScene() ──► Scene { ScenePrim[] }
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              primsToSvgMarkup   sceneToSvg     scenesToPdf
              (die Fläche)       (.svg)         (.pdf)
```

Eine `Scene` ist flach und vollständig aufgelöst: jede Farbe ein Literal, jeder
Textlauf gesetzt, jede Kurve ein Bézier. Die Fläche zeichnet, indem sie **genau
das Markup einsetzt, das der SVG-Export erzeugt** — der Editor ist damit
buchstäblich WYSIWYG gegenüber dem Export. Es gibt keinen zweiten Renderer, der
widersprechen könnte.

Zwei Bausteine machen das möglich:

- **`src/lib/geometry/path.ts`** — eine normalisierte Segmentliste (Move /
  Linie / Kubik / Schließen) für alle Geometrie. Ellipsenbögen werden beim
  Einlesen zu Kubiken, weil PDF keinen Bogen-Operator kennt.
- **`src/lib/text/typeset.ts`** — ein kleiner Markdown-Setzer, der mit der
  echten Schrift misst (Canvas `measureText`) und positionierte Textzeilen
  ausgibt. Nur deshalb ist exportierter Text *Text* und kein Bild.

### Wo was liegt

```
theme.config.ts               Die CI. Eine Datei. Alles liest von hier.
PROMPT.md                     Der Deck-Prompt, erklärt
scripts/sync-ci.mjs           Holt Schriften, Marke und Icons aus dem CI-Repo
src/
  assets/     icons.ts        Fassade über dem generierten Set (462 Icons)
              *.generated.ts  Erzeugt — nicht von Hand ändern
              presets.ts      Die Bausteine, die die Bibliothek anbietet
  model/      types.ts        Deck / Folie / Element
              factory.ts      Der einzige Weg, auf dem ein Element entsteht
  lib/
    markdown/ deck.ts         Markdown ⇄ Deck (das Dateiformat)
    geometry/ path.ts         Segmente, Matrizen, Pfad-Parser (inkl. Bögen)
              shapes.ts       CI-Formen und Verbinder
              snap.ts         Raster, Hilfslinien, Größenänderung
    text/     measure.ts      Schriftmaße (+ deterministischer Ersatz für Tests)
              typeset.ts      Markdown → gesetzter Text
    export/   scene.ts        Folie → Szene  ◄── die Drehscheibe
              svg.ts · pdf.ts Szene → Datei
    prompt/   buildPrompt.ts  Der Prompt, aus dem laufenden Schema gebaut
  state/      deckStore.ts    Zustand, Aktionen, Verlauf
  components/ canvas · panels · chrome · present · ui
```

---

## Das Dateiformat

Ein Deck, das die Fläche nie gesehen hat, ist gewöhnliches Markdown. Ein Deck
aus der Fläche ist gewöhnliches Markdown plus ein Metadaten-Kommentar je Folie:

```md
---
title: Ablösung der Altplattform
footer: nozilla · Gute digitale Dienste.
---

<!-- nzl
layout: title
background: paper
notes: Erst das Problem benennen, dann das Angebot.
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
-->

# Die Altplattform kostet mehr, als sie trägt.

Drei Viertel der Meldungen betreffen ==zwei Module==.
```

Was der Schreiber dabei einhält:

- **Nur Geändertes wird geschrieben.** Alles, was noch dem CI-Standard
  entspricht, fällt weg. Die Metadaten bleiben lesbar, die Diffs klein.
- **Der Rundlauf ist verlustfrei.** `parse(serialize(deck))` ergibt dasselbe
  Deck, und `serialize` ist idempotent. Beides wird gegen das mitgelieferte Deck
  getestet.
- **Handarbeit darf schiefgehen.** Ein falscher Wert fällt auf den CI-Standard
  zurück statt die Datei zu sprengen; ein kaputtes Element reißt nicht das Deck
  mit.
- **`-->` im Inhalt ist sicher.** Der Schreiber maskiert es umkehrbar, damit
  Prosa über das Format reden darf.

---

## CI-Sync

Schriften, Marken-Grafiken und Icons kommen aus dem CI-Repo und werden nicht von
Hand kopiert:

```bash
git clone https://github.com/daimpad/nozilla-ci ../nozilla-ci
npm run sync:ci             # oder: node scripts/sync-ci.mjs <pfad>
npm run sync:ci -- --check  # nur prüfen
```

Der Sync erzwingt dieselben Regeln wie der Build im CI-Repo: 64er-Raster, 4 px,
square caps, miter joins, keine abgerundeten Rechtecke, nur Tinte und Signal.
Wer eine Regel bricht, bekommt einen roten Lauf.

Er schreibt:

- `public/fonts/` — Zilla Slab · Inter · Space Mono (SIL OFL, siehe `OFL.txt`)
- `public/brand/` — Wortmarke, Favicon, Social Preview
- `src/assets/icons.generated.ts` — 462 Icons als Primitive
- `src/assets/wordmark.generated.ts` — die Wortmarke als Vektorpfade

Die Wortmarke wird als **Pfad** übernommen, nicht als Bild — nur so landet sie
in SVG *und* PDF als echter Vektor, ohne dass der Export eine Datei nachladen
muss.

---

## Tasten

| | |
| --- | --- |
| `→` `←` `Leer` | Folie vor / zurück (in der Präsentation: Einblendschritt) |
| Pfeiltasten | Auswahl um eine Rasterstufe schieben (`⇧` = fünf) |
| `⌘D` / `⌫` | Duplizieren / löschen |
| `⌘]` `⌘[` | Nach vorn / nach hinten (`⇧` = ganz) |
| `⌘A` / `Esc` | Alles wählen / Auswahl aufheben |
| `⌘Z` `⇧⌘Z` | Rückgängig / wiederholen |
| `⌘O` `⌘S` | Markdown öffnen / sichern |
| `⌘K` | Übersicht |
| `P` / `Esc` | Präsentieren / zurück |
| `N` / `F` | Notizen / Vollbild (während der Präsentation) |
| `G` | Raster an/aus |

Während du in einem Feld tippst, sind alle Tasten wirkungslos.

---

## Entwicklung

```bash
npm run dev        # Entwicklungsserver
npm run build      # Typprüfung + Produktions-Build
npm run preview    # Build ausliefern
npm test           # 2 932 Tests
npm run lint
npm run typecheck
npm run format
npm run sync:ci    # CI-Bestände neu holen
```

Getestet wird, wo ein Fehler unsichtbar bliebe, bis er in einer Datei landet:
der Folien-Trenner und der Rundlauf, der Pfad-Parser samt Bogen-Umwandlung,
Raster und Größenänderung, Zeilenumbruch und Satz, der Szenenaufbau, der
SVG-Schreiber, die PDF-Geometrie, der Verlauf des Zustands — und die
CI-Konformität aller 462 Icons.

`src/decks/welcome.md` ist zugleich Beispiel und Prüfstein.

### Was man wissen sollte

- **Schriften im PDF.** Ein PDF kann keine Web-Schrift referenzieren, ohne sie
  einzubetten. Der Export nutzt deshalb die metrisch verwandten Kernschriften
  aus `theme.config.ts` (Times für die Slab-Serif, Helvetica für Inter, Courier
  für Space Mono). Der Zeilenumbruch ist zu dem Zeitpunkt längst gegen die
  echten Bildschirmmaße gefallen und jede Zeile sitzt absolut — der Ersatz
  verschiebt also nichts, er zeichnet die Glyphen nur etwas anders.
- **Bilder.** Ein Bild auf der Fläche wird als Data-URI eingebettet, damit das
  Deck eine tragbare Datei bleibt. In Markdown relativ referenzierte Bilder
  lösen gegen die Seite auf und müssen unter `public/` liegen.
- **Rohes HTML in Markdown** wird für die Anzeige entschärft und nicht nach
  SVG/PDF gesetzt — es als Vektortext auszugeben wäre eine Behauptung, die nicht
  stimmt.
