# CLAUDE.md

Arbeitsanweisung für Claude Code in diesem Projekt. Kurz, damit sie gelesen
wird.

---

## Was das hier ist

Ein lokales Werkzeug im Browser: **Markdown-Präsentation** und **freie Fläche**
zugleich. Es kann nur eines herstellen — Material, das der
[nozilla CI](https://github.com/daimpad/nozilla-ci) entspricht. React 18, Vite,
TypeScript, Tailwind. Kein Server, keine Datenbank, kein Konto.

```bash
npm run dev          # http://127.0.0.1:5173
npm run build        # tsc --noEmit && vite build
npm run test         # vitest
npm run test:ui      # Rauchtest der Oberfläche (braucht ein Bauwerk)
npm run lint
npm run format
npm run sync:ci -- ../nozilla-ci    # Schriften, Marke, Icons aus dem CI-Repo
```

---

## Die zwei Regeln, die alles andere tragen

### 1 · Es gibt genau eine Zeichenstrecke

```
Folie ──► buildSlideScene() ──► Scene { ScenePrim[] }
                                   │
                   ┌───────────────┼───────────────┬──────────────┐
                   ▼               ▼               ▼              ▼
             primsToSvgMarkup   sceneToSvg     scenesToPdf    deckToPptx
             (die Fläche)       (.svg)         (.pdf)         (.pptx)
```

Die Fläche zeichnet, indem sie **genau das Markup einsetzt, das der
SVG-Export erzeugt**. Es gibt keinen zweiten Renderer, der widersprechen
könnte — und es soll auch keinen geben.

**Wer eine neue Ausgabe baut, wird Kunde der `Scene`.** Nicht des DOM, nicht des
Markdowns, nicht der Elemente. Die eine begründete Ausnahme ist der Text im
PPTX-Weg (siehe unten), und sie ist im Kopf von `pptx.ts` ausgeschrieben.

### 2 · Marke und Werkzeug sind getrennt

`theme.config.ts` führt zwei Sätze, und sie dürfen sich nicht berühren:

|              | Namensraum                                                                                               | Wofür                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Inhalt**   | `palette`, `color`, `elementTones` → `bg-signal`, `text-ink`, `border-line`, `shadow-md`, `rounded-none` | alles, was auf einer Folie landet und exportiert wird |
| **Werkzeug** | `ui`, `uiRadius`, `uiShadow` → `bg-ui-surface`, `text-ui-ink`, `border-ui`, `shadow-ui-md`, `rounded-md` | Leisten, Paletten, Felder, Griffe, Auswahlrahmen      |

Die Oberfläche leiht sich **nichts** von der Marke, auch keinen Akzent: Weiß,
sechs Graustufen, Schwarz. Der Grund steht in `theme.config.ts` — ein
cremefarbener Editor um eine cremefarbene Folie macht beides unlesbar.

Dieselbe Leiter gibt es von unten gelesen als `uiDark`: die Einstellung
*Erscheinung* (Zahnrad unten links) schaltet die Leisten auf dunkel um. Sie
gehört dem Arbeitsplatz und nicht dem Deck, bleibt deshalb im Browser und steht
in keiner Datei. **Die Folie ändert sich dabei nie** — `surface.test.ts` prüft
das am erzeugten Markup und nicht an der Zusicherung.

`src/theme/theme.test.ts` liest die Komponenten-Quellen und schlägt an, wenn
eine Bedienfläche einen Marken-Ton benutzt. Der Test existiert, weil dieser
Fehler schon zweimal gemacht wurde.

### 3 · Die Marke ist wechselbar, das Werkzeug nicht

Die linke Spalte der Tabelle gehört einem **Erscheinungsbild**, und davon kann
es mehrere geben: nozilla plus je eines pro Kunde. Angemeldet wird in
`src/themes/`, gewählt wird im Inspektor, gemerkt wird es im Frontmatter
(`theme:`) — die Datei trägt ihre Zugehörigkeit mit.

```
theme.config.ts ──► brandTheme.ts ──► runtime.ts ──► theme/index.ts ──► alles
 (die nozilla-CI)    (der Vertrag)     (die aktive     (die Fassade)
                                        Belegung)
```

Ein Erscheinungsbild belegt Farben, Typo-Leiter, Schriften, Strichstärken,
Schattenversätze, die **Wortmarke** (Pflicht) und das **Icon-Set** (ohne Angabe
das von nozilla). Was strukturell ist — Radius 0, 1280 × 720, das 64er-Raster
der Icons — bleibt; warum, steht im Kopf von `brandTheme.ts`.

`src/themes/musterkunde.ts` ist die Vorlage und läuft mit: sie belegt jede
Rolle einmal und ist der schnellste Weg zu einem echten Kunden. Farben werden
dabei *einmal* genannt — `tonesFromPalette()` und `colorsFromPalette()` mischen
die drei Tonrollen und die fünfundzwanzig semantischen Tokens daraus, und
`brandTheme.test.ts` hält beide an `theme.config.ts`.

Die rechte Spalte wechselt nie mit. Auch die Icons haben deshalb zwei Wege:
`Icon` zeichnet aus dem Werkzeug-Set (`ToolIconName`, eng typisiert),
`BrandIcon` aus dem des Erscheinungsbilds. Ein Kunden-Set, dem `chevron-right`
fehlt, darf keinen Knopf leeren.

**Die Regel, die daran hängt: nichts darf einen CI-Wert beim Laden abgreifen.**
`export let` in `runtime.ts` ist eine lebendige Bindung; ein
`const PAPER = { ink: ci.ink }` auf Modulebene friert das Erscheinungsbild vom
Start ein. `runtime.test.ts` prüft deshalb das Ergebnis eines Wechsels und nicht
die Mechanik.

---

## Wo was liegt

```
theme.config.ts               Die CI. Eine Datei. Alles liest von hier.
CLAUDE.md                     Diese Datei
README.md                     Für Menschen, die das Werkzeug benutzen
PROMPT.md                     Der Deck-Prompt, erklärt
scripts/sync-ci.mjs           Holt Schriften, Marke und Icons aus dem CI-Repo
src/
  assets/     iconSet.ts      Ein Icon-Set als Wert; das nozilla-Set
              icons.ts        Das Set des gültigen Erscheinungsbilds
              *.generated.ts  ERZEUGT — nicht von Hand ändern
  theme/      brandTheme.ts   Was ein Erscheinungsbild ausmacht — und was nicht
              runtime.ts      Welches gerade gilt (lebendige Bindungen)
              surface.ts      Hell oder dunkel — die Erscheinung des Werkzeugs
              index.ts        Die Fassade: Inhalt aus der Laufzeit, Werkzeug aus
                              der Konfiguration
  themes/     index.ts        Hier kommen die Erscheinungsbilder der Kunden an
              musterkunde.ts  Die Vorlage: jede wechselbare Rolle einmal belegt
  decks/      index.ts        Die mitgelieferten Decks
              welcome.md      nozilla — jedes Layout, jede Elementart
              musterkunde.md  Ein Deck unter fremder Marke, als Beleg
  model/      types.ts        Deck / Folie / Element
              factory.ts      Der einzige Weg, auf dem ein Element entsteht
  lib/
    markdown/ deck.ts         Markdown ⇄ Deck (das Dateiformat)
    geometry/ path.ts         Segmente, Matrizen, Pfad-Parser (inkl. Bögen)
    text/     measure.ts      Schriftmaße (+ Ersatz für Tests ohne Canvas)
              typeset.ts      Markdown → gesetzter Text
              truetype.ts     Zeichen → Umriss (glyf, cmap, composite)
    export/   scene.ts        Folie → Szene  ◄── die Drehscheibe
              svg.ts pdf.ts   Szene → Datei
              pptx*.ts zip.ts Szene + Modell → PowerPoint
  state/      deckStore.ts    Zustand, Aktionen, Verlauf
  components/ canvas · panels · chrome · present · ui
```

**Nicht von Hand ändern:** `src/assets/icons.generated.ts`,
`src/assets/iconsCore.generated.ts`, `src/assets/wordmark.generated.ts`. Sie
kommen aus `npm run sync:ci`.

---

## Wo die CI herkommt — und wer recht hat

Die CI steht an zwei Orten: im Dokument
([daimpad/nozilla-ci](https://github.com/daimpad/nozilla-ci), von wo dieses
Werkzeug synchronisiert) und in der Webseite
([daimpad/nozilla-net](https://github.com/daimpad/nozilla-net), privat).

**Bei Unterschieden gilt die Webseite.** Entschieden vom Auftraggeber am
7. August 2026, für die Marken wie für die Zeichen; nachzulesen in
`ci/UEBERNAHME.md` des Webseiten-Repos. Der Grund ist nicht Geschmack: die
Webseite ist die Stelle, an der die Werte gegen echten Text laufen — zwei
Sprachen, 205 Seiten, fünf Bildschirmbreiten, elf Prüfungen bei jedem Bauen.

Praktisch heißt das: **das Dokument kann hinter der Webseite herhinken, und
dann hinkt dieses Werkzeug mit.** Zurzeit hinkt es nicht — die Übernahme vom
7. August steht in `nozilla-ci` (Marken wie Zeichen), und dieses Werkzeug
synchronisiert weiterhin aus genau dieser einen Quelle. Wer den Verdacht hat,
dass etwas auseinandergelaufen ist, vergleicht `design-system.css` in beiden
Repos, bevor er hier etwas ändert.

---

## Konventionen

- **Kommentare auf Deutsch, in ganzen Sätzen.** Sie erklären _warum_, nicht
  _was_. Ein Kommentar, der den Code nacherzählt, gehört gelöscht.
- **Die Oberfläche spricht Deutsch.** Beschriftungen, Titel, Platzhalter,
  Hinweise. Fachwörter bleiben, wo sie auch auf Deutsch so heißen — Markdown,
  Label, Layout, Badge, Export, Deck. Die *Werte* des Dateiformats bleiben
  englisch (`layout: canvas` steht so in der `.md`); übersetzt wird nur, was
  daneben angezeigt wird, und das steht in `src/lib/labels.ts`.
  `language.test.ts` schlägt an, wenn ein englischer Satz zurückkommt.
- **Keine erfundenen Werte.** Kein Hex, keine Schriftgröße, kein Radius im
  Code — alles kommt aus `theme.config.ts`. Die Tailwind-Palette ist
  **ersetzt**, nicht erweitert: ein `bg-blue-500` ist ein Fehler, kein
  stiller CI-Bruch.
- **Prettier entscheidet die Form.** `npm run format` vor dem Commit.
- **Neue Abhängigkeiten nur mit gutem Grund.** Der Pfad-Parser, der Setzer,
  der TrueType-Leser und der ZIP-Schreiber stehen hier, weil das Projekt
  jeweils genau einen Weg braucht und eine Bibliothek zehn mitbrächte.
- **Commit-Nachrichten auf Deutsch**, Betreff im Imperativ, Rumpf erklärt die
  Entscheidung — nicht die Zeilen.

---

## Prüfen heißt: gegen das Ergebnis, nicht gegen den Erzeuger

Die teuersten Fehler dieses Projekts wären von keinem Test gefunden worden, der
prüft, ob eine Funktion schreibt, was sie schreibt.

- **SVG**: als XML parsen, auf Primitive prüfen.
- **PDF**: mit `pdfjs-dist` rendern; die eingebetteten Schriften mit einem
  Byte-Griff nach `FontFile2` nachweisen.
- **PPTX**: das ZIP im Test wieder aufmachen, jedes XML parsen, **jede benutzte
  Relationship-Id auflösen**. Zusätzlich von Hand mit LibreOffice Impress
  öffnen (`soffice --headless --convert-to pdf`) und die Seiten ansehen.
- **Oberfläche**: `npm run test:ui` — Playwright gegen `vite preview`, also
  gegen das gebaute Verzeichnis. Neun Handgriffe, die je einen Fehler abbilden,
  der einmal grün durchgekommen ist. Warum welcher, steht im Kopf von
  `scripts/smoke.mjs`. Chromium liegt hier unter `/opt/pw-browsers/`; die
  Fassung passt nicht zur Bibliothek, deshalb
  `SMOKE_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

Wenn du eine Ausgabe änderst, sieh sie dir an. Nicht die Zusicherung — das
Bild.

---

## Fallen, die schon zugeschnappt sind

Jede davon hat Zeit gekostet. Sie stehen hier, damit sie es nicht noch einmal
tun.

**Ein veralteter Checkout sieht aus wie ein aktueller.** Im Arbeitsverzeichnis
lagen zwei Klone des CI-Repos, einer davon Wochen alt. Der Vergleich mit der
Webseite führte deshalb zu dem Schluss, das CI-Repo hinke hinterher — es hinkte
der Klon. Der Sync schreibt jetzt den Stand seiner Quelle mit
(`Quelle: … @ 513f017`); wer eine Behauptung über ein anderes Repo aufstellt,
prüft vorher `git -C <pfad> log -1`.

**Teilkonturen gehören in _einen_ Pfad.** Sonst füllt jede für sich, und der
Ring wird zur Scheibe — im PDF (`doc.lines(..., null)` für alle bis auf den
letzten Teilpfad) wie in PPTX (ein `<a:path>` mit mehreren `moveTo`). Fällt bei
Formen nie auf, weil keine ein Loch hat. Bei Buchstaben ist es jeder zweite.

**`a:spcPct` ist ein Prozentsatz des _natürlichen_ Zeilenabstands**, nicht der
Schriftgröße. Die CI gibt den Abstand als Vielfaches der Schriftgröße an. Wer
das gleichsetzt, bekommt rund 1,2× zu viel und jede Karte läuft über. Deshalb
`a:spcPts`, absolut.

**`a:tcPr` ist eine Sequenz.** Erst die Linien, dann die Füllung. Umgekehrt ist
die Datei ungültig — ohne dass ein Betrachter es sagt.

**Positive Laufweite (`spc`) schneidet LibreOffice ab.** Es reserviert die
ungesperrte Breite und zeichnet die gesperrte. Die Datei ist korrekt, der
Renderer nicht. Wir sperren deshalb im PPTX nur negativ.

**PDF kennt keinen Bogen-Operator.** Ellipsenbögen werden beim Einlesen zu
Kubiken (`arcToCubics` in `path.ts`). Ohne das fehlt jedes Icon mit einem
Bogen im PDF — und das sind die meisten.

**`spc`, `sz`, `spcPts` sind Hundertstel Punkt. `marL`, `indent`, `w` sind
EMU.** Eine Folien-Einheit ist 9525 EMU und ¾ Punkt. Wer das verwechselt,
bekommt Ergebnisse, die _fast_ stimmen.

**Weißraum in `<a:t>` ist bedeutsam.** Ein weicher Markdown-Umbruch wird auf der
Fläche zum Leerzeichen und muss es im Export auch werden.

**WOFF2 kann nichts lesen, was Glyphen braucht.** jsPDF bettet TrueType ein,
der Umriss-Leser braucht `glyf`. Deshalb liegen in `public/fonts/` beide
Formate: WOFF2 für den Bildschirm, TTF für den Export.

**zustand v5 + `useSyncExternalStore`**: ein Selektor, der ein frisches Array
zurückgibt, ist eine Endlosschleife. `useShallow` benutzen.

**Die Tailwind-Skalen sind ersetzt.** Fehlt eine Stufe, verpufft die Utility
lautlos — `pl-7` ohne `7` im Spacing tut einfach nichts. Beim Ändern von
`tailwind.config.ts` die Ausgabe ansehen.

**Zwei Zahlenreihen im selben Namensraum überschreiben einander.** Das
`spacing` trug erst das 4px-Raster und darüber die benannten CI-Stufen —
und `space[8]` ist 64px, die achte Rasterstufe 32px. Jeder `h-8`-Knopf war
doppelt so groß wie gebaut, `top-9` schob ein Menü 96px statt 36px nach
unten. Es fiel monatelang nicht auf, weil _alles_ zu groß war und damit
wieder stimmig aussah. Die CI-Stufen heißen jetzt `ci-*`; die Zahlen gehören
dem Raster.

**Eine Tabelle „Rolle → Wert" auf Modulebene ist eine eingefrorene CI.** Im
PDF-Weg stand `{ display: 'Zilla Slab', body: 'Inter', mono: 'Space Mono' }`.
Ein Erscheinungsbild mit anderer Auszeichnungsschrift fand seine Datei nicht,
und der Export fiel still auf Helvetica zurück — kein Fehler, keine Warnung,
nur eine andere Schrift. Gefunden hat es niemand: der Musterkunde hat es
gefunden, beim Nachsehen in der Datei. Der Name kommt jetzt aus
`familyName(rolle)`.

**Ein Marker in Grün, den kein Test sah.** Der `==Marker==` wurde im PPTX als
`<a:highlight><a:srgbClr val="00FF9C"/>` geschrieben — im Klartext, weil dieser
Weg die Farbe nicht aus der Szene nimmt. SVG und PDF waren richtig, die `.pptx`
grün. Der Test prüfte die Zeichenkette und bestätigte den Fehler. Er vergleicht
jetzt gegen `palette.signal`.

**`ui` als Wert zu lesen friert die helle Fassung ein.** Seit die Erscheinung
des Werkzeugs umschaltbar ist, laufen die Leisten über CSS-Variablen. Eine
Komponente, die `ui.surface` importiert, bekommt dagegen den Modulwert — und
behält im dunklen Werkzeug eine weiße Fläche. Farben gehören über die
Tailwind-Klassen bezogen. Die eine Ausnahme ist `CanvasStage`: Auswahlrahmen,
Aufziehrechteck und Raster liegen *auf* der Folie und wechseln absichtlich
nicht mit; ein weißer Rahmen auf cremefarbenem Papier wäre unsichtbar.
`theme.test.ts` lässt genau diese drei durch.

**Das letzte Primitiv ist nicht immer die Signatur.** Für kleine Knöpfe wird
der grüne 6 × 6-Punkt unten rechts weggelassen, und das hieß jahrelang
`prims.slice(0, -1)` — richtig, solange jedes Zeichen aus dem nozilla-Set kam.
Ein Kunden-Set trägt keine, und ein einstrichiges Zeichen verlor damit seinen
einen Strich: die Bibliothek zeigte leere Kacheln. `withoutSignature()` prüft
jetzt, ob das letzte Primitiv *die Signatur ist*.

**Der PPTX-Weg setzt seine Fußzeile selbst — und hatte die Marke nicht.** Der
*Text* der Fußzeile ist die eine begründete Ausnahme von der Regel „Wer eine
Ausgabe baut, wird Kunde der `Scene`". Als die kleine Wortmarke unten rechts
dazukam, wurde sie nur in `buildSlideChrome()` gerechnet: Fläche, SVG und PDF
trugen sie, die `.pptx` nicht. Kein Test schlug an, weil keiner die Marke im
Paket suchte — gesehen hat es LibreOffice. Maß und Zeichnung stehen jetzt in
`footerMark()`, und beide Wege rufen dieselbe Funktion.

**Der Setzer misst gegen die echte Schrift.** Ein `@font-face` allein lädt
nichts — der Browser holt die Datei erst, wenn ein Zeichen sie braucht, und
`document.fonts.ready` löst vorher auf. Wer dann misst, misst die
Ersatzschrift, und die Wortpositionen bleiben falsch, auch nachdem die
richtigen Glyphen da sind. `src/theme/fonts.ts` fordert deshalb jeden Schnitt
mit `document.fonts.load()` an und zählt danach einen Zähler hoch, an dem die
Fläche hängt — den Messpuffer zu leeren reicht nicht, ohne Zustandsänderung
zeichnet React nicht neu.

---

## Git

Auf dem zugewiesenen Feature-Branch entwickeln, dorthin pushen, danach eine PR
öffnen. Ist die PR schon gemerged, den Branch frisch von `main` aufsetzen statt
auf gemergter Historie weiterzustapeln.
