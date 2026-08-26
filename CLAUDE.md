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
die vier Tonrollen und die fünfundzwanzig semantischen Tokens daraus, und
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
              glyphCover.ts   Welcher Schnitt ein Zeichen wirklich zeichnet
              svg.ts pdf.ts   Szene → Datei
              png.ts          Szene → Bild (über das SVG, mit Umrissen)
              pptx*.ts zip.ts Szene + Modell → PowerPoint
    chart.ts table.ts         Zahlen und Zellen lesen (kein eigener Zeichner)
    presenterChannel.ts       Was die beiden Vortragsfenster einander sagen
  state/      deckStore.ts    Zustand, Aktionen, Verlauf
              workspace.ts    Welche Leisten offen stehen (gehört dem Arbeitsplatz)
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
  gegen das gebaute Verzeichnis. Dreißig Handgriffe, die je einen
  Fehler abbilden, der einmal grün durchgekommen ist. Warum welcher, steht im Kopf von
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

**Ein Sprachtest, der nur Attribute liest, bewacht die Vordertür.** Er las
`label="…"` und reine Textknoten — und war grün, während die *ganze*
Vortragsansicht englisch blieb. Drei Schreibweisen fehlten ihm, und in allen
dreien stand eine der Zeichenketten: in einem Ausdruck
(`{notiz || 'No notes …'}`), als Eigenschaft eines Objekts
(`{ value: 'fit', label: 'Passend' }` — so ist jedes `Segmented` geschrieben),
und als Textknoten *vor* einem Ausdruck (`Notes · {slideTitle(…)}`, denn der
alte Ausdruck endete nur an `<`). Danach fielen noch zwei durch, die das Sieb
sehr wohl sah: „Nothing selected." und „Embed a file" — dort war nicht das
Sieb zu eng, sondern das *Urteil* zu milde.

**Und das Urteil war eine Verbotsliste.** Was nicht auf ihr stand, kam durch —
das ist keine Lücke, das ist die Bauart. Sechs sichtbare Zeichenketten hat sie
zuletzt durchgelassen: „· unsaved" in der Titelzeile (also die meiste Zeit),
„Saving…" bei jedem Speichern, „(embedded image)" bei jedem eingebetteten
Bild, „Dashed" am Verbinder, „— not installed" bei einem fremden
Erscheinungsbild und der ganze Platzhalter des Markdown-Feldes („# Heading /
- A point"). Kein einziges ihrer Wörter stand auf der Liste, und keines wäre je
daraufgekommen, ohne dass jemand den Fehler erst gemacht hätte.

Dazu kommt jetzt eine Regel nach der **Wortform**: `-ed`, `-ing`, `-ness`,
`-able`, `-ible`, `-ously`. Eine Endung ist kein Wort, sondern eine Form, und
sie fängt auch das, was noch niemand geschrieben hat. `-tion` und `-ment`
stehen ausdrücklich nicht dabei — „Position", „Präsentation", „Dokument",
„Element" sind deutsch, und ein Wächter, der die halbe Oberfläche verurteilt,
wird abgeschaltet und bewacht dann gar nichts mehr.

Der Unterschied, auf den es ankommt: **irrt sich diese Regel, wird der Test an
deutschem Text rot** — laut, sofort, mit der Stelle daneben. Irrt sich eine
Verbotsliste, bleibt sie grün und der englische Satz steht im Fenster.

Zwei Dinge hängen daran. Ein *einzelnes* Wort wird jetzt auch gewertet — die
alte Regel „mindestens zwei Wörter" hielt Klassennamen draußen und ließ dabei
„Saving" mit hinaus. Und Klempnerei wird an der *Schreibweise* erkannt statt an
der Wortzahl: durchgehend klein, mit Bindestrichen. Das ist kein Kniff, sondern
deutsche Rechtschreibung — Substantive werden großgeschrieben, eine sichtbare
Beschriftung ohne einen einzigen Großbuchstaben ist so gut wie nie eine. Ohne
diesen Filter verurteilte die neue Regel dreißig Tailwind-Listen auf einmal:
`rounded`, `dashed`, `leading`, `tracking` enden alle so.

**Ein Gegentest, der nicht baut, prüft den vorigen Stand.** Beim Gegenprüfen
wurde eine Zeile in `App.tsx` auskommentiert; damit war ein Import ungenutzt,
`tsc --noEmit` brach ab, `vite build` lief nie, und `dist/` blieb unberührt.
Der Rauchtest meldete fünfzehn von fünfzehn — über den Code *vor* der
Sabotage. `pruefeStand()` in `scripts/smoke.mjs` vergleicht jetzt die
Änderungszeiten und bricht ab, bevor eine solche Zahl entsteht.

**Ein `rect`-Primitiv trägt keine Matrix.** Alles, was ein Element zeichnet,
steht in Element-Koordinaten und wird über `transformSegs(..., matrix)` an
seinen Platz gebracht. Ein `{ t: 'rect', x, y }` kann das nicht — es landet
so, wie es dasteht. Beim ersten Diagramm lagen die Balken deshalb links neben
ihrem Kasten, und die Punkte des zweiten Diagramms mitten im ersten. Flächen
innerhalb eines Elements gehören als geschlossener Pfad emittiert; `rect`
bleibt dem Folien-Beiwerk vorbehalten, das ohnehin in Folien-Koordinaten
rechnet.

**Gleich breite Tabellenspalten sehen aus wie ein Raster.** „Was" bekam so viel
Platz wie „Folie vor / zurück"; die schmale Spalte stand als Loch daneben,
während die breite umbrach. Gewichtet wird jetzt nach der breitesten
*ungebrochenen* Zelle — und der Innenabstand wird dabei **vorweg** abgezogen,
nicht mitgewichtet: sonst verhungert die schmale Spalte und „1.240" bricht zu
„1.24 / 0". Die Rechnung steht in `tableColumnWidths()` und ist öffentlich,
weil der PPTX-Weg dieselbe braucht — zwei Rechnungen für dieselbe Frage liefen
auseinander, und man sähe es erst in der fremden Datei.

**Eine Prüfung an der rechtsbündigen Spalte beweist nichts über Spaltenbreiten.**
Die erste Fassung der Rauchtest-Prüfung maß, wo die Zahlenspalte steht — und
überlebte die Gegenprobe: rechtsbündig steht sie an der rechten Kante der
Tabelle, und die ist bei gleich breiten Spalten dieselbe. Gemessen wird jetzt
die *linksbündige* letzte Spalte, denn die verrät, wo ihre Spalte anfängt.

**Sechs Wege ersetzten das Deck, einer fragte.** „Neues Deck", „Öffnen",
`⌘⇧N`, `⌘O`, eine Datei ins Fenster gezogen, die Übernahme aus dem Prompt — und
nur das Beispiel-Menü stellte die Frage. Die anderen luden durch, leerten
dabei `past` und `future`, und siebenhundert Millisekunden später schrieb die
Selbstsicherung den neuen Stand über die gemerkte Sitzung. Die Frage steht
jetzt in `darfErsetzen()`, und `replaceGuard.test.ts` liest die Quellen wie
`theme.test.ts`: wer einen siebenten Weg baut, wird gefragt, ob er auch fragt.

Der Wächter selbst hat dabei zwei Anläufe gebraucht. Der erste ließ eine
Erwähnung im *Kommentar* gelten — die Sabotage entfernte den Ruf, der Satz
darüber blieb stehen, und das Sieb war zufrieden. Der zweite schnitt die
Kommentare heraus und verschob damit die Zeilennummern, sodass der Rückblick
auf den Ausnahmevermerk ins Leere zeigte. Kommentare werden jetzt *geleert*,
nicht entfernt.

**Der Bildschirm ersetzt eine fehlende Glyphe, die Datei nicht.** Die
Tastentabelle des Willkommens-Decks setzt ihre Kürzel in Backticks, also in
`codeInline`, also in Space Mono — und Space Mono führt `⌘`, `⌫`, `⇧` und `⌥`
nicht. Auf der Fläche sprang der Browser auf eine Systemschrift, und es sah
richtig aus. Im PNG stand „D" statt „⌘D", die Zeile „Löschen" hatte gar keinen
Wert mehr, und im PDF stand „#". Drei Ausgaben falsch, kein Test rot, weil
keiner je hinsah.

Die Antwort steht in `glyphCover.ts` und hat zwei Hälften, die zusammengehören:
der Export sucht ein fehlendes Zeichen in den *anderen* Marken-Schriften, und
der Schriftstapel in `theme.config.ts` nennt dieselben Schriften in derselben
Reihenfolge. Das Zweite ist keine Zugabe: **wo** ein Zeichen steht, misst der
Browser, und er misst die Schrift, die er selbst gewählt hat. Ohne den
gemeinsamen Stapel zeichnete der Export Inters `⌘` an eine Stelle, die für eine
fremde Breite gerechnet war — die Zeichen liefen ineinander. Die Kette wird
deshalb aus `fontFamily` *abgelesen* und nicht daneben noch einmal
aufgeschrieben.

**Und die zweite Hälfte gilt für jedes Erscheinungsbild.** `musterkunde.ts`
belegt `fontFamily` neu und trug die alten Stapel ohne Geschwister — der Fix
griff dort nicht, in genau der Datei, die jeder Kunde abschreibt. Ein Absatz in
`themes/index.ts` allein hätte das nicht verhindert; die Prüfung „gibt jedem
Erscheinungsbild eine Ersatzkette" geht deshalb jedes angemeldete
Erscheinungsbild durch und verlangt für jede Rolle eine zweite Marken-Schrift.

**Der Maßstab hängt am Schnitt, der zeichnet.** Inter zählt 2048 Einheiten aufs
Geviert, Space Mono und Zilla Slab 1000. Wer den Maßstab wie früher einmal je
Lauf nimmt, setzt ein aus Inter geholtes Zeichen gut doppelt so groß — und die
Segmentzahl bleibt dabei dieselbe, keine Zählprüfung sagt ein Wort. Gemessen
wird deshalb der Kasten des Zeichens.

**Eine Schrift im PDF zu finden heißt nicht, dass sie benutzt wird.** jsPDF
schreibt jeden angemeldeten Schnitt in die Datei, ob ein Textstück ihn wählt
oder nicht. Eine Prüfung, die „Inter" in den Rohbytes sucht, bestätigt die
Einbettung und lässt genau den Fehler durch, um den es geht. `pdfjs-dist` gibt
je Textstück den Schnitt zurück, mit dem es gesetzt ist — dort steht `⌘` in
Inter-Regular und `D` in SpaceMono-Regular, und eine Sabotage an der Zuordnung
liefert nur noch `['D']`.

**Ein zweites Fenster mit demselben Store überschreibt die Sitzung des
ersten.** Die Referentenansicht läuft unter `?referent=1` in derselben
Anwendung, und die Abzweigung steht deshalb in `main.tsx` und nicht in `App`:
`App` lädt beim Start das gemerkte Deck und schaltet die Selbstsicherung ein.
Ein zweites Fenster, das dasselbe täte, schriebe seinen Stand über den des
ersten — mitten im Vortrag, und ohne dass etwas davon zu sehen wäre. Das
Vortragsfenster hat deshalb keinen Store: es bekommt sein Deck als Markdown
über den `BroadcastChannel` und liest es für sich.

**Der Setzer misst gegen die echte Schrift.** Ein `@font-face` allein lädt
nichts — der Browser holt die Datei erst, wenn ein Zeichen sie braucht, und
`document.fonts.ready` löst vorher auf. Wer dann misst, misst die
Ersatzschrift, und die Wortpositionen bleiben falsch, auch nachdem die
richtigen Glyphen da sind. `src/theme/fonts.ts` fordert deshalb jeden Schnitt
mit `document.fonts.load()` an und zählt danach einen Zähler hoch, an dem die
Fläche hängt — den Messpuffer zu leeren reicht nicht, ohne Zustandsänderung
zeichnet React nicht neu.

**Ein unlesbarer `nzl`-Block war ein stiller Löschbefehl.** Ein Doppelpunkt zu
viel im YAML — im deutschen Text einer Karte die wahrscheinlichste Stelle —
und `parseSlide` fiel auf die Vorgaben zurück: Layout `default`, keine
Elemente. Der Fließtext blieb stehen, die Folie sah also nicht kaputt aus,
sondern *leer*. Und weil der Block beim Sichern aus dem Modell neu gebaut wird,
stand er danach in keiner Datei mehr: Öffnen und Speichern genügte, um eine
Folie voller Arbeit endgültig zu verlieren.

Der Rohtext bleibt jetzt in `SlideMeta.unreadable` liegen und wird wortgleich
zurückgeschrieben — dieselbe Linie wie bei einem unbekannten `theme:` im
Frontmatter: den Wert behalten, die Lücke zeigen. Daran hängen zwei Dinge, die
leicht zu vergessen sind. Der Inspektor *sagt* es, denn eine Folie ohne
Elemente, ohne einen Hinweis warum, ist der halbe Fehler. Und `mapSlide` lässt
den Rohtext fallen, sobald jemand die Folie ändert — sonst stünde beim nächsten
Öffnen wieder der kaputte Block da und die eben gemachte Änderung nirgends.

Geprüft wird an der **gesicherten Datei**, nicht am Modell: das Modell wusste
schon vorher nichts von dem Block, und trotzdem wäre nichts verloren gewesen,
wenn er beim Schreiben wieder dagestanden hätte. Der Rauchtest legt die Sitzung
deshalb über ein Startskript und nicht kurz vor dem Neuladen — dazwischen liegt
`beforeunload`, und dort schreibt die Selbstsicherung den offenen Stand darüber.

**Jeder getippte Buchstabe war ein Verlaufsschritt samt Tiefklon.** `history()`
legte bei jeder Aktion ein `structuredClone` des ganzen Decks ab — auch bei
jedem einzelnen Anschlag in einem Textfeld. Dreiundvierzig Zeichen waren
dreiundvierzig Schritte: sie schoben alles davor aus den hundertzwanzig heraus,
und ⌘Z nahm danach einen Buchstaben zurück statt der Änderung davor. Dazu
hundertzwanzig Tiefklone eines Decks, das eingebettete Bilder tragen kann.

Beides ist erledigt, und beides hat eine Bedingung.

*Zusammengefasst* wird über einen Schlüssel: gleicher Handgriff auf dasselbe
Ziel innerhalb von 600 ms ist ein Schritt. Der Merker zeigt dabei auf den
Eintrag, den er selbst abgelegt hat — liegt der nicht mehr obenauf, hört die
Zusammenfassung von selbst auf. Ein ⌘Z, ein geladenes Deck, ein `setState` im
Test: alle drei tauschen ihn aus. Eine Liste von Stellen, an denen man einen
Merker zurücksetzen *muss*, wäre eine Liste von Stellen, an denen man es
vergisst.

*Geteilt* wird, statt geklont: der Verlauf hält dieselben Folien- und
Element-Objekte wie die Gegenwart. Das ist nur erlaubt, solange jede Aktion ihr
Ergebnis aus neuen Objekten baut — ein `element.x = …` oder ein `push()` auf
dem Array aus dem Zustand änderte sonst den Verlauf rückwirkend. Deshalb friert
`deckStore.test.ts` das Deck ein und ruft vierundzwanzig Aktionen dagegen; wer
künftig an Ort und Stelle ändert, bekommt einen TypeError statt eines stillen
Fehlers.

Und noch eine Falle steckt in der Prüfung selbst: **⌘Z im Textfeld gehört dem
Browser.** `isTypingTarget` lässt es durch, damit ein ⌘Z im Notizfeld Text
zurücknimmt und keine Folie. Der Rauchtest muss deshalb erst aus dem Feld
heraus, sonst misst er die Rücknahme des Browsers — ein Anschlag — und meldet
einen Fehler, den es nicht gibt.

**Ein eingebettetes Bild legte die Selbstsicherung still — schweigend.** Die
Ablage im Browser fasst etwa fünf Megabyte. Ein Foto aus einem Telefon hat
vier; als data-URI werden daraus 5,3 Millionen Zeichen, und `localStorage`
zählt in UTF-16, also gut zehn Megabyte. Ein einziges eingefügtes Bild reichte
damit, und `setItem` warf. Der `catch` war leer, mit einem Kommentar daneben:
„Quota exceeded or private mode — autosave is best-effort by design." Der Satz
stimmt und ist trotzdem kein Grund zu schweigen: von da an sicherte sich
nichts mehr, und der Benutzer arbeitete weiter in dem Glauben, es geschehe.

Zwei Hälften, und die zweite ist erst am Ergebnis aufgefallen. Die erste ist
das Kappen: eingesetzte Bilder werden auf `canvas.width × SCHAERFE` gebracht —
die Breite, mit der dieses Werkzeug eine ganze Folie rastert. Breiter kann kein
Bild in keiner Ausgabe von hier mehr Einzelheiten zeigen.

Die zweite: **aus der Zwischenablage kommt immer ein PNG**, und PNG rechnet ein
Foto nicht klein. Nach dem Kappen standen im Rauchtest immer noch siebzehn
Millionen Zeichen — der Fehler war gekappt und trotzdem da. Beide Fassungen
werden jetzt geschrieben, und das JPEG bekommt den Zuschlag nur, wenn es unter
der Hälfte bleibt. Ein Bildschirmfoto kommt in diese Nähe nie und behält seine
scharfen Buchstaben; ein Foto unterbietet um ein Vielfaches. Entschieden wird
damit an der Datei und nicht am Dateinamen, und die Prüfung fährt beide
Richtungen: das Foto *muss* zum JPEG werden, das Bildschirmfoto *darf* es
nicht. Eine Regel, deren Gegenrichtung niemand prüft, ist eine halbe Regel.

Und wo es trotzdem nicht reicht, steht es jetzt quer über dem Fenster. Eine
Warnung in der Leiste wäre zu leise für den Satz „von hier an sichert sich
nichts mehr".

**Und die Regel hing zuerst am falschen Auslöser.** Angefasst wurde nur, was zu
*breit* war — ein Vollbild-Bildschirmfoto mit 2560 × 1440 liegt aber genau auf
der Kappungsgrenze und wurde durchgereicht. Es blieb als PNG bei 1,6 Millionen
Zeichen, wo dasselbe Bild als JPEG 219.000 braucht; zwei davon, und die Ablage
war wieder tot. Ein Bild kann auf zwei Weisen zu groß sein, und die beiden
haben nichts miteinander zu tun: **zu breit** und **zu lang**. `neuschrift()`
fragt jetzt beides.

Gefunden hat es kein Test, sondern ein Maßband: die Zahlen einmal im Browser
ausgerechnet, statt sich auf „das haben wir ja gekappt" zu verlassen. Die
Prüfung dazu setzt ein Bild ein, das *genau* auf der Kante liegt — der Fall,
den die erste Fassung als erledigt ansah.

**Ein gescheiterter Export sagte nichts.** `console.error` und der Spinner ging
aus: wer auf „PDF" klickte und dessen Export scheiterte, sah einen Moment lang
etwas laufen und danach nichts — kein Unterschied zu einem Export, den man
versehentlich abgebrochen hat. Und genau der Unterschied ist der, auf den es
ankommt. Der `⌘S`-Weg war noch eine Stufe schlimmer: gar keine
Fehlerbehandlung, ein Scheitern endete als unbehandelte Zusage.

Der Hinweis steht deshalb im Store und nicht in der Leiste. Drei Stellen setzen
ihn — das Export-Menü, `sichereDeck()` und `oeffneDeck()` —, und läge er in der
Leiste, hätten die anderen beiden keinen Weg dorthin. Genau deshalb schrieben
sie vorher auf die Konsole.

Drei Regeln, die daran hängen. Ein **geschlossener Dateidialog** bleibt stumm:
das ist keine Panne, sondern die Antwort „doch nicht", und eine Klage darüber
wäre schlimmer als keine. Der **technische Satz bleibt stehen** — wer einen
Fehler meldet, braucht ihn, und wer ihn nicht braucht, überliest ihn. Und der
Hinweis **verschwindet nicht von selbst**: einer, der sich nach drei Sekunden
wegnimmt, ist für den gemacht, der gerade hinsieht — und wer gerade hinsieht,
hat den Fehler ohnehin bemerkt.

Der Rauchtest bringt den Export dafür wirklich zum Scheitern, und zwar an der
Stelle, an der jede Ausgabe vorbeikommt: dem Aushändigen der Datei. Damit
schreibt der Weg zu Recht auch auf die Konsole — und die Prüfung „nichts hat
sich in der Konsole beschwert" zählte das als Beschwerde. Herausgenommen wird
deshalb genau der Satz, den die Prüfung selbst geworfen hat, und kein anderer.

Und die Gegenprobe dazu ist selbst in die alte Falle getappt: die erste
Sabotage entfernte den Ruf, ließ damit einen Import ungenutzt, `tsc` brach ab —
und `npm run test:ui` lief wegen des `&&` gar nicht erst. Diesmal fiel es auf,
weil gar keine Zahl kam. Eine Sabotage muss **bauen**, sonst prüft sie den
vorigen Stand.

**Ein fehlendes Bild fehlte auch in jeder Meldung.** `resolveOne()` fing jeden
Ladefehler und gab `null` zurück, im PDF fing `drawImage` noch einmal — mit dem
Kommentar „A broken image should never abort the whole export". Der Satz ist
richtig: ein toter Pfad darf ein Deck von dreißig Folien nicht ungedruckt
lassen. Nur erfuhr es niemand; das PDF kam ohne das Logo heraus, und wer nicht
selbst nachsah, merkte es beim Vortrag. **Die Politik stimmte, das Schweigen
nicht** — dasselbe Muster wie beim leeren `catch` der Selbstsicherung.

Gemeldet wird über einen **Melder** und nicht über einen Import aus dem Store:
`lib/` kennt `state/` nicht, und das soll so bleiben — der Ausgabeweg ist eine
Rechnung, keine Oberfläche. Die eine Naht steht im Sitzungsstart von `App.tsx`.

Und der Melder sitzt an der **einen** Stelle, an der Bilder geladen werden.
Ein sechster Ausgabeweg bekommt ihn damit umsonst; die Alternative wäre, ihn
durch jeden Weg einzeln durchzureichen, und wie das ausgeht, steht ein paar
Absätze weiter oben unter „Sechs Wege ersetzten das Deck, einer fragte".

---

## Git

Auf dem zugewiesenen Feature-Branch entwickeln, dorthin pushen, danach eine PR
öffnen. Ist die PR schon gemerged, den Branch frisch von `main` aufsetzen statt
auf gemergter Historie weiterzustapeln.
