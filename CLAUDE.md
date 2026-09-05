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
*Erscheinung* (Zahnrad in der Hauptleiste, rechts) schaltet die Leisten auf
dunkel um. Sie
gehört dem Arbeitsplatz und nicht dem Deck, bleibt deshalb im Browser und steht
in keiner Datei. **Die Folie ändert sich dabei nie** — `surface.test.ts` prüft
das am erzeugten Markup und nicht an der Zusicherung.

`src/theme/theme.test.ts` liest die Komponenten-Quellen und schlägt an, wenn
eine Bedienfläche einen Marken-Ton benutzt. Der Test existiert, weil dieser
Fehler schon zweimal gemacht wurde.

### 3 · Die Marke ist wechselbar, das Werkzeug nicht

Die linke Spalte der Tabelle gehört einem **Erscheinungsbild**, und davon kann
es mehrere geben: nozilla plus je eines pro Marke. Angemeldet wird in
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
Rolle einmal und ist der schnellste Weg zu einer echten Marke. Farben werden
dabei *einmal* genannt — `tonesFromPalette()` und `colorsFromPalette()` mischen
die vier Tonrollen und die fünfundzwanzig semantischen Tokens daraus, und
`brandTheme.test.ts` hält beide an `theme.config.ts`.

Die rechte Spalte wechselt nie mit. Auch die Icons haben deshalb zwei Wege:
`Icon` zeichnet aus dem Werkzeug-Set (`ToolIconName`, eng typisiert),
`BrandIcon` aus dem des Erscheinungsbilds. Ein fremdes Set, dem `chevron-right`
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
              folienformat.ts Auf welchem Blatt dieses Deck liegt (ebenso)
              surface.ts      Hell oder dunkel — die Erscheinung des Werkzeugs
              index.ts        Die Fassade: Inhalt aus der Laufzeit, Werkzeug aus
                              der Konfiguration
  themes/     index.ts        Hier kommen die eigenen Erscheinungsbilder an
              musterkunde.ts  Die Vorlage: jede wechselbare Rolle einmal belegt
  ci/         main.tsx        Der CI-Generator — zweite Seite, eigener Einstieg
              entwurf.ts      Wonach gefragt wird; alles andere wird gerechnet
              texte.ts        Wofür jede Rolle da ist — Formular *und* Prompt
              schritte.tsx    Die acht Schritte und ihre Felder
              prompt.ts       Das Lastenheft für ein Sprachmodell
              ruecklauf.ts    Dessen Antwort zurücklesen — und jede Korrektur nennen
              sitzung.ts      Der Entwurf über ein ⌘R hinweg (eigener Schlüssel)
              farbwert.ts     rgb(), Kurzform, fehlende Raute → #RRGGBB
              pruefung.ts     Jede Regel, die eine Designdatei bestehen muss
              emitter.ts      Entwurf → src/themes/<id>.ts
              Vorschau.tsx    Eine echte Folie, über die echte Zeichenstrecke
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
  gegen das gebaute Verzeichnis. Neunundvierzig Handgriffe, die je einen
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
Ein fremdes Set trägt keine, und ein einstrichiges Zeichen verlor damit seinen
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
griff dort nicht, in genau der Datei, die jede neue Marke abschreibt. Ein Absatz in
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

**`Tab` abzufangen hätte die Fläche geöffnet und die Leiste zugesperrt.** Es
gab keinen Weg, *ein* Element auszuwählen, ohne darauf zu klicken. Der
naheliegende Griff wäre gewesen, `Tab` in `useKeyboardShortcuts` abzufangen und
die Auswahl weiterzuschieben — und damit die Taste zu belegen, mit der man
überhaupt weiterkommt. Wer sie abfängt, sperrt den Benutzer in dem Bereich ein,
den er gerade erreicht hat.

Erreichbar sind die Elemente jetzt über die Tab-Reihenfolge des Browsers:
`tabindex`, `role="button"` und ein `aria-label` an jedem `<g>`. Die
Reihenfolge ist die Malreihenfolge, weil die Knoten so im Baum stehen, und am
Ende der Folie geht es weiter zur nächsten Leiste. Ausdrücklich **nur auf der
Arbeitsfläche** (`focusable`): dieselbe Ansicht zeichnet die Kacheln des
Filmstreifens, die Übersicht und den Vortrag, und dort wären sechs Folien mit
je zehn Elementen sechzig Tabs bis zum nächsten Knopf.

**Eine Seite, die keine Folie ist.** Das Handout ist so breit wie die Folie und
mal Wurzel zwei hoch; die Folie sitzt oben links und behält damit jede
Koordinate, die sie ohnehin hat. Das ist der ganze Kniff, und er erspart die
Rechnung, die es sonst bräuchte: einen Weg, eine ganze Szene zu skalieren —
durch jeden Primitivtyp hindurch, samt der vorgemessenen Breiten in den
Textläufen. Zwei Wege, eine Folie zu zeichnen, sind genau das, was die erste
Regel dieses Projekts verbietet.

Daran hing eine Stelle, die vorher niemandem wehtat: `scenesToPdf` nahm das
Seitenmaß aus `canvas.width/height` der CI statt aus der Szene. Beide waren
dasselbe, solange jede Seite eine Folie war. Mit dem Handout ist es das nicht
mehr — die Seiten wären quer geblieben und die Notizen außerhalb.

**„Das letzte SVG der Seite" ist nicht die Folie.** Zwei Rauchtest-Prüfungen
mussten aus einem Textfeld heraus und klickten dafür auf 92 % der Breite des
letzten `<svg>`. Das ist ein Zeichen im Filmstreifen, und 92 % seiner Breite
liegen auf „Folie danach einfügen". Die Prüfung legte damit eine Folie an,
stand auf einer leeren und suchte dort einen Text, den sie auf der vorigen
geschrieben hatte. Geklickt wird jetzt auf `.nz-stage`, und zwar über einen
Helfer, damit es nicht zweimal danebengehen kann.

**Ein Knopf, der eine Zahl nennt und eine andere tut.** Die Trefferliste zeigt
**eine** Zeile je Feld — als Wegweiser richtig, drei Zeilen für dieselbe Karte
wären dreimal derselbe Weg. Der Knopf „Alle ersetzen" nahm die Länge dieser
Liste und versprach damit zu wenig: „Zwiebelsuppe und Zwiebelbrot" steht in
einem Feld, die Liste meldete einen Treffer, ersetzt wurden zwei. Gezählt wird
jetzt mit `zaehleFunde()`, also mit dem, was tatsächlich geschieht.

**Ein Feld, dessen Inhalt verworfen wird, ist schlimmer als kein Feld.** Der
Alternativtext eines Bildes stand seit je im Inspektor. Er ging ins PPTX — und
dort in `name`, den Namen in der Auswahlliste, den keine Hilfstechnik vorliest.
Ins SVG ging er gar nicht, ins PDF auch nicht, und der Alternativtext eines
Markdown-Bildes (`![so hier](bild.png)`) kam bis in die Szene und fiel dort
heraus. Wer das Feld ausfüllte, hatte den Eindruck, etwas getan zu haben.

Er steht jetzt in der `ScenePrim` und damit dort, wo jede Ausgabe ihn findet:
im SVG als `<title>`, in der PPTX zusätzlich als `descr`. Auf dem Bildschirm
zeigt der Browser den `<title>` als Kurzhinweis — dasselbe Markup, dieselbe
Stelle. Für das PDF gibt es keinen Weg: jsPDF kennt keine Alternativtexte.

Und beide Richtungen gehören geprüft: ein *leeres* `descr` oder ein leerer
`<title>` behaupten, das Bild sei beschrieben, und wären schlechter als
nichts.

Und eine Warnung an den Nächsten, der hier aufräumen will: **`role="img"` am
`<svg>` blockiert nichts.** Die erste Fassung dieses Kommentars behauptete, es
halte `Tab` aus dem Baum heraus, und die Sabotage widerlegte das — der
Rauchtest blieb grün, als das `img` zurückkam. Nachgemessen wurde danach
beides, Tab-Reihenfolge und Barrierebaum über CDP: kein Unterschied. Die Rolle
steht trotzdem auf `group`, weil ein Bild mit Knöpfen darin dem ARIA-Modell
widerspricht — aber sie ist nicht der Grund, warum es geht. Der Grund ist der
`tabindex`, und daran hängt auch die Prüfung.

**Ein Wert des Dateiformats, der nicht mehr sagt, was er malt.** Seit dem
27. August 2026 malt der Untergrund `paper` das **Weiß**, und der warme
Papierton hat mit `cream` einen eigenen Wert. Der alte Name blieb, weil er in
jeder bestehenden `.md` steht — ihn umzubenennen hieße, jedes Deck unlesbar zu
machen. Damit ist er aber eine Lüge geworden: wer `backgroundStyle` liest und
`case 'paper'` sieht, weiß nicht mehr, welche Farbe herauskommt. Geprüft wird
deshalb am **fertigen SVG** und nicht am Funktionsnamen.

Und die eigentliche Falle saß nicht im Code, sondern im **Wort**. Der Inspektor
führt Untergründe und Flächenrollen untereinander, und „Papier" *benennt in
dieser CI den Cremeton* — `palette.paper` ist #FFFEE5, die Flächenrolle
„Papier" malt genau ihn. Ein weißer Untergrund namens „Papier" hätte der
Beschriftung zwei Zeilen tiefer widersprochen, und beide Listen hätten für sich
stimmig ausgesehen. Er heißt deshalb „Weiß" — das ist die eine Stelle, an der
Wert und Beschriftung auseinandergehen. Die Prüfung dazu ist eine **Regel und
kein Einzelfall**: wer eine Farbe benennt, muss sie auch malen.

Zwei Stellen hingen daran, und beide hätten geschwiegen. Die Kacheln der
Bausteinbibliothek malten ihren Untergrund aus `ci.surface` statt aus
`backgroundStyle('paper')` — sie wären cremefarben geblieben und hätten etwas
anderes versprochen als die Folie hält, obwohl `buildElementPrims` ohne zweites
Argument längst für genau diesen Untergrund zeichnet. Und der Hinweis der
Flächenrolle „Weiß" lautete „hebt sich vom cremefarbenen Papier ab" — richtig,
solange das Papier creme war.

**Ein Test, der seinen eigenen Kommentar nicht prüft.** Über der Zusicherung
stand: „Und zwar für jede Palette, nicht nur für die eigene: eine Marke mit
weißem Papier bekäme sonst zwei Töne, die dasselbe tun." Darunter stand
`expect(gemischt.white.surface).toBe(musterkunde.palette.white)` — und das gilt
immer, weil `tonesFromPalette` genau das tut. Der Musterkunde führte derweil
für `paper` und `white` beide `#FFFFFF`; der Satz beschrieb also exakt den
Fehler, der eine Datei weiter stand, und der Test war grün. Seit es den
Untergrund `cream` gibt, kostete das vier Menüeinträge: zwei Untergründe und
zwei Flächenrollen malten dieselbe Farbe. Nichts war kaputt, nichts sagte
etwas — die Wahl tat nur nichts.

Die Vorlage führt jetzt ein warmes Papier neben dem reinen Weiß, und die
Prüfung geht **jedes angemeldete Erscheinungsbild** durch. Eine Marke, deren CI
wirklich nur einen hellen Ton hat, wird dort rot und muss sich entscheiden —
das ist der Sinn.

Daran hing eine zweite Stelle, und die fand erst die Gegenprobe: `paperAlpha`
gehört zum *Papier* und nicht zum Weiß. Es malt den gedämpften Text auf einer
Folie in Tinte; blieb es beim alten `rgba(255, 255, 255, …)`, während das
Papier warm wurde, hätte jeder Nebensatz eine andere Wärme als der Satz darüber
— auf jeder dunklen Folie. `tonesOutsidePalette()` fängt das nicht: es fragt
nur, ob ein Ton *aus* den eigenen Werten stammt, und die falsche Stufe stammt
es. Die Stufen werden deshalb kanalweise gegen `palette.ink` und
`palette.paper` gehalten.

**Ein CI-Generator, der nach Ableitbarem fragt, baut die Fehlerklasse ein.**
Ein Erscheinungsbild belegt weit über hundert Werte, und danach zu fragen wäre
nicht Gründlichkeit, sondern genau der Fehler, den `colorsFromPalette()` und
`tonesFromPalette()` verhindern: neunundzwanzig semantische Tokens und
zweiunddreißig Tonwerte kommen aus der Palette, und wer sie erfragt, trifft
achtundzwanzig und vergisst einen. Der Generator fragt deshalb nach sechzehn
Farben und rechnet den Rest — die Deckkraftstufen eingeschlossen, deren
Schlüssel doppelt lügen (Stufe `70` ist 0,72 bei der Tinte und 0,64 beim
Papier, und `paperAlpha` gehört zum *Papier*, nicht zum Weiß).

Und die Feldliste wird **gelesen und nicht geschrieben**: `Object.keys(
nozillaTheme.palette)` statt einer getippten Liste. Eine getippte wäre eine
zweite Wahrheit über die CI — käme morgen eine Rolle dazu, hätte das Formular
sie nicht, und man sähe es erst am Compiler des Nächsten.

**Der teuerste Rang der Prüfliste ist der mittlere.** „Fehler" heißt: übersetzt
nicht. „Zu wissen" heißt: lies das. Dazwischen steht **„Läuft, ist aber
falsch"** — vier Menüeinträge, die dieselbe Farbe malen; eine Schrift, die im
Export still durch Helvetica ersetzt wird; schwarze Schrift auf dunklem Signal.
Ein Generator, der nur zwischen „geht" und „geht nicht" unterscheidet, führt
genau dorthin, wo dieses Projekt schon dreimal war.

Der wichtigste dieser Fälle ist nicht zu reparieren, außer über die Palette:
`elementTones.signal.text` ist fest `palette.ink`, `color.inkOnSignal` auch.
Eine Marke mit dunkler Signalfarbe bekommt schwarz auf dunkel — auf jeder
Signalfolie, in jedem Abzeichen. Die Rechnung dafür stand testlokal in
`surface.test.ts` und galt nur den Leisten; sie steht jetzt in `lib/contrast.ts`
und wird von beiden gerufen.

**Zwei Wächter irrten sich an einem Zeichen und an einem Anführungszeichen.**
Beide wurden beim Bau des Generators rot, und beide zu Recht laut — nur eben
über das Falsche.

`theme.test.ts` las `\b(palette|elementTones)\b` über die ganze Quelle. Das
Werkzeug-Set führt ein Zeichen namens „palette", und `<Icon name="palette" />`
in einer Datei, die ohnehin aus `@/theme` importiert, sah damit aus wie ein
Griff in die Marken-Palette. Ein Marken-Token wird immer als *Bezeichner*
benutzt und nie als Zeichenkette; die Benutzung wird jetzt an der Quelle *ohne
Zeichenketten* geprüft, der Import an der rohen.

`language.test.ts` suchte Beschriftungen mit `/'([^']{4,120})'/` und paarte die
Anführungszeichen damit falsch: in `{ family: '', weight: 400, style: 'normal' }`
nahm es das *schließende* Zeichen der leeren Zeichenkette als öffnendes und
meldete „, weight: 400, style: " als englische Beschriftung. Literale werden
jetzt von links nach rechts ganz verbraucht.

**Und `theme.test.ts` las nur `src/components`.** Eine zweite Bedienfläche unter
`src/ci/` entkam ihm ganz. Nachgezogen ist die Regel, auf die es ankommt: keine
Marken-Utility in einer Bedienfläche — ein Formular, dessen Knöpfe die Farben
tragen, die es gerade einstellt, wird beim ersten dunklen fremden CI unbedienbar.
Die zweite Prüfung gilt dort ausdrücklich *nicht*: der Generator hantiert von
Berufs wegen mit Paletten.

**Zwei Prüfungen sahen eine erzeugte Designdatei gar nicht an.**
`brandTheme.test.ts` schleifte über `[nozillaTheme, musterkunde]` und
`themes.test.ts:41` verlangte `toEqual(['nozilla', 'musterkunde'])`. Damit wäre
der Generator ein Weg gewesen, ungeprüfte Erscheinungsbilder ins Repo zu legen,
während die Prüfliste im Browser den Eindruck erweckt, es sei geprüft — und die
feste Liste wäre bei *jeder* neuen Marke rot geworden. Das ist das falsche Rot:
es sagt „du hast einen Fehler gemacht", wo jemand das Richtige getan hat.
Geschleift wird jetzt über `availableThemes()`, und geprüft wird, was der Satz
behauptet: nozilla steht vorn, musterkunde ist dabei, kein Schlüssel doppelt.

**Ein zweiter Vite-Einstieg ersetzt die Vorgabe.** `rollupOptions.input` mit nur
`ci` darin nimmt `index.html` aus `dist/` — `npm run build` läuft durch, `vite
preview` liefert eine Verzeichnisliste, und der Rauchtest bricht erst beim
Starten der Vorschau ab. Drei Stellen hängen daran, und keine meldet sich von
selbst: `tailwind.config.ts` listet jede HTML-Datei einzeln (fehlt eine,
verpuffen ihre Klassen lautlos), `public/.htaccess` nimmt jede vom
Zwischenspeicher aus (sonst nennt sie nach der nächsten Bereitstellung die alten
Bündelnamen), und `pruefeStand()` im Rauchtest verglich nur `src/` und
`theme.config.ts` gegen `dist/` — eine HTML-Datei im Wurzelverzeichnis liegt in
keinem von beiden.

**Ein React-Schlüssel aus dem Feldinhalt macht ein Feld unbedienbar.** Die
Zeilen der Schnittliste im CI-Generator trugen `key={`${family}-${weight}-${style}`}`
— einen Schlüssel aus genau den Werten, die in derselben Zeile bearbeitet
werden. Jeder Anschlag änderte ihn, React hängte die Zeile samt Eingabe aus dem
Baum und setzte eine neue ein: das Zeichen stand im Wert, der Fokus auf
`<body>`. Getippt „ Kunde", im Feld steht „Zilla Slab " — ein Zeichen von
sechs. Das Nachbarfeld „Datei" steht nicht im Schlüssel und nimmt alles an.

Kein Test sah es, und zwar aus einem lehrreichen Grund: der Rauchtest benutzte
`fill()`, und das setzt den ganzen Wert in **einem** Ereignis. Geprüft wird
jetzt mit echten Tastendrücken — wer eine Eingabe prüfen will, muss tippen.

**Ein Kontrastverhältnis taugt nicht für die Frage „sind das zwei Farben".** Der
Generator maß Unterscheidbarkeit mit WCAG und verurteilte damit im leeren
Formular die **eigene CI**: nozillas `paper` #FFFEE5 gegen `white` #FFFFFF
kommt auf 1,0214. Die beiden sind sichtbar zwei — WCAG wichtet Blau mit 0,0722,
und genau dort liegt der Unterschied (Δ 0, 1, 26). Gemessen wird jetzt der
größte Kanalunterschied, und die Schwelle ist kalibriert: der kleinste gewollte
Abstand in den beiden mitgelieferten CIs ist 13, der ungewollte 0.

Das Schlimme daran war nicht die falsche Zeile, sondern *welche*: es war
ausgerechnet der Satz, der für einen echten historischen Fehler gebaut wurde.
Wer ihn beim ersten Öffnen als Rauschen abtut, tut es bei der fremden Marke wieder. Ein
Wächter, der auf der eigenen CI anschlägt, bringt sich selbst um. Die Prüfung
dazu geht deshalb **jedes mitgelieferte Erscheinungsbild** durch — und hält den
Stand des Verzeichnisses *vor* dem ersten Test fest, denn die Vorschau meldet
ihre Entwürfe wirklich an und `registerTheme()` nimmt nichts wieder heraus.

**`NaN` ist ein gültiger Bezeichner.** Ein leeres Zahlenfeld gibt
`Number.parseFloat('')` weiter, und die erzeugte Designdatei trug danach
`xl3: NaN` und `stil.tracking - NaN`. Sie übersetzte, bestand Prettier und
ESLint und setzte von da an in jeder Ausgabe leise falsch. Die Prüfung sah es
nicht, weil sie zwei Felder gar nicht durchging: die Laufweite darf null und
negativ sein, der Schattenversatz `none` muss null sein — beide fielen durch
die Bedingung `wert <= 0` und wurden übersprungen. **Endlich müssen sie
trotzdem sein**, und das sind zwei Fragen und nicht eine.

**Ein Schlüssel des Dateiformats ist nicht automatisch ein Bezeichner.**
`kunde-2024` ist ein guter Wert für ein Frontmatter und ergab
`export const kunde-2024: BrandTheme = {` — ein Syntaxfehler bei grüner
Prüfliste. Die Rechnung `-x → X` greift nur vor einem Buchstaben, und sie stand
viermal im Emitter, dreimal davon in einem Kommentar, den jemand kopiert. Sie
steht jetzt einmal da, die Prüfliste ruft **dieselbe**, und die Liste der schon
vergebenen Wörter liegt neben dem Emitter, der sie schreibt.

**Wer ein Erscheinungsbild aktiviert, nimmt seine Schriften wieder mit.** Die
Vorschau des Generators schaltet auf den Entwurf um und im `finally` zurück; an
jedem Wechsel hängt der Abonnent aus `main.tsx`, der `installWebfonts()` ruft
und dabei seine Regeln abräumt. Die Schnitte des Entwurfs standen deshalb genau
so lange im Dokument, wie die Szene *gerechnet* wurde, und waren weg, bevor der
Browser malte — die einzige Seite, deren Zweck es ist, eine fremde Schrift zu
beurteilen, hat sie nie gezeigt. Sie stehen jetzt unter eigener Kennung
daneben, und die Vorschau hängt an `useFontsVersion()`: ohne das bliebe die
erste, gegen die Ersatzschrift gerechnete Fassung stehen, samt ihrer
Wortpositionen und ihrer Überlaufwarnung.

**Eine zweite Seite, die zurück auf `index.html` verlinkt, ist eine zweite
Kopie des Werkzeugs.** Der Generator wird mit `target="_blank"` geöffnet, damit
die offene Arbeit stehen bleibt — ein Rücklink machte aus dem Tab dann eine
zweite Instanz mit eigenem Store, geladener Sitzung und laufender
Selbstsicherung, und die schriebe ihren älteren Stand über die Arbeit der
ersten. Wörtlich die Falle, derentwegen die Seite überhaupt ohne Store gebaut
ist. Der Weg zurück schließt deshalb den Tab und navigiert nur ersatzweise.

**Ein abgebrochener Befehl kann seine Sabotage überleben.** Die erste
Gegenprobe an den Beschriftungen hatte ein unbalanciertes Anführungszeichen und
brach mit einem Parse-Fehler ab — nur eben *nachdem* die Sicherung gezogen und
die Sabotage geschrieben war. Der nächste Anlauf sicherte damit die sabotierte
Fassung und stellte sie hinterher brav wieder her. Gefunden hat es der Test,
nicht der Blick auf die Datei. Wer eine Sabotage zurücknimmt, prüft danach die
Datei und nicht das Kommando.

**Elftausendfünfhundert Umläufe in sechs Sekunden — und nichts zu sehen.** Die
Vorschau des CI-Generators meldet ihren Entwurf an, zeichnet damit und stellt
zurück. An jedem dieser Wechsel hängt der Abonnent aus `main.tsx`, der
`installWebfonts()` ruft; das fordert die Schnitte an und zählt danach den
Zähler hoch, an dem die Fläche hängt — also zeichnet sie neu, also stellt sie
wieder um. `document.fonts.load()` auf eine bereits geladene Schrift löst in
einer Mikroaufgabe auf, das Karussell dreht sich damit so schnell, wie die
Ereignisschleife es zulässt. Gemessen: 11.505 Läufe in sechs Sekunden, ein
ausgelasteter Kern, solange die Seite offen steht.

Aufgefallen ist es an etwas anderem: Playwright klickte einen Knopf nicht mehr,
der sichtbar, aktiviert und stabil war. Kein Fehler, keine Meldung, nur ein
Zeitablauf — und drei Prüfungen, die vorher grün waren.

Zerschnitten ist die Schleife an beiden Nähten, und beide sind für sich richtig.
`installWebfonts()` **tut nichts, wenn die Regeln dieselben sind** — wer die
Dateien erneut anfordert, obwohl sich nichts geändert hat, löst ein
Neuzeichnen ohne Anlass aus. Und die Vorschau stellt über `withTheme()` um statt
über `setActiveTheme()`: das eine heißt „hier wird gerechnet", das andere
„jemand hat gewählt", und nur das Zweite geht die Oberfläche etwas an.

**Ein Rang, der beide Fragen zugleich beantwortet, beantwortet keine.** Der
Generator kannte lange nur „trägt der Entwurf einen Fehler" — und daran hing
sowohl, ob eine Datei entstehen darf, als auch, ob eine Folie gezeichnet wird.
Solange alles auf einer Seite stand, fiel das nicht auf. Im Wizard schon: auf
Schritt 2 ist noch kein Schlüssel eingetragen, also stand dort, wo die Farben zu
beurteilen sind, eine leere Fläche.

Es sind zwei Fragen. Ein fehlender Schlüssel hält die *Datei* auf und hat mit
dem Bild nichts zu tun; ein unlesbares Hex macht jedes Bild zur Erfindung.
`zeichenbar()` fragt deshalb an den Feldern, die das Bild machen — Farbe, Maße,
und die Wortmarke nur, wenn eine da ist.

Dieselbe Trennung noch einmal, eine Stufe später: die Wortmarke ist Pflicht, und
sie steht im Wizard spät, weil man für sie eine Datei suchen muss. Ohne
Platzhalter wären fünf von acht Schritten ohne Bild. `vorschauTheme()` setzt
deshalb einen ein — und `themeAusEntwurf()` wirft weiter, der Fehler bleibt in
der Prüfliste, der Knopf bleibt gesperrt, und daneben steht, dass es einer ist.
Ein Bild, keine Zusage.

**Ein Abbruch bei der ersten kaputten Farbe brachte fünf andere Befunde zum
Schweigen.** `pruefeFarbe()` sammelte die unlesbaren Hexwerte und stieg dann aus
(„ohne vollständige Palette sagen die Rechnungen darunter nichts"). Der Satz
klingt vorsichtig und ist falsch: eine Raute zu wenig in *einem* von sechzehn
Feldern, und weder der Kontrast von Tinte auf Signal noch die Frage, ob `paper`
und `white` zwei sind, wurde noch gestellt. Die Liste sah dabei kürzer aus und
wurde kürzer genannt. Übersprungen wird jetzt nur, was die kaputte Rolle
wirklich betrifft.

**Ein Schritt, der ausgehängt wird, nimmt seinen Zustand mit.** Der Bericht über
die Modellantwort und der eingefügte Antworttext lagen im ersten Schritt —
`useState` in einer Komponente, die nur gezeichnet wird, solange dieser Schritt
offen ist. Damit vernichtete ausgerechnet der Handgriff, den der Bericht
empfiehlt („sieh in Schritt 3 nach"), die Liste, die ihn empfiehlt. Beides
wohnt jetzt neben dem Entwurf.

**Die Reihenfolge der Reparaturstufen ist die halbe Reparatur.** Der Rücklauf
eines Sprachmodells wird stufenweise lesbar gemacht — Codezaun ab, Vorspann
weg, Kommentare raus, Komma weg, Anführungszeichen begradigt, Nachsatz weg. Der
Klammerzähler, der den Nachsatz abschneidet, kennt Zeichenketten, aber **keine
Kommentare**: lief er vor dem Kommentarleser, hielt ihn das `}` in
`// auch #FFF }` für das Ende des Objekts, alles danach war weg, und die Meldung
lautete „Daraus wird kein JSON-Objekt" — eine andere Ursache als die wahre.

Und die Prüfung dazu brauchte **zwei** Fälle, weil beide naheliegenden
Abkürzungen je eine Hälfte verfehlen: wer beim ersten `}` aufhört, wird von
einer Klammer *im Wert* abgeschnitten; wer bis zum letzten `}` im Text geht,
nimmt eine aus dem Satz dahinter mit. Die erste Fassung prüfte nur den ersten
Fall und überlebte die Sabotage am zweiten.

**„16pt" wurde 16 — mit einem Beleg daneben, dass es bedacht sei.** Der Leser
nahm `px`, `pt`, `em` und `rem` und schrieb dazu „die Einheit fiel weg, hier
zählen Folien-Einheiten". Bei `px` stimmt das. Eine Folien-Einheit ist aber ¾
Punkt: aus `16pt` wurde eine Schrift, die um ein Drittel zu klein ist. Der
begründende Satz machte es schlimmer, nicht besser — er ist genau das, was einen
davon abhält, noch einmal hinzusehen.

Umgerechnet wird trotzdem nicht: `16pt` kann ebenso ein hingeschriebenes „pt"
für Pixel sein. Genannt werden beide Hälften — die Rechnung und dass sie nicht
angewandt wurde.

**Eine Grundlage, die der Probeantwort gleicht, prüft nichts.** Im Prüfstand des
Rücklaufs war die Grundlage `leererEntwurf()`, also die nozilla-CI, und die
Probeantwort baute sich aus denselben `nozillaTheme`-Werten.
`expect(palette).toEqual(nozillaTheme.palette)` galt damit auch, wenn der Leser
gar nichts übernahm — das `Object.assign` für die Palette ließ sich ersatzlos
entfernen, ohne dass eine Zeile rot wurde. Für vier weitere Gruppen gab es gar
keine Prüfung, die „gelesen" von „Grundlage behalten" trennt. Die Grundlage
trägt jetzt durchweg Werte, die in keiner Antwort vorkommen.

**Eine Prüfung, die die ganze Seite durchsucht, findet ihre eigene
Ankündigung.** Der Rauchtest las `document.body.innerText` und suchte darin
„Codezaun" und „Kommentare" — beides steht aber schon in der Erklärung *über*
dem Eingabefeld, weil sie ankündigt, was der Bericht sagen wird. Die Gegenprobe,
die den Bericht verstummen ließ, blieb deshalb grün. Gelesen wird jetzt der
Bereich, um den es geht.

**„Marke" steckt in „Wortmarke".** Die Schritte des Wizards sind Knöpfe, und ihr
Aufdruck trägt die Nummer und die Zahl der offenen Befunde: „2 Marke 3". Als
Suchbegriff ist das mehrdeutig, als Ansage unbrauchbar. Der ausgesprochene Name
wird deshalb gesetzt — „Schritt 2: Marke, 3 mal ‚Fehler'" — und die Abzeichen
sind dafür stumm.

**„Kunde" hieß zweierlei, und nur eines davon war gemeint.** Das Wort stand an
neunzig Stellen: als *Auftraggeber* („ein Kundendeck", „Kunden-Set",
„Kundendatei") und als *Verbraucher* („wer eine neue Ausgabe baut, wird Kunde
der `Scene`"). Ersetzt ist nur das Erste — durch „Marke", „fremdes Deck",
„Designdatei", „eigenes Erscheinungsbild". Das Zweite ist die tragende Metapher
der ersten Regel dieses Projekts und bleibt.

Nicht angefasst wird außerdem der **Schlüssel** `musterkunde`: er steht im
Frontmatter jedes Beispiel-Decks und in vier Dateinamen. Die *Beschriftung* in
der Auswahlliste heißt jetzt „Muster" — dieselbe Linie wie beim Untergrund
`paper`, der das Weiß malt: Wert und Beschriftung dürfen auseinandergehen.

**Eine Quittung ist kein Vorschlag.** Der Rücklauf des Sprachmodells wurde
gelesen *und übernommen*, in einem Handgriff, unter einem Knopf namens
„Übernehmen und prüfen" — geprüft wurde also nach dem Übernehmen. Zurück ging
es nur über „Zurücksetzen", und das warf die Handarbeit gleich mit weg. Das ist
„Sechs Wege ersetzten das Deck, einer fragte" noch einmal, mit einem Weg, der
vierzig Felder auf einmal ersetzt.

Gelesen und übernommen sind jetzt zwei Handgriffe, und dazwischen steht, was
sich ändern *würde*: war → wird, je Feld. `liesRuecklauf()` schreibt nirgends
hin — `ruecklauf.test.ts` friert den Entwurf dafür ein, wie `deckStore.test.ts`
es tut. Dazu ein einstufiges Rückgängig.

Zwei Dinge hängen daran. Gezählt wird der **Unterschied** und nicht das
Gelieferte: ein Modell, das die Palette wortgleich zurückgibt, liefert sechzehn
Rollen und ändert keine, und ein Knopf, der „16 Werte übernehmen" verspricht
und nichts tut, ist die Sorte Zahl aus „Ein Knopf, der eine Zahl nennt und eine
andere tut". Und ein Vorschlag **verfällt**: wer liest, dann in Schritt 3 eine
Farbe von Hand setzt und danach übernimmt, bekäme sonst eine Rechnung gegen
einen Stand, den es nicht mehr gibt.

**Der häufigste Grund für eine unlesbare Antwort ist kein Tippfehler.** Es ist
die Längengrenze des Modells: die Antwort hört mitten in `"paper": "#FAF` auf.
An der rohen Parser-Meldung ist das von einer verunglückten Klammer nicht zu
unterscheiden — und die Sackgasse war dieselbe, nur dass hier zwölf von
sechzehn Rollen schon dastanden und niemand sie bekam.

`abgebrochen()` schneidet deshalb rückwärts bis zur letzten Stelle, an der ein
Wert *fertig* war, und schließt die offenen Klammern. Genannt werden die
Stelle, das zuletzt vollständige Feld und der Satz, der die Sackgasse öffnet
(„bitte das Modell, ab ‚paper' fortzusetzen"). Der Teilimport wird **angeboten
und nie genommen**, und er läuft über `JSON.stringify` zurück in denselben
Leser: ein zweiter Weg in den Entwurf wäre die Abkürzung, die hier schon
zweimal auseinandergelaufen ist.

**Acht Knöpfe in einer Leiste sind acht Tabstopps.** Wer ohne Maus arbeitet,
lief auf *jedem* Schritt durch alle acht, bevor er im ersten Feld stand. Die
Leiste ist jetzt eine `tablist` mit einem rollenden Tabstopp und ←/→/Home/End —
keine erfundene Belegung, sondern die, die eine Reihe Reiter über einem Bereich
ohnehin mitbringt. Nach **Tab** wird ausdrücklich nicht gegriffen: wer die
Taste abfängt, mit der man weiterkommt, sperrt den Benutzer dort ein, wo er
gerade steht.

Und daran hing sofort ein Fehler, den erst der Rauchtest zeigte: `gehe()` setzt
den Fokus nach einem Schrittwechsel auf die Überschrift des Bereichs — richtig,
wenn der Sprung aus der Prüfliste kommt, und falsch, wenn er von der Pfeiltaste
kommt. Der Fokus verließ damit die Leiste, der zweite Pfeil ging ins Leere, und
sie war mit der Tastatur genau *einen* Schritt weit bedienbar. Die Leiste gibt
`gehe()` deshalb die Kennung des Zielreiters mit — ein Weg, keine
Reihenfolge-Akrobatik mit zwei `requestAnimationFrame`.

Dazu trägt ein Befund jetzt einen **Anker**: „Zu Schritt 3" führte in den
Schritt und dort vor sechzehn Farbfelder, und die Rolle, um die es ging, suchte
man von Hand. Das ist die einzige Rückzahlung für das, was ein Wizard gegenüber
einer langen Seite verliert — dort fand man eine Rolle mit ⌘F.

**Der Entwurf lebte nur bis zum nächsten ⌘R.** Fünfzig Felder samt der
ausgesuchten Wortmarken-Datei, und die Datei musste man erneut suchen. Der
Grund, aus dem diese Seite keinen Store hat, gilt der **Sitzung des Decks** —
ein eigener Schlüssel im `sessionStorage` berührt die an keiner Stelle, und
`ruecklauf.test.ts` hält die beiden Zeichenketten auseinander. `sessionStorage`
und nicht `localStorage`, weil ein Entwurf zu einem Anlass gehört und nicht zum
Rechner: ein geschlossener Tab beendet ihn, ein ⌘R nicht.

Zwei Fallen dabei. Die Frage „fortsetzen?" steht im *Initialisierer* von
`useState` und nicht in einem Effekt — sonst stünde einen Bildrahmen lang der
leere Entwurf da, die Vorschau rechnete ihn, und der Dialog käme über ein Bild,
das gleich wieder verschwindet. Und beim Neuladen kommen **zwei** Dialoge, in
dieser Reihenfolge: erst der `beforeunload` des Browsers, dann die eigene
Frage. Ein `once('dialog')` im Rauchtest fängt deshalb den falschen, der zweite
wird automatisch weggeklickt, und die Prüfung meldet einen Fehler, den es nicht
gibt.

**Zwei Dateifelder auf einer Seite, ein Selektor.** Mit „Entwurf laden" bekam
der Generator ein zweites `input[type="file"]` — und drei Stellen im Rauchtest
luden die Wortmarke über genau diesen Selektor. Getroffen wurde das erste, also
das falsche; die Wortmarke kam nie an, und die Meldung lautete „die Designdatei
steht nicht auf der Seite". Gesucht wird jetzt über `accept`.

**Dreizehn Schlüssel, dreimal getippt.** Die obersten Felder des Prompts
standen als Literale in `promptText()`, noch einmal in `ERWARTET` und ein
drittes Mal im Test. Käme eines dazu und stünde nur im Prompt, meldete der
Leser es als „kennt der Generator nicht": das Modell hätte den Prompt befolgt
und würde dafür gerügt, bei grünem Test — der prüft ja die dritte Liste.
`promptSchluessel` ist jetzt die eine, der Prompt baut seinen Rumpf daraus, und
der `switch` darüber ist erschöpfend: ein neuer Schlüssel ohne Block bricht
`tsc` ab statt einen Prompt zu erzeugen, der ein Feld verlangt, ohne zu sagen,
was hineingehört.

**Ein Codezaun, zwei Leser, einer davon verankert.** `stripCodeFence` im
Deck-Prompt schnitt nur `^```…```$` — „Klar, hier ist das Deck:" davor, und der
Zaun blieb stehen, `parseDeck` bekam die Vorrede als Inhalt. Der CI-Generator
hatte daneben seine eigene, unverankerte Fassung. Beide lesen jetzt
`ohneCodezaun()` in `lib/prompt/zaun.ts` — und eine Prüfung unter `lib/`
importiert nicht mehr aus einer Komponente.

Die Regel dort hat vier Stufen, und die zweite und dritte tragen sie: **ein
Deck darf selbst einen Codezaun enthalten.** Wer den Satz davor toleriert, ohne
das auszunehmen, holt aus einem nackten Deck dessen *inneren* Codeblock heraus
und wirft alles andere weg. Erkannt wird es am `---` des Frontmatters.

Die dritte hat zuerst gefehlt, und zwar als *Kommentar ohne Code*: der Schutz
stand im Kopf der Datei, im Rumpf schützte er nur einen Text, der **mit** `---`
beginnt. Steht „Klar, hier ist das Deck:" davor, fiel ein nacktes Deck weiter
bis zum Schnitt durch — gemessen wurde aus einem Deck mit einem Codeblock
`const a = 1;`, das ganze Deck ersetzt durch den Inhalt seines Blocks.
Geschnitten wird deshalb bis zum **letzten** Zaun und nicht bis zum nächsten;
der nächste ist bei einem Deck mit Codeblock dessen Öffner.

**Prettier ist gegen die stille Hälfte des Maskierens blind.**
`const a = 'C:\fonts\Inter.woff2';` kommt aus Prettier unverändert zurück,
während der Wert dahinter zur Laufzeit `C:<FF>ontsInter.woff2` ist. Geprüft
wird deshalb am **Wert**: das erzeugte Literal wird ausgewertet und gegen das
Original gehalten. Was das nicht beweist, ist, dass die ganze Datei übersetzt —
dafür stehen die Prüfungen daneben.

**Ein Umbruch im Label zerriss die Kommentarspalte.** Ab der zweiten Zeile
stand der Text am linken Rand, ohne Stern, und der Kopf sah aus wie
abgeschnittener Code. Prettier fasst Blockkommentare nicht an, es gibt also
keinen Diff und keinen Wurf. `imKommentar()` faltet jetzt zuerst und bricht
danach die Sternchen-Folge — in dieser Reihenfolge.

**Die rechte Spalte war ein einziger Scroller.** Wer die Prüfliste las,
scrollte die Folie aus dem Bild — und das trifft genau dann, wenn es zählt:
nach einem mittelmäßigen Rücklauf stehen zwanzig Befunde da, und die Frage
lautet „was macht dieser Befund mit der Folie". Jetzt zwei Bereiche; bei Enge
gibt die Folie nach und nicht die Liste.

Die Prüfung dazu ist beim ersten Anlauf an derselben Stelle danebengegangen wie
schon zweimal zuvor: sie scrollte einen **geratenen** Knoten
(`parentElement.parentElement`), und über dem kaputten Stand war das eine Ebene
daneben — die Gegenprobe blieb grün. Gescrollt wird jetzt der nächste
*scrollbare* Vorfahr, und dass überhaupt gescrollt wurde, steht als eigene
Zusicherung daneben.

**Ein Formularfeld, das die laufende CI ersetzt.** Die Vorschau des Generators
rief `registerTheme(theme)` — mit dem Schlüssel, den jemand gerade eintippt.
Und `registerTheme()` ruft `activate()`, wenn der Schlüssel der gerade gültige
ist: wer „nozilla" ins Feld schrieb, überschrieb damit die eigene CI.
Nachgemessen: `palette.signal` ging von #00FF9C auf #FF0000, der Eintrag in der
Auswahlliste hieß fortan wie das Formularfeld, und ein leeres Feld meldete ein
Erscheinungsbild unter dem Namen „" an.

Nötig war die Anmeldung nur, solange über `setActiveTheme()` umgestellt wurde —
das schlägt im Verzeichnis nach. `withTheme()` belegt die lebendigen Bindungen
unmittelbar und fragt niemanden. Die Regel dahinter ist allgemein: **„rechne
kurz damit" und „jemand hat gewählt" sind zwei Vorgänge**, und nur der zweite
geht das Verzeichnis und die Oberfläche etwas an.

**Zwei Kennungen, ein Feld.** Der Schritt „Maße" führt vier Leitern
untereinander, und `sm` und `lg` stehen in zweien davon: `ankerFuer('Maße',
'sm')` ergab für die Größenleiter und für die Schattenversätze dieselbe
Kennung. Zwei Felder mit derselben Kennung sind im DOM **ein** Feld —
`getElementById` nimmt das erste, also sprang „Zum Feld" bei einem
Schattenversatz in die Schriftgrößen und markierte dort einen Wert, an dem
nichts falsch war. Ein Wegweiser, der auf die falsche Stelle zeigt, ist
schlechter als keiner.

`massAnker(gruppe, rolle)` verlangt die Gruppe jetzt als eigenen Typ, damit sie
im Formular nicht zu vergessen ist. Geprüft wird an dem, was `pruefe()`
**ausgibt** — die Kennungsfunktion allein wäre eindeutig, während im Formular
die Gruppe fehlt —, und zusätzlich im Rauchtest am *Fokus*: eine doppelt
vergebene Kennung ist im DOM nicht verboten, sie ist nur mehrdeutig, und
mehrdeutig sieht in keiner Zusicherung anders aus als eindeutig.

**Ein Merker, der nie verfällt, nimmt fremde Arbeit mit.** „Rückgängig" nimmt
den *ganzen* Entwurf auf den Stand vor dem Rücklauf zurück. `ersetze()` legte
den Merker an, `aendere()` — der Weg jedes einzelnen Handgriffs — räumte ihn
nicht weg: wer den Rücklauf übernahm, danach zwölf Farben nachzog und dann in
Schritt 1 auf den Knopf traf, verlor die zwölf. Für den *Vorschlag* galt die
Regel längst (`gelesenGegen !== entwurf`); sie galt nur nicht für den Weg
zurück.

**Prozent ist keine Zahl unter eins.** `rgba(228, 0, 58, 0.5)` meldete den
Verlust der Deckkraft, `rgb(228 0 58 / 50%)` nicht: `parseFloat('50%')` ist 50,
und die Frage lautete `< 1`. Dieselbe Farbe, dieselbe halbe Deckkraft, einmal
gesagt und einmal stumm verschluckt — und stumm war ausgerechnet die
Schreibweise, die ein Sprachmodell heute schreibt.

**„Zuletzt vollständig" war der Schlüssel, an dem es abriss.** Die
Abbruchdiagnose führte einen einzigen Schlüssel: den zuletzt *begonnenen*. Sie
meldete damit „zuletzt vollständig war ‚palette'" über einer Palette, die
mitten in `"paper": "#FAF` aufhörte — die eine Auskunft, auf die es ankommt,
genau verkehrt herum. Es sind zwei Fragen: was steht ganz da, und wo geht es
weiter. Der Bericht nennt jetzt beide.

**Eine Zahl, die das Gelieferte zählt und „Übernommen" heißt.** „Übernommen: 13
von 13" stand über einer Antwort, in der zwölf Felder vom falschen Typ waren
und übergangen wurden — gezählt wurden die Schlüssel des Objekts. Das ist „Ein
Knopf, der eine Zahl nennt und eine andere tut" in Satzform, und die Antwort
ist dieselbe: gezählt wird, was wirklich geschieht.

Dazu ein zweiter Fall derselben Sorte: die Schnittliste meldete „9 Schnitte → 9
Schnitte". Wer neun Schnitte gegen neun andere tauscht — dieselbe Familie in
anderen Dateien, also den Normalfall —, bekam als einzige Auskunft, es bleibe
bei neun. Genannt wird jetzt, **welche** Zeilen gehen und welche kommen.

**Ein Schlüssel ohne den Weg, der ihn liest.** `auszeichnungEnger` lief weder
über `nimmText` noch über `bericht.gruppe`, also über keinen der beiden Wege,
die „kam nicht" sagen — ein Modell, das ihn ausließ, bekam dafür kein Wort, und
die Laufweite der Auszeichnung sieht man auf der Probefolie nicht. Gezählt wird
in der Prüfung deshalb gegen `promptSchluessel` und nicht gegen eine Zahl im
Test: ein vierzehnter Schlüssel bekommt so keine stillschweigende Ausnahme.

**Die fehlende Ablage war der zweite Weg in dieselbe Stille.** `sichereEntwurf`
meldet eine *gescheiterte* Ablage — die *nicht vorhandene* gab wortlos `null`
zurück, und die Folge ist dieselbe: es sichert sich nichts, und niemand erfährt
es. Ein privates Fenster ist dabei kein erfundener Fall, sondern die
Voreinstellung von Leuten, die ein fremdes Werkzeug ausprobieren.

**Ein Prompt, der mehr verspricht, als die Prüfliste erlaubt.** Er beschrieb
den Schlüssel als „Kleinschrift, Ziffern, Bindestriche" — und der Emitter zieht
`-x` nur *vor einem Buchstaben* zu `X` zusammen, `probe-2024` ist also kein
Bezeichner. Wer zu viel verspricht, bekommt vom Modell einen Schlüssel, den die
Seite eine Ecke weiter zurückweist: der Fehler steht dann bei dem, der den
Prompt befolgt hat. Geprüft wird an **beiden** Beispielen, die der Prompt
nennt, gegen den Emitter, der urteilt.

**Eine dritte Füllfarbe, die nirgends gezeichnet wird.** Die Wortmarke kennt
zwei Farben: `wordmarkFromSvg()` sammelt die Pfade in `letters` und die in
`accent` und verwirft den Rest, und `wortmarkeAusSvg()` nahm beim Einlesen
stumm die ersten beiden. Eine dreifarbige Datei verlor damit ein Drittel ihrer
Pfade — auf der Folie, im SVG, im PDF und in der PPTX. Dass es zwei Farben
sind, ist eine Entscheidung dieses Werkzeugs; sie stumm durchzuziehen ist
keine.

**Eine erzeugte Zeile, die Prettier beim nächsten Lauf umbricht.** „Neue Haas
Grotesk Display Pro Condensed" samt Dateiname ergibt einen Schnitt von 144
Zeichen — die Datei aus dem Generator ist dann eine andere als die im Repo, und
der Diff landet in einem fremden Commit. Nachgerechnet wird die Grenze
**nicht**: `printWidth` ist weich, und eine nachgebaute Regel hat hier schon
einmal das Falsche verurteilt. Gemessen wurde die andere Richtung — ein
Objektliteral, das im Quelltext umgebrochen dasteht, lässt Prettier
umgebrochen, auch wenn es längst in eine Zeile passte. Der Emitter schreibt es
deshalb immer umgebrochen, und die Länge muss niemand kennen. Die Prüfung dazu
läuft an einem langen Namen: eine Prüfung, deren Eingabe nie an die Grenze
geht, prüft die Grenze nicht.

**`StrictMode` ruft den Initialisierer von `useState` zweimal.** Das ist
Absicht und soll Nebenwirkungen sichtbar machen — die Frage „Entwurf
fortsetzen?" stand damit zweimal da, und wer beim ersten Mal „ja" und beim
zweiten „nein" klickt, hat seinen Entwurf gelöscht, ohne das je gewollt zu
haben. Gemerkt wird die Antwort, nicht die Frage.

Und dieselbe Frage hatte eine zweite Hälfte: ein fortgesetzter Entwurf galt als
**unberührt**. „Entwurf sichern" und „Zurücksetzen" blieben gesperrt, die Frage
beim Schließen kam nicht, mitgeschrieben wurde nichts — bis irgendwann der
erste Anschlag fiel. Wer den Entwurf zurückholte, um ihn herunterzuladen, stand
vor einem grauen Knopf.

**Und „Entwurf laden" war der siebente Weg.** Er warf fünfzig ausgefüllte
Felder wortlos weg, während „Zurücksetzen" direkt daneben für dieselbe Tat um
Erlaubnis bittet — „Sechs Wege ersetzten das Deck, einer fragte", eine Seite
weiter. Ein Fehlgriff im Dateidialog genügte.

**Eine fremde `.json` riss die Seite weg, wo eine Meldung stand.** `zusammen()`
legte `...gelesen` über den leeren Entwurf, ohne einen Feldtyp zu prüfen — und
`pruefe()` läuft in einem `useMemo` *während des Renderns* und greift auf
`entwurf.id.trim()` zu. Eine Datei mit `{"id": 42}` warf dort einen TypeError,
und der `try/catch` um „Entwurf laden" fängt ihn nicht: `ersetze()` plant nur
eine Zustandsänderung, gerendert wird danach. Gemessen: weißes Fenster, keine
Meldung, kein Formular — obwohl direkt daneben der Satz „… ist kein gesicherter
Entwurf" für genau diesen Fall gebaut ist.

**Ein alter Quelltext unter einer Überschrift mit Dateinamen.** Die Vorschau
hält bei einem offenen Fehler den letzten tragfähigen Stand fest, und das ist
richtig — sie ist der Grund, aus dem jemand hier ist. Über der Folie stand der
Vermerk „nicht mehr aktuell", über dem Quelltext nicht: dort gab sich ein alter
Stand für den aktuellen aus, und zwar unter `src/themes/<id>.ts`.

**Ein Wächter, der genau seinen Fall wegfiltert.** Die Warnung „eine dritte
Füllfarbe, die nirgends gezeichnet wird" rechnete über `pfade.filter(Boolean)`
— und schloss damit die Pfade **ohne** Füllfarbe aus, also genau die, die auch
nirgends gezeichnet werden. Der Grund, warum es welche gibt: `readPaths()` las
`fill` nur als Attribut am `<path>`, und Illustrator, Figma und Inkscape
schreiben die Farbe für eine gruppierte Auswahl ans umschließende `<g>`.

Die Folge ist so groß, wie sie klingt. Die Buchstabenpfade kamen mit leerer
Füllung zurück, `wortmarkeAusSvg()` schlug deshalb die *Akzentfarbe* als
Buchstabenton vor, und auf der Folie, im SVG, im PDF und in der PPTX stand
danach nur noch der Akzentpunkt. Gemessen an der Wortmarke des Musterkunden:
die Pfaddaten der Buchstaben fielen von 4152 auf 51 Zeichen. Die Prüfliste
sagte kein Wort, der Knopf „Designdatei" war offen, und die erzeugte Datei trug
eine Buchstabenfarbe, die niemand gewählt hat.

Die Reparatur hat zwei Hälften, und die zweite ist die wichtigere.
`readPaths()` erbt die Füllung jetzt vom Vorfahren und liest auch
`style="fill:…"` — damit gehen die üblichen Exporte durch. Was danach *immer
noch* keine Farbe trägt (die Farben stehen in einer CSS-Klasse), wird
**gemeldet und nicht erraten**: eine Farbe zu erfinden hieße zu behaupten, sie
sei gemeint.

Und ein dritter Fall hing daran: eine leere Buchstabenfarbe kam durch, weil die
Prüfung `pfade.some(gleich('', ''))` fragte — leer gegen leer ist gleich. Die
Datei trug danach `letters: ''`, und `wordmarkFromSvg()` sammelte zur Laufzeit
alle Pfade *ohne* Füllung als Buchstaben ein: der Akzent wurde zum Buchstaben
und in Tinte gemalt.

**Zwei Leser derselben Antwort, und nur einer kannte die Anführungszeichen.**
Der Kopf von `STUFEN` begründet, warum `geradeAnfuehrung` vor `nurObjekt`
steht: der Klammerzähler stiege sonst mitten in einer Zeichenkette aus.
Dasselbe Argument gilt für `ohneKommentare` und `ohneNachkomma` — und dort war
es nicht angewandt. Aus `{ “produkt”: “Deck // Fläche” }` machte der
Kommentarleser einen Zeilenkommentar ab dem `//` und warf den Rest der Zeile
samt schließender Klammer weg.

Gemeldet wurde das danach als **Längenabbruch des Modells** über einer
vollständigen Antwort. Wer dem Rat folgte und „ab produkt" fortsetzen ließ,
bekam dieselbe Antwort und dasselbe Ergebnis, beliebig oft. Der realistische
Auslöser für das `//` ist ein Dateiname auf einem CDN — dort ist der Verlust
die ganze Schnittliste.

Umgestellt wurde die Reihenfolge ausdrücklich **nicht**: `geradeAnfuehrung`
fasst auch innerhalb von Werten an, und vorgezogen machte sie aus jedem
deutschen „Wort" in einem Markennamen ein gerades. Die beiden führen jetzt über
`istBegrenzer()` ihre eigene Buchführung.

**Die Rettung griff nicht dort, wo sie gebaut wurde.** Der Kopf von `Abbruch`
beschreibt den Fall: die Antwort hört mitten in `"paper": "#FAF` auf, zwölf von
sechzehn Rollen stehen schon da, und niemand bekommt sie. Gemerkt wurden
Schnitte aber nur auf der obersten Ebene — bei einem Abbruch *innerhalb* der
Palette war der letzte Schnitt der vor `"palette"`, und angeboten wurden zwei
Felder. Weil die Palette der längste Block einer Modellantwort ist, ist das
nicht der Rand des Längenabbruchs, sondern sein Regelfall. Geschnitten wird
jetzt je Ebene, von innen nach außen.

**`NaN === NaN` ist false, und ein leeres Zahlenfeld schreibt NaN.** Die
Änderungsliste führte deshalb „auszeichnungEnger · NaN → NaN": der Knopf
versprach „Einen Wert übernehmen" über einer Antwort, die nichts ändert, der
Satz „ändert nichts" blieb aus (er hängt an derselben Länge), und wer klickte,
verbrauchte den Merker für „Rückgängig" für nichts. `Object.is` fängt es.

**Zwei Rechnungen für dieselbe Frage, zum zweiten Mal.** Die Warnung „nur eine
Marken-Schrift" zählte die Namen im Stapel, die *Schnitte haben* —
`ersatzkette()` im Export baut ihre Kette dagegen aus **Rollen** und findet
eine Familie nur über den ersten Namen eines Stapels. Eine Symbolschrift an
zweiter Stelle sah damit aus wie eine Reserve und war keine: das ⌘, das der
Bildschirm aus ihr holt, fiel aus PNG und PDF, und die Prüfliste hatte vorher
ausdrücklich Entwarnung gegeben. Gezählt wird jetzt dieselbe Kette, die der
Export geht.

**Der Bildschirm simuliert fett, die Datei nicht.** Geprüft wurde, ob eine
Familie *einen* aufrechten Schnitt hat — die Hierarchie verlangt aber
display/700, body/600 und mono/700. Eine frisch lizenzierte Schrift kommt oft
nur als Regular; `resolveFace()` gibt dann kein `null` zurück, sondern den
nächstliegenden Schnitt. Jede Überschrift wird in PNG, PDF und PPTX aus den
Regular-Umrissen gezeichnet, während der Browser auf der Fläche fett simuliert
— dieselbe Bauart wie „Der Bildschirm ersetzt eine fehlende Glyphe, die Datei
nicht".

**Die erzeugte Datei machte das Repo unlintbar, in das man sie legt.**
`no-irregular-whitespace` aus `eslint:recommended` schaut auch in Kommentare
(`skipComments` ist per Vorgabe aus). Ein Name mit einem geschützten
Leerzeichen — so kommt er beim Kopieren aus Word — stand ungefaltet im
Kopfkommentar: die Datei übersetzte, Prettier war zufrieden, die Prüfliste
schwieg, und `npm run lint` brach ab. Und der Fix von damals trug den Fehler
bei sich: die Sternchen-Folge im Namen wurde mit einem *schmalen* Leerzeichen
gebrochen, also mit genau einem Zeichen, das diese Regel verbietet.

Geprüft wird deshalb mit **ESLint selbst** und nicht mit einer nachgebauten
Regel — dieselbe Linie wie bei Prettier eine Prüfung weiter oben.

**Eine Korrektur, die nicht sagt, dass sie eine ist.** `normalisiereFarbe()`
gibt zwei Werte zurück, und der Kopf jener Datei schreibt aus, wozu: „Eine
stille Korrektur ist eine Behauptung: ‚das war gemeint'." Der Rücklauf-Bericht
hielt sich daran, das Farbfeld daneben nicht — es las den Wert und warf den
Satz weg. Wer `rgba(17, 17, 17, 0.05)` aus einem Styleguide einsetzte, hatte
danach Fast-Schwarz im Feld statt eines Fünf-Prozent-Grau, ohne ein Wort. Und
danach sieht es keine Prüfung mehr: `#111111` ist ein gültiger Wert.

**Eine fremde `.json` wurde stumm zum leeren Entwurf.** `zusammen()` prüft seit
dem weißen Fenster jeden Wert und fällt sonst auf die Vorbelegung zurück —
wortlos. Eine `package.json` ergab damit exakt `leererEntwurf()`, es gab keine
Meldung, und der Sprung nach Schritt 1 sah aus wie ein gelungener Ladevorgang,
obwohl fünfzig Felder ersetzt wurden. Der Satz „… ist kein gesicherter Entwurf"
stand daneben und wurde nie erreicht. `zusammen()` gibt jetzt zurück, was ankam
und was verworfen wurde: aus nichts wird kein Entwurf, und eine Rolle mit
falschem Typ wird genannt statt stumm durch nozillas Wert ersetzt.

**Derselbe Satz an zwei Stellen, und nur einer wurde verschärft.** Der Prompt
beschrieb den Schlüssel neu („ein Bindestrich nur vor einem Buchstaben"), der
Hinweis unter dem Feld, in das derselbe Wert von Hand getippt wird, blieb bei
„Kleinschrift, Ziffern, Bindestriche." Wer ihm folgte, bekam einen harten
Fehler und einen gesperrten Knopf — wörtlich der Vorwurf, wegen dessen der
Prompt verschärft wurde, nur eine Datei weiter. `SCHLUESSELREGEL` steht jetzt
neben `bezeichner()`, also neben der Rechnung, die den Satz wahr macht.

**Eine Härtungsliste, die man tippt, prüft die Hälfte.** Der Test gegen das
weiße Fenster führte sieben oberste Felder von fünfzehn; `label`, `markenname`,
`produkt` und `fontFamily` fehlten, und `pruefe()` fasst die genauso an. Die
Liste wird jetzt aus `Object.keys(leererEntwurf())` gerechnet — dieselbe Linie
wie beim Prompt, dessen Schlüssel auch gelesen und nicht getippt werden. Und
die Gegenrichtung vergleicht seither den **ganzen** Entwurf statt drei von
zwölf Gruppen: `stroke: leer.stroke` zu schreiben wäre sonst unbemerkt
geblieben.

**Und der teuerste Wächter ist der, der auf der eigenen CI anschlägt.** Es gibt
ihn jetzt als Test: jedes mitgelieferte Erscheinungsbild wird zu einem Entwurf
gemacht und durch `pruefe()` geschickt, und kein Befund über dem Rang „zu
wissen" darf dabei herauskommen. Zwei der Regeln oben — die Ersatzkette und die
Schriftgewichte — sind erst dadurch als richtig belegt und nicht nur als
scharf.

**Ein Bild drehte sich um seine Ecke, sein Rahmen um die Mitte.** Alles, was
ein Element zeichnet, geht über `transformSegs(segs, elementMatrix(element))`,
und `elementMatrix` dreht um die Elementmitte — das `image`-Primitiv ging als
einziges daran vorbei: es bekam die *ungedrehte* Ecke plus einen Winkel, und
`svg.ts` dreht um (x, y). Bei 90° und 400 × 100 lagen Rahmen und Schatten bei x
250…350 / y 50…450 und das Bild bei x 0…100 / y 200…600 — zwei getrennte Dinge
auf derselben Folie, das Bild links aus der Folie heraus, und der Klickbereich
(`transformOrigin: 'center center'`) dort, wo es nicht ist. Die `.pptx` setzte
es an eine dritte Stelle.

`typesetToScene()` macht es achthundert Zeilen weiter unten für dasselbe
Primitiv richtig — es fehlte nur hier. Geprüft wird an der **Hülle**: der
Kasten des Bildes muss dort liegen, wo der Kasten seines eigenen Rahmens liegt,
nicht am Winkel.

**Und der PPTX-Weg drehte ein zweites Mal.** Die Segmente tragen die Drehung
schon; `primToShape()` schrieb sie zusätzlich als `rot` in die `a:xfrm`.
Gemessen an einem 400 × 100-Rechteck mit 30°: die Segmente haben die Hülle
101,8…498,2 / 106,7…393,3, also schon gedreht — mit dem zweiten `rot` stand die
Form um 60° gedreht da. Bei 90° hob es sich auf, und die `.pptx` zeigte *gar
keine* Drehung, während drei andere Wege sie zeigten. Das Bild bleibt die
Ausnahme: ein `p:pic` hat keine eigene Geometrie, die man drehen könnte.

**„Einpassung" erreichte keine einzige Ausgabe.** `ImageElement.fit` stand im
Modell, im Inspektor („Ganz sichtbar" / „Füllend"), in der `.md` und im
Deck-Prompt — und die `ScenePrim` hatte kein solches Feld. Das SVG passte immer
ein (fest `xMidYMid meet`), PDF und PPTX zogen immer auf den Kasten: ein
2:1-Bild in einem 400 × 400-Kasten stand auf derselben Folie einmal eingepasst
und einmal auf die halbe Höhe gestaucht. Wer „Füllend" wählte, änderte nichts.

Es steht jetzt in der Szene wie seinerzeit `alt`, und jede Ausgabe liest es an
einer Stelle: SVG über `meet`/`slice`, PPTX über `a:srcRect` (Ausschnitt)
beziehungsweise einen auf das Verhältnis gebrachten Rahmen, PDF über ein
gerechnetes Rechteck samt Beschnitt — jsPDF kennt kein `preserveAspectRatio`.
Ohne bekannte Maße bleibt es beim Strecken: eine Einpassung ohne die echten
Maße wäre eine Erfindung.

**Die Fläche maß Markdown-Bilder anders als der Export.** `SlideView` rief
`buildSlideBackdrop()` und `buildElementPrims()` **ohne Optionen** — also war
`resolveImageSize` undefiniert, und der Setzer fiel auf „volle Spaltenbreite,
Verhältnis 0,5625" zurück. Ein 300 × 300 großes Logo stand auf dem Bildschirm
1104 × 621 groß da und in jeder Ausgabe 300 × 300; der Absatz darunter begann
auf der Fläche unterhalb des Folienrands und im Export in der oberen Hälfte.
Wer die Folie so setzte, dass sie auf dem Bildschirm passt, bekam eine Datei
mit einem Drittel des Bildes und einem Loch darunter.

Das widerspricht dem Satz, mit dem `SlideView` überschrieben ist — sie
zeichnet, indem sie *genau das Markup* einsetzt, das der SVG-Export erzeugt.
Die Maße kommen jetzt aus einem eigenen Merker (`bildmass`,
`fordereBildmasse`), der nur Breite und Höhe holt und nicht wie der Export
jedes Bild rastert; ein Zähler daran lässt die `useMemo` verfallen, sobald sie
eintreffen — dieselbe Bauart wie bei den Schriften.

**Eine unbekannte Elementart war ein stiller Löschbefehl.** `oneOf(raw.kind,
elementKinds, 'shape')` machte aus einem `kind: heading` — einem Tippfehler
beim Handeditieren, einem Sprachmodell, das über die elf Arten hinausschreibt —
ein Rechteck, und der `switch` darunter ließ alles Übrige fallen. Auf der Folie
stand ein leerer Kasten, und **Öffnen und Sichern genügte**: der Block stand
danach als `kind: shape` in der Datei, der Satz nirgends mehr. Wörtlich der
teuerste Fehler dieses Projekts, eine Ebene tiefer.

Der Rohblock bleibt jetzt in `ElementBase.unknownRaw` liegen und wird
wortgleich zurückgeschrieben — dieselbe Linie wie beim unlesbaren `nzl`-Block
und beim unbekannten `theme:`. Und er verfällt, sobald jemand das Element
anfasst: `geaendert()` im Store räumt ihn weg, sonst stünde beim nächsten
Öffnen wieder der alte Block da und die eben gemachte Änderung nirgends.
Geprüft wird an der **gesicherten Datei**, nicht am Modell.

**Eine doppelte Kennung aus der Datei blieb doppelt.** Einen Element-Block im
`nzl`-Abschnitt zu kopieren ist der naheliegendste Weg, eine zweite Karte
anzulegen — danach stand dieselbe `id` zweimal, und weil `updateElements()`
über ein `Set` der Kennungen filtert, bewegte ein Ziehen der linken Karte auch
die rechte, bei einer Auswahl, die einen Eintrag zeigte. Eindeutig gemacht wird
es in `parseSlide`, wo die Geschwister beieinanderstehen: `normalizeElement`
sieht immer nur *ein* Element.

**Drei Dinge, die nur die `.pptx` anders machte.** Tabellenzellen setzte sie in
`bodyStrong`/`body` (16) statt in `small` (13), also 23 % größer als die Fläche
— und das in Spalten, deren Breite `tableColumnWidths()` mit den Maßen von
`small` rechnet; eine eng gesetzte Kopfzelle brach dort um und sonst nirgends.
Die Kopfzeile jeder Tabelle bekam eine Füllung, die der Setzer nicht malt. Und
die Beschriftung von Form und Verbinder fiel ganz heraus: sie steht in der
Szene als Text-Primitiv, der PPTX-Weg filtert Textprimitive aus der Geometrie,
und `TEXT_KINDS` kennt nur Bausteine mit eigenen Textfeldern — ein
Flussdiagramm war in PowerPoint ein leeres Kastendiagramm.

**Eine offene Form mit „Füllung: Fläche" verschwand.** „Rahmen" sind vier
Eckwinkel, „Klammer" ist ein Haken — beides Striche ohne Fläche. Der Körper
bekam damit einen Farbwert und keine Kontur, und ein offener Pfad wird mit
`fill="none"` geschrieben: gemessen kam `<path d="…" fill="none"/>` heraus,
also nichts. Das Element blieb im Modell, in der Ebenenliste und in der `.md`
stehen und ließ sich anwählen — und war aus jeder Ausgabe verschwunden, ohne
ein Wort. Gezeichnet wird jetzt die Kontur: die einzige Lesart, die eine offene
Form für „hier soll etwas stehen" hat.

**Vier Felder, die nur manche Varianten benutzen — und drei, die sich uneinig
waren.** Der Inspektor bot bei jeder Kartenvariante Label und Zeichen an;
gezeichnet wurde das Label bei dreien, das Zeichen bei zweien. Und die `.pptx`
schrieb das Label auch dort, wo die Fläche es nicht zeichnet: bei „Zitat" stand
es dort als eigener Absatz über dem Zitat. Verloren ging nichts — die Felder
überleben den Weg in die `.md`; es wurde nur nichts daraus, und ein Feld,
dessen Inhalt niemand liest, ist schlimmer als kein Feld.
`kartenFelder(variant)` ist jetzt die eine Rechnung, und alle drei fragen sie.

**Und der Rauchtest hielt die alte Schreibweise fest.** Die Prüfung „ein
Diagramm zeichnet die Zahlen, die drinstehen" suchte `>Eins<` — die drei
Zahlen daneben fielen bei der Umstellung auf Versalien nicht auf, weil Ziffern
keine Schreibweise haben. Nur der Text verrät sie, und die Prüfung sucht ihn
jetzt in beiden Richtungen: groß muss dastehen, gemischt darf nicht.

**Ein `trim()` fraß den führenden Trenner.** Bei Tabulatoren und der
Zwei-Leerzeichen-Schreibweise *ist* er Leerraum: eine leere erste Zelle fiel
weg, und alle Zellen der Zeile rutschten eine Spalte nach links. Aus einer
Tabellenkalkulation kopiert, mit einer Gruppenspalte, die nur in der ersten
Zeile gefüllt ist, stand danach „Hamburg" unter „Region" und die letzte Spalte
leer. In Strich-Schreibweise und bei einer leeren Zelle *mitten* in der Zeile
ging es gut — es traf ausschließlich die erste.

**Ein Regler, der bei sechs von elf Arten nichts tut.** Der Innenabstand stand
im Inspektor bei jeder Elementart, und gemessen wirkt er bei fünf: Karte,
Tabelle, Diagramm und — nur mit Fläche — Text und Markdown. Die Fabrik gab dem
Badge trotzdem 16 mit, dem Zeichen 12 und der Form 20; zwei dieser Zahlen
stehen auf keiner Stufe der CI-Skala. Wer den Regler bewegte, sah nichts
geschehen, und das ist die schlimmste Sorte Bedienelement: sie lässt einen an
sich selbst zweifeln.

`nutztInnenabstand()` ist deshalb eine Rechnung mit zwei Kunden — der Inspektor
zeigt danach, gezeichnet wird danach. Geprüft wird sie am **Ergebnis**: für
jede Art und jede Füllung einmal mit Abstand 0 und einmal mit 40 zeichnen und
das Markup vergleichen. Was sich ändert, muss sie bejahen; was gleich bleibt,
verneinen. Eine getippte Liste wäre eine zweite Wahrheit über den Zeichner
gewesen.

**Und daneben eine Fläche, die genau die Farbe des Untergrunds hat.** Fünf der
achtzig Kombinationen aus Untergrund, Ton und Füllung malen nichts, was sich
abhebt — darunter `paper` + Ton „Weiß" + „Fläche", also die Vorgabe jeder neuen
Folie und ein Ton aus der ersten Reihe. Das Element steht danach in der
Ebenenliste, lässt sich anwählen, hat Maße, und ist auf der Folie, im SVG, im
PDF und in der .pptx nicht zu sehen. Umgefärbt wird nichts — die Farbe hat
jemand gewählt —, aber gesagt gehört es.

**Der erste Anlauf dieser Warnung schlug auf sichtbaren Elementen an.** Er
meldete zusätzlich eine *Kontur* in der Untergrundfarbe und traf damit
ausschließlich Elemente, deren Fläche man sieht: bei `framed` zieht der Strich
seinen Ton aus dem Element, bei `outline` aus dem Untergrund, und in beiden
Fällen steht eine sichtbare Füllung oder ein Gegenton daneben. Dreißig
Kombinationen hätten geklagt statt fünf. Widerlegt hat es nicht das Nachdenken,
sondern die Tabelle: einmal alle achtzig durchgerechnet und angesehen, welche
wirklich unsichtbar sind. Gefragt wird jetzt nach **allem, was der Körper
malt** — eine Warnung über einem Element, das gut aussieht, ist die Sorte
Wächter, die man abschaltet.

Beides hängt an einer Stelle, die keine Zusicherung in `scene.test.ts` zeigt:
die Rechnung kann stimmen und der Inspektor sie trotzdem nicht rufen. Der
Rauchtest setzt deshalb wirklich einen Ton, wählt wirklich eine Füllung und
liest, was in der Leiste steht — in beide Richtungen, denn die Gegenprobe ist
hier der eigentliche Befund.

**Sechs Bedienelemente an der Wortmarke, die nichts taten — und die
Bibliothek sagte es an ihrer Kachel.** Der Hinweis unter „Wortmarke" lautet
seit je „Nie drehen, nie umfärben, nie verzerren, nie mit Schatten"; der
Inspektor bot alle vier trotzdem an. Ton, Füllung,
Strichstärke, Schatten, Innenabstand und Drehung standen im Inspektor wie bei
jeder anderen Art. Gemessen ändert keines davon ein Zeichen an ihrem Markup,
und zwar in jeder Variante: die Wortmarke malt keinen Körper — ihre Farbe kommt
aus `variant` —, und gedreht wird sie nie, „Was wir nie tun — drehen". Der
Drehgriff war dabei schlimmer als nichts. Der Winkel ging ins Modell und in die
`.md`, der Auswahlrahmen und der Klickbereich drehten sich mit, das Zeichen
nicht: ein schräger Kasten um ein gerades Logo, und der Klickbereich dort, wo
das Logo nicht ist. Wörtlich „Ein Bild drehte sich um seine Ecke, sein Rahmen
um die Mitte", nur ohne jede Drehung.

Dazu ein zweiter Fall, den erst die Tabelle zeigte: **der Verbinder ist ein
Strich.** Ton und Strichstärke wirken bei ihm, Füllung und Schatten nicht —
zwei weitere Felder, die dastanden und nichts taten. Deshalb ein Eintrag je
Bedienelement und nicht eine Frage „hat es einen Körper": die gemeinsame Frage
hätte die beiden mitgetragen.

`elementFelder()` ist deshalb die eine Rechnung mit drei Kunden — der Zeichner,
der Inspektor, die Arbeitsfläche —, und `nutztInnenabstand()` ist darin
aufgegangen. Geprüft wird auch sie am **Ergebnis**: für jede Art einmal mit und
einmal ohne Drehung zeichnen, und für den Körper alle Werte von Ton, Füllung,
Strichstärke und Schatten durchgehen. Was sich ändert, muss sie bejahen.

**Und die Warnung von gestern schlug auf ihr an.** „Eine Fläche in genau der
Farbe des Untergrunds" fragte `elementPaint`, und das rechnet auch der
Wortmarke eine Fläche aus — ausgegeben wird sie nie. Gemessen: 3867 Zeichen
sichtbares Markup, in dem die Untergrundfarbe kein einziges Mal vorkommt, und
darüber der Satz, es sei nichts zu sehen. Derselbe Fehlalarm, gegen den der
Kopf dieser Funktion einen Absatz weiter oben geschrieben ist — eine Warnung
über einem Element, das gut aussieht. Gefragt wird jetzt zuerst, ob dieses
Element überhaupt einen Körper malt.

**Und der Merker stand vor dem Abbruch.** `first` ist in `ElementPanel` als
`CanvasElement` getippt und ist trotzdem oft nichts — es ist `elements[0]`
einer leeren Auswahl, und der Abbruch „Nichts ausgewählt." steht dreißig Zeilen
weiter unten, weil ein Haken nicht bedingt gerufen werden darf. Ein
`elementFelder(first)` davor warf damit bei jeder leeren Auswahl, der Inspektor
verschwand, und neun Rauchtest-Prüfungen liefen in einen Zeitablauf beim Klick
auf einen Reiter, den es nicht mehr gab. `tsc` sagte nichts —
`noUncheckedIndexedAccess` ist aus, und `elements[0]` gilt ihm als gesetzt.
Gefunden hat es der Rauchtest, und zwar an neun Prüfungen am Stück: ein
einzelner roter Handgriff wäre als Zufall durchgegangen.

**„Resize nw" stand an acht Griffen, und niemand konnte es sehen.** Die Ansage
der Größengriffe war englisch und dazu ein Schlüssel des Codes — `aria-
label={`Resize ${handle}`}`. Vor Augen steht sie nie; sie ist die Beschriftung,
die *nur* eine Hilfstechnik liest, und damit die eine Stelle, an der ein Blick
ins Fenster nichts findet. Das Sprachsieb sah die Zeichenkette und ließ sie
durch: seine beiden Listen führen Substantive und Funktionswörter, und „resize"
ist ein Verb. Gefunden hat es kein Test, sondern das Lesen der Datei; der
Eintrag in der Liste fängt nur die Wiederholung. Die acht Namen stehen jetzt in
`labels.ts`, wo die deutschen Beschriftungen wohnen — „Größe ändern: oben
links".

**Der PPTX-Weg setzte jedes Textprimitiv der Szene neu.**
`inlineToParagraph(text, 'label')` gab jedem, was diesen Weg nimmt, Space Mono
Bold 12 in Versalien. Für die Beschriftung eines Diagramms stimmte das
zufällig, für die einer Form nicht: eine Form mit `labelStyle: 'h3'` stand auf
der Fläche in Zilla Slab 34 in gemischter Schreibweise und in der `.pptx` in
Space Mono 12 in Versalien — `labelStyle` erreichte die Datei überhaupt nicht.
Ein `SceneRun` trägt Familie, Größe, Gewicht, Laufweite und Farbe schon; er ist
genau das, was ein `StyledRun` braucht. Und **der Test dazu erwartete die
Versalien** und hat den Fehler damit bestätigt statt ihn zu finden — er
vergleicht jetzt mit dem SVG derselben Folie.

**Zwei Stiltabellen für dieselbe Karte.** `cardScene()` setzt beim Zitat den
Titel in `lead` und die Quellenangabe in `label`, `elementParagraphs()` schrieb
`h4` und `small`: dieselbe Karte, in PowerPoint in einer anderen Schrift, in
einem anderen Gewicht und in gemischter Schreibweise statt in Versalien. Und
die Kennzahl deckelt die Szene auf 42 % der Kartenhöhe — ohne den Deckel ragte
die Zahl über ihren Kasten, und zwar bei der Kennzahl-Karte des mitgelieferten
Decks. `kartenFelder()` nennt jetzt auch die Stufen, `kartenTitelGroesse()` die
gedeckelte Größe.

**Die Deckkraft hörte in der `.pptx` an drei Stellen auf.** `shape()` gab sie
nur an die Füllung weiter, `lineXml()` rief `solidFill` einstellig: eine
gerahmte Form verblasste, ihr Rahmen blieb schwarz, und eine Form mit „Füllung:
Kontur" — also auch jeder Verbinder und jede Diagrammachse — blieb ganz
undurchsichtig. Ein Bild kannte sie gar nicht; `<a:alphaModFix>` ist der dafür
vorgesehene Weg und fehlte schlicht, und ein zu 35 % eingeblendetes
Hintergrundbild stand voll deckend über der Folie.

**jsPDF dreht ein Bild um die andere Ecke.** Ein `image`-Primitiv trägt seine
Ecke *nach* der Matrix und dreht um genau diesen Punkt — `scene.ts` rechnet sie
eigens dafür aus, `svg.ts` schreibt `rotate(a x y)`. jsPDF dreht um `(x, y +
h)`, also um die untere linke Ecke des ungedrehten Rechtecks. Gemessen an einem
400 × 100-Bild bei (450, −50) mit 90°: der Rahmen des Elements lag bei x
350…450, das Bild bei x 550…650. Gerechnet wird deshalb die Ecke, die jsPDFs
eigene Drehung dorthin bringt, wo das SVG sie hat.

**`doc.rect()` ohne Stil-Argument streicht und verbraucht den Pfad.** jsPDF
reicht ein fehlendes Argument an `putStyle` durch, und das fällt auf
`defaultPathOperation` = `"S"` zurück; das `W` danach fand keinen aktuellen
Pfad. Für „Füllend" gab es damit **keinen Beschnitt**, dafür ein schwarzes
Rechteck über dem Bild. jsPDF schreibt die richtige Benutzung an seine eigene
`clip()`: erst eine Zeichenoperation mit dem Stil `null`, dann klemmen — und
der Pfad ist die *gedrehte* Hülle, nicht der achsenparallele Kasten.

**Die Deckkraft eines Textlaufs gehört nicht abgeflacht.** Der Kopf von
`flatten()` begründet das Abflachen für Flächen — überlappende Teilpfade
verdunkeln sich an den Stoßstellen sonst doppelt —, und für Striche gilt es
weiter. Für Text galt es nicht: die CI baut ihre Hierarchie über Farben mit
Deckkraft (`elementTones.ink.textMuted` ist Papier bei 64 %), und auf einer
hellen Folie steht die dunkle Karte dazwischen. Gegen den *hellen* Untergrund
gerechnet wurde daraus ein sehr helles Grau auf schwarzer Karte, während SVG
und `.pptx` denselben Text richtig zeigten.

**Ein ungedecktes Zeichen zog den Rest des Laufs nach links.** `faceFor()` gibt
für ein Zeichen, das keine der Schriften führt, trotzdem den gewünschten
Schnitt zurück; `splitByFace()` ließ es damit im Stück, und jsPDF ließ es beim
Kodieren fallen. Weil die Nachbarn im selben `doc.text()` standen, rückten sie
um seinen Vorschub nach — der Umriss-Weg lässt an derselben Stelle eine Lücke.
Zwei Ausgaben, zwei verschiedene Zeilen. Es bekommt jetzt ein eigenes Stück und
wird ausgelassen.

**Ein Steuerzeichen im Text macht die Datei ungültig, die Fläche nicht.** Ein
aus Word eingefügter Absatz trägt an jedem manuellen Zeilenumbruch U+000B, aus
einem PDF kopierter Text U+000C; beide überleben Öffnen und Sichern. Auf der
Fläche fällt nichts auf — dort geht dasselbe Markup über `innerHTML` in ein
lebendes `<svg>`, und der HTML-Parser ist nachsichtig. Die exportierte `.svg`
ist dagegen kein wohlgeformtes XML mehr, und der PNG-Weg legt genau dieses SVG
in ein `<img>`: der Export scheitert mit „Das SVG ließ sich nicht als Bild
laden", einem Satz, der auf die Ursache nicht zeigt. Geprüft wird deshalb mit
einem **XML-Parser** an der fertigen Datei.

**Zwei Maskierfunktionen, uneinig über ein Zeichen.** `escapeXml()` macht aus
`'` ein `&apos;`, `escapeXmlAttr()` in `images.ts` nicht — `inlineImageHrefs()`
suchte deshalb eine Zeichenkette, die im Markup nicht steht. Ein Pfad mit einem
Apostroph blieb als relativer Verweis in der exportierten `.svg` stehen, obwohl
der Dateikopf zusagt, sie stehe für sich; und im PNG fehlte das Bild ersatzlos,
weil ein über eine Blob-URL geladenes SVG keine externen Ressourcen holen darf.
Mit `&` im Pfad griff die Ersetzung, mit `'` nicht.

**Ein Bild in den Notizen wurde nie eingesammelt.** `collectImageSources()`
durchsucht Fließtext, Markdown-Elemente und `element.src` — die Notizen nicht,
und `buildHandoutScene()` setzt sie sehr wohl. Drei Folgen, keine sagte etwas:
der Setzer kannte die Maße nicht und blies ein 300 × 300-Bild auf 1104 × 621
auf, der PDF-Weg stieg vor dem `catch` mit `meldeFehlendeBilder()` aus, und als
fehlend gemeldet wurde es auch nicht — die Quelle war nie eingesammelt worden.

**Ein Querstrich im Fließtext teilte die Folie beim Sichern.** `---` nach einer
Leerzeile ist in Markdown ein Trennstrich und in diesem Dateiformat der
Folientrenner; geschrieben wurde der Text wortgleich hinaus. Der Weg dorthin
ist kein Sonderfall: `serializeDeck → parseDeck` läuft bei jeder
Selbstsicherung und bei jedem Wort, das der Vortragskanal hinüberschickt — im
Vortrag sah der Referent danach eine andere Folie als das Publikum. Geschrieben
wird jetzt `- - -`: derselbe Trennstrich nach CommonMark, den der Trenner-
Ausdruck nicht sieht. Damit ist auch der zweite Fall erledigt, ein Deck ohne
Frontmatter, dessen erste Folie mit einem Querstrich beginnt —
`splitFrontmatter()` hielt ihn für den Beginn eines Frontmatters und verlor die
Folie ganz.

**Ein `nzl`-Block in einem Codeblock wurde herausgeschnitten.** `splitSlides()`
zählt Codezäune sorgfältig mit, `parseSlide()` tat es nicht: es suchte über den
ganzen Brocken. Eine Folie, die das Dateiformat *zeigt* — also das Willkommens-
Deck —, verlor beim Öffnen den halben Codeblock aus ihrem Text, und die
Beispielwerte wurden zu den echten Metadaten der Folie. Die Lagerechnung steht
jetzt an einer Stelle und hat drei Kunden: teilen, den Block finden, und beim
Schreiben wissen, welche Zeile als Trenner gelesen würde.

**`trim()` frisst die Einrückung, `replace(/^\n+/)` nicht.** `parseSlide()`
nimmt vorn nur Zeilenumbrüche weg, `serializeSlide()` nahm mit `trim()` auch
die Leerzeichen: aus einem eingerückten Codeblock — vier Leerzeichen, die
Schreibweise aus CommonMark — wurde ein Absatz mit einer eingerückten Zeile
darunter.

**Der Zeichenbruch griff nur bei einem Wort, das allein auf der Zeile stand.**
Er saß *innerhalb* des Zweigs „passt noch" und zusätzlich hinter
`current.length === 0`. Stand ein Wort davor, lief das lange über die Kante des
Elements hinaus — obwohl der Kopf von `wrapRuns` `overflow-wrap: anywhere`
verspricht.

**`\s` schließt das geschützte Leerzeichen ein.** `decodeEntities()` übersetzt
`&nbsp;` richtig nach U+00A0, und der Umbruch machte die Übersetzung sofort
wieder zunichte: `run.text.split(/(\s+)/)` schnitt dort, und `piece.trim() ===
''` hielt es für Weißraum. Geschnitten wird jetzt an `[^\S\u00a0]+` — Weißraum
außer diesem einen.

**Die Leerzeile ist die Absatzgrenze, auch im Listenpunkt.** Ein lockerer Punkt
bekommt von marked kein `paragraph`, sondern zwei `text`-Kinder mit einem
`space` dazwischen; verschmolzen stand danach „Erster Absatz.Zweiter Absatz." —
ohne Leerzeichen, ohne Umbruch, in jeder Ausgabe.

**Block-HTML wurde ehrlich verworfen, Inline-HTML wörtlich abgedruckt.** Die
Haltung steht auf Blockebene ausgeschrieben — rohes HTML wird nicht gesetzt,
„exporting it as vector text would be a lie" —, inline galt sie nicht: `<br>`
fiel in den `default`-Zweig und stand als Text auf der Folie, samt spitzer
Klammern. Es ist die verbreitetste Schreibweise für einen erzwungenen Umbruch.

**Eine Abbildung wurde nur erkannt, wenn sie allein im Absatz stand.** Stand
ein Wort daneben, ging der Absatz den Inline-Weg, und dort macht
`flattenInline` aus einem `image`-Token stillschweigend einen *kursiven
Textlauf mit dem Alternativtext*: das Bild fiel aus jeder Ausgabe. Wer ein Bild
einsetzte und Worte danebenschrieb, bekam Worte.

**Zehn von zwölf Aktionen ließen den Rohblock stehen.** `geaendert()` räumt
`unknownRaw` weg und wurde von `updateElements` und `transformElements`
gerufen; alle anderen spreizten direkt (`{ ...element, x: element.x + dx }`).
Das Modell war geändert, die Datei nicht — beim Sichern stand wortgleich der
alte Block darin. Eine Liste von Stellen, an denen man einen Rohblock wegräumen
*muss*, wäre eine Liste von Stellen, an denen man es vergisst; es steht jetzt
in `withElements()`, wo jede Änderung an den Elementen durchläuft.

**Der Vortragskanal schickte das Deck genau zweimal.** Beim Einhängen und auf
`hallo`; danach ging nur noch der Stand hinüber. Die Übersicht ist im Vortrag
aber voll bedienbar — ⌘K öffnet sie, und an jeder Kachel stehen „schieben",
„duplizieren" und „löschen". Wer dort eine Folie löschte, sah in der
Referentenansicht eine andere Folie als das Publikum: die Notizen gehörten zur
alten Nummerierung, der Zähler zeigte eine Folie zu viel.

**Eine wiederhergestellte Sitzung galt als gesichert.** `loadDeck()` setzt
`dirty: false` — richtig für eine geöffnete Datei, falsch für die Sitzung: die
steht in keiner Datei, und einen Dateigriff gibt es auch nicht.
`darfErsetzen()` fragt genau an `dirty`, und damit liefen alle sechs
Ersetzungswege wortlos über die wiederhergestellte Arbeit hinweg. Wörtlich der
Fehler, gegen den `darfErsetzen()` gebaut wurde, eine Ebene tiefer.

**Und „3 slides" stand englisch in der Übersicht.** Das Sieb war grün, und zwar
bauartbedingt: sein Textknoten-Muster verlangt, dass der Text hinter einem `>`
beginnt — hier begann er hinter einem `}`, also in genau der Schreibweise, in
der eine Zahl mit ihrem Wort steht. Die neue Regel ist an die Zeile gebunden
und lässt Attributnamen aus; ohne beides stünden vierzig Zeilen Code als
Beschriftung da. Und sie geht am Klempnerei-Filter *vorbei*: „slide" ist
durchgehend klein, und genau deshalb kam es durch — ein Text zwischen zwei
Ausdrücken im JSX ist per Bauart sichtbar.

**Eine deutsche Ganzzahl hat kein Komma.** `zahlAus()` behandelte den Punkt
als Tausendertrenner nur, wenn auch ein Komma dabeistand — „1.234.567" wurde
damit `Number('1.234.567')`, also `NaN`, und `parseChartData` warf die ganze
Zeile weg: die Reihe hatte einen Balken weniger, ohne ein Wort. Der Kopf jener
Datei verspricht im selben Atemzug deutsche Schreibweise. Der Fall wird jetzt
an der *Zahl* der Punkte erkannt; beim einzelnen bleibt es beim Bisherigen,
denn „3.5" ist drei Komma fünf und nicht fünfunddreißig — raten wäre hier
schlimmer als lesen.

**Und der Innenabstand wirkte doch, an zwei Arten mehr.** `nutztInnenabstand()`
verneinte ihn für Form und Zeichen; gemessen schiebt er die Beschriftung einer
Form (sie bricht innerhalb der Breite minus Abstand um) und den Rahmen „Kasten"
eines Zeichens. Der Test sah es nicht, weil sein Formlabel „Text" hieß — kurz
genug, um bei jedem Abstand auf eine Zeile zu passen. Ein Wächter, der seinen
eigenen Fall wegfiltert, zum zweiten Mal in diesem Repo; die Vorlage im Test
trägt jetzt ein Label, das über die Breite hinausgeht, und einen Kasten.

**Die Beschriftung war das einzige, was sich in der `.pptx` nicht drehte.**
`scenenTextShape()` gab weder `opacity` noch `rotate` weiter, obwohl das
Textprimitiv beides trägt: die Beschriftung einer um 30° gedrehten Form lag
waagerecht neben ihr, während die Form gedreht war, und eine zu 35 %
eingeblendete stand voll deckend da. Und die beiden Drehpunkte sind nicht
derselbe — PowerPoint dreht um die **Mitte** des Rahmens, das SVG um (x, y).
Der Rahmen wird deshalb dorthin gelegt, wo PowerPoints eigene Drehung ihn
hinbringt: dieselbe Rechnung wie `jsPdfEcke()`, aus demselben Grund. Gemessen
an einem 400 × 100-Kasten bei 30°: Rahmenmitte (406,8 / 254,2), also 2,1
Einheiten links und genau auf der Grundlinie — geprüft wird deshalb die Mitte
und nicht die Ecke.

**Und die Rundung stand auf der falschen Seite der Multiplikation.** `rot` ist
in 60000steln eines Grades angegeben, gerundet wurde die *Gradzahl*: aus 30,5°
wurde 30. Die Einheit gibt es genau dafür.

**Die Deckkraft hörte an der Tabelle ganz auf.** `tableShape()` bekam nie eine
— eine zu 35 % eingeblendete Tabelle stand in PowerPoint voll deckend da,
Zellen wie Linien, während vier andere Wege sie blass zeigten. Das ist derselbe
Befund wie „Die Deckkraft hörte in der `.pptx` an drei Stellen auf", eine
Elementart weiter; wer eine Farbe schreibt, schreibt ihre Deckkraft mit.

**Eine geratene Zeile für eine Überschrift, die umbrechen kann.** Der PPTX-Weg
rechnete die Höhe der Tabellenüberschrift als `label.size * lineHeight * 1.6`,
`tableScene()` misst sie mit `typesetText()`. Bei einer einzeiligen Überschrift
stimmten beide ungefähr, bei einer zweizeiligen lag die Tabelle 10 Einheiten zu
hoch und schnitt in den Text. `tabellenLabelHoehe()` ist jetzt die eine
Rechnung — zum dritten Mal dieselbe Antwort: zwei Rechnungen für dieselbe Frage
laufen auseinander, und man sieht es erst in der fremden Datei.

**Das Handout verlor jede Notiz, die länger war als eine Seite.** Unter der
Folie bleiben knapp tausend Einheiten; `buildHandoutScene()` setzte die ganze
Notiz an einem Stück dorthin und gab *eine* Szene zurück. Gemessen an sechzig
Absätzen: 1188 Einheiten standen unterhalb der Blattkante — im PDF also
nirgends, ohne ein Wort. Die Notiz läuft jetzt auf Folgeseiten weiter, und
`buildHandoutScenes()` gibt deshalb ein Array zurück; der Aufrufer sammelt mit
`flatMap`.

Neu gesetzt wird dabei **nicht**: dasselbe Satzergebnis wird nach seinen
eigenen Zeilen auf Seiten verteilt. Ein zweiter Satzlauf je Seite hätte andere
Umbrüche als der erste und wäre der zweite Weg, den die erste Regel dieses
Projekts verbietet.

Zwei Fallen daran. Ein gesetztes Textprimitiv trägt seine **Grundlinie** als
`y`, eine Fläche und ein Bild ihre Oberkante — wer das gleichsetzt, legt die
erste Zeile jeder Folgeseite genau auf den Rand und lässt ihre Versalhöhe
darüber hinausragen. Und die Prüfung dazu maß zuerst gegen `canvas.margin.top`,
während der Satzspiegel `margin.left` nimmt: 72 gegen 88, und die Sabotage kam
durch. Ein Wächter, der den falschen Token liest, ist grün und bewacht nichts.

**Das Werkzeug malte seinem eigenen Deck den Überlaufbalken an.** Die
Überschrift auf Folie 3 der Willkommensmappe brach in Zilla Slab Bold 68 auf
zwei Zeilen — 886 Einheiten Text in 868 verfügbaren — und stand damit 73
Einheiten unter ihrem 64 hohen Kasten. Der Baustein „Kampagnensatz" lief um
elf hinaus, und im Probenhaus fehlten einer einzeiligen h1 fünf Einheiten für
ihre Unterlänge. Wer den Balken beim ersten Öffnen als Rauschen abtut, tut es
bei der eigenen Arbeit wieder — dieselbe Bauart wie der Kontrastwächter, der
auf der eigenen CI anschlug.

Geprüft wird jetzt zweimal, und die zweite Prüfung ist die, auf die es
ankommt. `overflow.test.ts` geht jedes mitgelieferte Deck und jeden Baustein
durch — aber **mit den Ersatzmaßen**, denn im Test gibt es kein Canvas, und wo
eine Zeile umbricht, entscheidet die echte Schrift. Gegengerechnet wurde
deshalb an den Schnitten in `public/fonts/` über den eigenen TrueType-Leser;
dauerhaft bewacht wird es im Rauchtest, der im Browser jede Kachel anklickt und
nach dem Balken sieht. Die Kacheln werden dabei über ihr `title` angesprochen —
der Knopf daneben legt eine Folie an.

**Und der Balken log an jedem gedrehten Element.** `elementMatrix()` dreht um
die Elementmitte, verglichen wurde aber gegen die Unterkante des *ungedrehten*
Kastens. Gemessen an einem 400 × 120-Textkasten mit einem Satz, der bequem
hineinpasst: bei 270° meldete die Anzeige 144 Einheiten Überlauf. Und die
andere Richtung ist die schlimmere — schon bei 15° wanderte ein wirklicher
Überlauf von 46 Einheiten aus der Rechnung und blieb unsichtbar. Ein Wächter,
der auf gut Aussehendem anschlägt und beim Fehler schweigt, ist beides zugleich
falsch. Gemessen wird jetzt im Kasten des Elements, also ohne seine Drehung:
Kasten und Inhalt drehen sich gemeinsam, die Frage ändert sich dadurch nicht.
Der Strich selbst dreht sich dafür mit — um die Elementmitte, wie Auswahlrahmen
und Klickbereich.

**Zwei Bibliotheken im Bauwerk, die niemand anfordert.** jsPDF führt `canvg`
und `html2canvas` als optionale Abhängigkeiten und lädt sie im Rumpf über einen
dynamischen Import nach — für `doc.svg()` und `doc.html()`, also für die beiden
Wege, ein PDF aus einem *Dokument* zu machen. Dieses Werkzeug macht seines aus
der `Scene`; die erste Regel des Projekts verbietet den zweiten Zeichner
ausdrücklich. Rollup sah die Ausdrücke trotzdem und legte zwei Lazy-Chunks an:
202 kB und 160 kB, mit ihren Quellkarten zusammen 1,5 MB, die ausgeliefert
werden und die kein Browser je anfordert. Beide Kennungen zeigen jetzt auf ein
leeres Modul.

`dompurify` steht ausdrücklich **nicht** dabei: jsPDF lädt es aus demselben
Rumpf nach, dieses Werkzeug benutzt es aber selbst. Wer die drei über einen
Kamm schert, nimmt der Markdown-Reinigung ihre Bibliothek.

Geprüft wird am **Verzeichnis** und nicht an der Konfiguration — dass ein Alias
dasteht, sagt nichts darüber, ob er greift. `pruefeBauwerk()` im Rauchtest sieht
in `dist/assets` nach, und die Gegenprobe ohne Alias nennt die Datei beim Namen.

**Drei Viertel des Rauchtests waren Warten.** Ein Lauf dauerte 3 min 06 s, und
darin standen 167 feste `waitForTimeout` mit zusammen 135 Sekunden. Eine feste
Pause ist immer zugleich zu lang und zu kurz: auf einem ausgelasteten Rechner
reicht sie nicht und der Test wird wackelig, auf einem leeren ist sie
verschenkte Zeit. Gefragt wird jetzt, wo es etwas zu fragen gibt — `bis()`
wartet auf eine Bedingung, `warteAufSchriften()` auf `document.fonts.check()`,
`oeffneGenerator()` auf die Schrittleiste. Und wo eine Zusicherung ohnehin
dastand, *ist* sie die Bedingung: aus „warte 900 ms, dann muss die Folie anders
aussehen" wird „warte, bis die Folie anders aussieht" — dieselbe Meldung, wenn
sie es nicht tut, nur schneller, wenn sie es tut. 1 min 53 s.

**Und die eine Pause, die bleiben muss, hat eine Zahl aus dem Code.**
`loadFaces()` zählt seinen Zähler ein **zweites** Mal hoch, wenn die Notbremse
nach 2000 ms greift, und an diesem Zähler hängt ein Neuzeichnen. Ein Wechsel
des Erscheinungsbilds fordert die Schnitte der neuen Marke an, also läuft diese
Uhr danach wieder. Die Prüfung gleich dahinter nahm ihr „vorher" vor der
Notbremse und ihr „nachher" danach und meldete eine Änderung, die nicht die
dunkle Erscheinung gemacht hatte — einmal in fünf Läufen. Die alte Fassung kam
mit 1200 + 800 ms zufällig gerade darüber, und niemand wusste, dass sie das tat.

Eine Bedingung gibt es dafür nicht: „die Fläche zeichnet gleich noch einmal"
ist von außen nicht zu sehen, und ein Ruhefenster, das kürzer ist als die
Notbremse, erklärt die Fläche für ruhig, während die Uhr noch läuft.
`nachDemWechsel()` wartet sie deshalb ab, und der Kommentar nennt die Stelle,
aus der die 2000 stammen. Sieben Läufe hintereinander grün.

**Ein Sieb, das nur schneller wird, hat nichts bewiesen.** Eine der
umgestellten Bedingungen wurde deshalb unerfüllbar gemacht: der Rauchtest
meldete die Prüfung nach fünfzehn Sekunden als rot, mit ihrer eigenen alten
Meldung, statt hängen zu bleiben. Das ist die Frage, die bei `bis()` zählt —
nicht ob es wartet, sondern ob es aufhört.

**Links die Datei, rechts die Ansicht — und das Zahnrad stand falsch.** Die
Kopfleiste trug links fünf Dateizeichen nebeneinander (neu, Beispiel, öffnen,
sichern, Export) und rechts, zwischen Zoom und „Vortragen", die Einstellungen.
Das ist die Sorte Reihe, die man nur noch über den Kurzhinweis liest — und das
Zahnrad war dort der Fremdkörper: die Erscheinung des Arbeitsplatzes, das
Anlegen eines Erscheinungsbilds und der Stand des Werkzeugs gehen den Vortrag
nichts an. Links steht jetzt `[Datei ▾] [Export ▾] [⚙ ▾]`, rechts nur noch,
was die Folie *zeigt*.

Die mitgelieferten Decks stehen **flach** im Datei-Menü unter einer eigenen
Überschrift und ohne Erklärzeile. Ein Menü im Menü ist mit der Maus fummelig
und mit der Tastatur eine eigene Belegung; bei zwei Einträgen wäre das ein
Bauwerk für nichts. Und die Erklärzeilen („nozilla — jedes Layout, jede
Elementart") beantworteten an dieser Stelle eine Frage, die niemand stellt: was
die beiden unterscheidet, ist das Erscheinungsbild, und genau das steht jetzt
als Name da.

**Der Umbau war billig, weil nichts daran hing — und das war selbst der
Befund.** Keine vitest-Prüfung importiert `TopBar` oder `SettingsMenu`; der
Rauchtest greift von der ganzen Leiste nur vier zugängliche Beschriftungen ab
(`Export`, `Einstellungen`, `Folie hinzufügen`, `Vortragen`), und die bleiben
oberste Knöpfe. Die vier Knöpfe, die ins Menü zogen, fasste **kein einziger
Test** an — ausgerechnet ⌘⇧N, ⌘O, ⌘S und die Beispiele, also die Familie aus
„Sechs Wege ersetzten das Deck, einer fragte". Sie hinter ein Menü zu räumen,
ohne eine Prüfung dazuzulegen, hätte vier sichtbare ungeprüfte Wege gegen vier
versteckte ungeprüfte getauscht.

**Und die neue Prüfung fängt etwas, das der Quelltext-Wächter nicht sieht.**
Die Gegenprobe entschärfte den Ruf im Beispielweg zu
`if (!darfErsetzen() && false)`. `replaceGuard.test.ts` blieb **grün** — es
liest die Quellen und findet den Ruf, ohne zu wissen, dass er nichts mehr tut.
Der Rauchtest wurde rot. Das Sieb bewacht, dass die Frage *dasteht*; der
Rauchtest, dass sie *wirkt*, und beide werden gebraucht.

**Und der Rest der Pausen: 167 · 135 s wurden 16 · 9,9 s.** Ein Lauf dauert
jetzt 47 Sekunden statt 3 min 06 s. Drei Muster tragen fast alles:

*Die Zusicherung ist die Bedingung.* `bisGleich()` und `bisWahr()` klagen
wortgleich wie `gleich()` und `wahr()` — nur wird vorher gewartet. Aus „warte
600 ms, dann muss die Warnung dastehen" wird „warte, bis die Warnung dasteht":
schneller, wenn es stimmt, genauso laut, wenn nicht, und die Meldung nennt
weiterhin den zuletzt gelesenen Wert.

*Die Oberfläche sagt es selbst.* Ein Reiter trägt `aria-selected`, ein
Leistengriff `aria-expanded`, eine Kachel des Filmstreifens `aria-current` —
das sind Bedingungen, keine Vermutungen. `zumSchritt()` wird
vierunddreißigmal gerufen und wartete jedes Mal 250 ms auf nichts.

*Ein Dialog wird an einem Merker erkannt, nicht an einer Uhr.* Wer nach ⌘⇧N
900 ms wartet und dann den Horcher abhängt, prüft, dass er lange genug
gewartet hat. Der Horcher setzt jetzt `gefragt = true`, und darauf wird
gewartet — damit prüft dieselbe Zeile, dass wirklich gefragt wurde.

**Was bleiben durfte, hat einen Grund.** Die 2200 ms in `nachDemWechsel()`
warten die Notbremse von `loadFaces()` ab (siehe oben). Die 150 ms in
`setzeFarbe()` geben React die Runde nach einem synthetischen `input`. Und ein
paar Pausen am Ende eines Blocks lassen die Seite zur Ruhe kommen, bevor die
nächste Prüfung beginnt — dort gäbe es keine Bedingung, sondern nur eine
Behauptung darüber, was gleich passiert.

Belegt ist beides: **vier Läufe hintereinander grün**, und eine Sabotage an
`overflowOf()` — `ueber > NACHSICHT && false` — macht die umgestellte Prüfung
rot, mit ihrer alten Meldung und ohne hängen zu bleiben.

**Ein Feld des Inspektors traf alles, was ausgewählt war — auch die falsche
Art.** Er zeigt die Felder des **ersten** Ausgewählten und schrieb sie an
**alle**. Bei zwei verschiedenen Arten war das nicht folgenlos, sondern
zerstörend: Diagramm und Tabelle teilen sich `data` und `label`. Wer beide
auswählte und im Feld „Zahlen" tippte, überschrieb die Zellen der Tabelle —
gemessen: aus „Was⇥Wert / Eins⇥1" wurde „West⇥99", und der Verlust überlebte
das Sichern. Ein Badge bekam auf demselben Weg ein `title`, das kein Zeichner
liest und das in der Datei stand.

Artgebundene Felder treffen jetzt nur ihre eigene Art, und die Leiste sagt es,
wenn die Auswahl gemischt ist. Die *gemeinsamen* Felder — Ort, Maße, Ton,
Füllung — treffen weiter alle: dafür wählt man mehrere aus.

**Zwei Felder wirkten auf der Folie und waren im Inspektor nicht zu
erreichen.** Die Wortmarke fiel in den `default`-Zweig und bekam gar keine
eigenen Felder — dabei ist ihre Variante das einzige, was sie an sich selbst
hat, und von den vier Werten malen drei verschiedene Bilder. Und die Typo-Stufe
eines Form-Labels (`labelStyle`) steht im Dateiformat, wird gezeichnet und in
die `.pptx` getragen; ein Feld dafür gab es nie. Beides war nur über den
handgeschriebenen `nzl`-Block erreichbar — das Gegenstück zum toten
Bedienelement: eine wirksame Angabe ohne einen Weg dorthin.

**`min` und `max` standen nur als Attribute da.** Der Browser hält davon nur
die Pfeiltasten ab; getippt wird alles. Eine −50 in „Breite" ergab eine Karte,
deren Text Zeichen für Zeichen umbrach, und beim nächsten Öffnen stand
stillschweigend eine 1 da — `normalizeElement` kappt beim Lesen. Der getippte
Wert war damit weder behalten noch abgelehnt, sondern still ersetzt; dasselbe
beim Einblendschritt, wo ein negativer Wert die ganze Choreografie samt
gewählter Animation verschwinden ließ. Gekappt wird jetzt dort, wo die Grenze
schon steht.

**Und eine Zeitüberschreitung nannte nicht, worauf sie wartete.** Der
Rauchtest druckte von einem Fehlschlag nur die erste Zeile — bei einem
Playwright-Timeout ist das „locator.click: Timeout 30000ms exceeded" und sonst
nichts. *Welcher* Griff ins Leere ging, steht im Aufrufprotokoll darunter.
Zweimal in einer Runde war genau das die entscheidende Auskunft: einmal wartete
ein Klick auf einen Reiter, der bei mehreren Ausgewählten „Element (2)" heißt,
einmal auf einen Befund, der nie erschien. Gedruckt werden jetzt sechs Zeilen.

Der zweite Fall ist dabei der lehrreichere: `fill('')` wartet darauf, dass ein
Feld im Baum hängt — nicht darauf, dass der Schritt fertig gezeichnet ist. Baut
React den Bereich unmittelbar danach neu auf, steht der alte Wert wieder da,
und ohne leeres Feld gibt es keinen Befund zum Anklicken. Auf einem schnellen
Rechner passiert das nie, in der CI schon. Gewartet wird deshalb darauf, dass
der Wert wirklich leer *ist*.

**Ein Commit-Status ist nicht die CI.** Der Rauchtest läuft in GitHub Actions
als Job `verify` des Workflows `CI` — und der meldet sich als **Check-Run**,
nicht als Commit-Status. Wer `commits/<sha>/status` fragt, bekommt eine leere
Liste und hält sie für „keine Prüfungen". Gefragt wird `commits/<sha>/check-runs`
(oder `pull_request_read` mit `get_check_runs`).

Es ist keine Kleinigkeit. `main` stand zweieinhalb Stunden rot, während dreimal
gemeldet wurde, es gebe nichts zu tun: die leere Antwort sah aus wie eine
Entwarnung, und eine Entwarnung ist genau das, was niemand nachprüft. Dieselbe
Bauart wie überall in dieser Liste — nicht ein Fehler, der schreit, sondern
einer, der schweigt.

Und was dort rot war, ist hier grün gewesen: die CI holt sich ihren Chromium
selbst (`playwright install`), dieses Abbild bringt einen anderen mit. Wer eine
Zeitüberschreitung nicht nachstellen kann, hat deshalb nicht unbedingt keinen
Fehler — er hat einen anderen Rechner.

**Die erzeugte Designdatei wurde gelesen und nie ausgeführt.** Für die Frage
„was wird aus diesem Entwurf" gibt es zwei Rechnungen: `themeAusEntwurf()`
zeichnet damit die Probefolie, `designdatei()` schreibt die Datei, die jemand
mitnimmt. Fünf Prüfungen standen über der Datei — sie übersetzt, Prettier lässt
sie in Ruhe, ESLint auch, jede Farbe steht einmal darin, der Export heißt wie
verlangt. Alle fünf lesen sie als **Text**. Damit war belegt, dass sie *eine*
Datei ist, und nirgends, dass sie *dieselbe* ist: die Probefolie hätte eine
Laufweite zeigen können, die in der ausgelieferten Marke anders herauskommt, und
gesehen hätte man es erst in der fremden Datei. Dritter Fall derselben Sorte in
diesem Repo, nach `tabellenLabelHoehe()` und `tableColumnWidths()`.

Ausgeführt wird sie jetzt wirklich — `ts.transpileModule`, die drei Importe
bedient, das exportierte `BrandTheme` Feld für Feld gegen das der Vorschau. Mit
TypeScript selbst und nicht mit einem nachgebauten Leser, dieselbe Linie wie bei
Prettier und ESLint daneben. Zwei Dinge hängen daran: der Entwurf der Prüfung
trägt eine gesetzte Laufweite und das fremde Zeichen-Set, denn beides geht in
der Datei durch eine *Rechnung* und nicht durch eine Zuweisung — ein Entwurf mit
`auszeichnungEnger: 0` ließe genau die durch. Und wer kein Erscheinungsbild
findet, wirft: zwei `undefined` vergleichen sich klaglos, und die Prüfung wäre
grün über einer Datei, die gar nichts exportiert.

Nachgemessen: die beiden stimmen überein, in beiden mitgelieferten Zeichenwahlen.
Und daneben lag ein Kommentar, der es nicht tat — `Wortmarkenentwurf.dateiname`
versprach, „als `import` in der erzeugten Datei" zu landen. Dorthin geht
`wortmarkeDateiname(id)`, ein aus dem Schlüssel gerechneter Name; der
ausgesuchte Dateiname steht nur als Quittung im Formular. Ein Kommentar, der
einem Feld eine Wirkung zuschreibt, die es nicht hat, ist die Vorstufe zu einem
Feld, dessen Inhalt verworfen wird.

**Ein Format, das A4 heißt, muss A4 sein.** Die Folie liegt jetzt auf Wunsch
mittig auf einem Blatt — hoch oder quer —, und der Weg dorthin ist der des
Handouts: das Blatt wächst um die Folie herum, die Folie behält jede
Koordinate. Skaliert wird nicht, denn das hieße, durch jeden Primitivtyp
hindurchzurechnen, samt der vorgemessenen Wortbreiten, die dann nicht mehr zu
den Glyphen passen, die sie beschreiben. *Verschoben* wird dagegen sehr wohl,
und das ist kein Widerspruch: eine Verschiebung fasst keine einzige Messung an.

Die Falle steckte im letzten Schritt. Die Proportion allein macht kein A4:
1456 × 2059 Folieneinheiten mal dem üblichen Massstab 0,75 sind 1092 × 1544
Punkt, also ein Bogen von 385 × 545 Millimetern — im Verhältnis genau richtig
und im Maß ein Drittel zu groß. Jeder Betrachter druckt das klaglos auf A4,
nachdem er es verkleinert hat, mit einem Rand, den niemand gewählt hat. Der
Massstab des Dokuments bringt es deshalb auf die kurze Kante von 210 mm.

Und eine zweite, die erst die Datei gezeigt hat: das Seitenmaß auf **ganze**
Einheiten zu runden kostet mehr, als es aussieht. Ein Querblatt von 1030 statt
1029,55 hat ein Verhältnis von 1,4136 statt 1,4142 — auf 210 mm kurzer Kante
wird die lange dadurch 296,85 statt 297,0. Gerundet wird jetzt auf Hundertstel:
fünf Tausendstel Millimeter, genauer als ein Drucker steht.

Geprüft wird deshalb an der **MediaBox der Datei** und nicht an der Proportion
der Szene — im Rauchtest durch das Menü hindurch, in `blatt.test.ts` mit
`pdfjs-dist`. Dazu eine Prüfung, die alle fünf Primitivarten von Hand aufbaut
statt sie aus einem Deck zu holen: ein Deck, das gerade zufällig keine Ellipse
enthält, machte daraus eine Prüfung über drei Arten, die behauptet, es seien
fünf.

**Das Folienmaß war eine Konstante, und drei Stellen hatten es abgegriffen.**
`canvas` ist jetzt eine lebendige Bindung wie die Marke — nicht weil die Marke
das Blatt wählte, sondern weil das *Deck* es tut: dieselbe CI, ein anderes
Format. Damit gilt hier dieselbe Regel wie in `runtime.ts`, und sie hatte schon
drei Verstöße, bevor es das Merkmal gab: `const { width, height, margin } =
canvas` im Kopf von `slideLayout.ts` (Satzspiegel *und* Fußzeile), und
`SLIDE_CX`/`SLIDE_CY` als Modulkonstanten im PPTX-Weg. Alle drei sind jetzt
Funktionen.

Zwei Modulkonstanten durften bleiben — `HOECHSTKANTE` liest `canvas.width`,
`NOTIZ_ABSTAND` den oberen Satzspiegel —, und zwar genau so lange, wie ein
Format nichts als die **Höhe** anfasst. Das ist keine Hoffnung, sondern eine
Zusicherung: `folienformat.test.ts` hält jedes Format gegen die CI und wird
rot, sobald eines die Breite bewegt. Erst dann sind die beiden still falsch,
und dann sagt es jemand.

Dass nur die Höhe wechselt, ist überhaupt die Entscheidung, die das Ganze klein
hält. Keine waagerechte Größe ändert sich — Satzspiegel, Spaltenbreiten,
`tableColumnWidths()`, jeder Zeilenumbruch, jede vorgemessene Wortbreite. Ein
Format, das auch die Breite änderte, setzte jedes Deck neu, und wer umstellt,
bekäme andere Umbrüche zurück, ohne ein Wort angefasst zu haben. Und beide
A4-Formate sind *höher* als 16:9: umzustellen kann nichts wegschieben, nur der
Rückweg kann Elemente unter die Kante schicken.

Der Schlüssel `16-9` nimmt seine Höhe aus der CI und nicht aus dem Namen — und
eine Zusicherung hält fest, dass die CI wirklich 16:9 ist. Sonst wäre der Name
eines Tages eine Lüge, und zwar eine im Dateiformat: dieselbe Sorte wie der
Untergrund `paper`, der das Weiß malt.

**Ein Effekt läuft nach dem Zeichnen — und damit auch nach dem Messen.**
`useDeckFolienformat()` setzt die Bindung in einem `useEffect`, wie
`useDeckTheme()` es beim Erscheinungsbild tut. Die Vermutung war, dass die
Ansichten von selbst folgen: das Format hängt am Deck, ein Deck-Wechsel legt ein
neues Objekt an, also zeichnet alles neu. Stimmt — nur eben *vor* dem Effekt.
Danach ändert sich für React nichts mehr, und `CanvasStage` blieb mit einem
A4-Deck bei 16:9 stehen. Deshalb ruft **jede Komponente, die das Folienmaß im
Rumpf liest**, `useFolienformatVersion()`: Fläche, Filmstreifen, Übersicht,
Vortrag und das Exportmenü. Genau die Bauart, die es bei den Schriften und beim
Erscheinungsbild schon gibt, und aus genau demselben Grund.

Gefunden hat es kein Nachdenken, sondern die erste Fassung der Rauchtest-
Prüfung, die schlicht rot war.

**Und die zweite Hälfte war grün, ohne etwas zu beweisen.** Der Merker in
`SlideView` hängt an der *Folie*, das Format am *Deck* — ohne den Zähler in
seinen Abhängigkeiten bliebe die gemalte Untergrundfläche auf dem alten Blatt.
Die Prüfung dazu lud das A4-Deck über ein Neuladen, und die Gegenprobe blieb
**grün**: nach einem Neuladen werden ohnehin die Schriften geholt, und deren
Zähler steht in derselben Abhängigkeitsliste. Der Merker verfiel also
nebenbei — aus einem Grund, der mit dem Format nichts zu tun hat.

Geprüft wird deshalb der Wechsel **im laufenden Fenster**: ⌘⇧N legt ein neues
Deck an, das 16:9 ist, und die Schriften stehen zu diesem Zeitpunkt längst.
Erst damit wird die Gegenprobe rot. Eine Prüfung, die nur den Ladeweg kennt,
prüft den Ladeweg.

**Der Wert bleibt eine freie Zeichenkette.** `format:` wird beim Lesen *nicht*
gegen die bekannten Formate gehalten — dieselbe Linie wie `theme:`, und aus
demselben Grund: ein Deck kann aus einer neueren Fassung dieses Werkzeugs
kommen, und den Wert beim ersten Speichern durch die Vorgabe zu ersetzen wäre
ein Datenverlust, den niemand bemerkt, weil `16-9` gültig aussieht. Wer zeichnen
muss, fragt `istFolienformat()`.

**Und der Prompt behauptete „(16:9)".** Er nennt die Folienmaße aus der Bindung
und daneben stand das Verhältnis als fester Text — mit einem Format je Deck wäre
das ein Prompt, der dem Modell zwei Wörter weiter etwas anderes sagt als die
Zahlen davor. Er wird jetzt gerechnet. Wer zu viel verspricht, bekommt vom
Modell Koordinaten für eine Folie, die es nicht gibt, und der Fehler steht dann
bei dem, der den Prompt befolgt hat.

**Eine Frage, die immer kommt, ist keine.** Die Wahl des Folienformats steht
jetzt im Inspektor, und mit ihr die eine Richtung, die etwas verlieren kann:
beide A4-Formate sind höher als 16:9, umzustellen kann also nichts wegschieben
— der Rückweg legt Elemente unter die Kante, wo keine Ausgabe sie zeigt und
kein Klick sie trifft. Gefragt wird deshalb **nur beim Verkleinern und nur,
wenn wirklich etwas betroffen ist**, mit der Zahl, die zutrifft. Dieselbe Linie
wie bei `darfErsetzen()`: eine Frage, die man nur wegklicken kann, liest beim
dritten Mal niemand mehr.

Umgerechnet wird dabei nichts — die Koordinaten hat jemand gelegt, und sie
automatisch zu stauchen wäre der zweite Weg, eine Folie zu setzen. Die Schwelle
ist `minElementSize`, derselbe Wert, mit dem `clampToSlide()` ein gezogenes
Element auf der Folie hält.

Der Rauchtest prüft **beide** Richtungen: dass beim Verkleinern gefragt wird
*und* dass beim Vergrößern nicht gefragt wird. Ohne die zweite Hälfte bestünde
er auch für einen Dialog, der immer kommt — und der wäre schlimmer als keiner.

Und die Prüfung dazu ist beim ersten Anlauf an etwas gescheitert, das hier
schon dokumentiert ist: sie trennte ihre Probefolien mit `- - -`. Das ist genau
die Schreibweise, die der Serialisierer benutzt, *damit* sie kein Folientrenner
ist. Herauskam ein einziges Folienobjekt, und die Prüfung meldete, es liege
nichts unter der Kante.

**Zwei Fehler des Folienformats fand kein Test, sondern ein Bildschirmfoto.**
Nach drei Schritten war alles grün: Naht, Dateiformat, Wahl im Inspektor,
vierzig Prüfdateien, neunundfünfzig Handgriffe im Browser. Dann einmal ein
A4-Deck aufgemacht und angesehen — und zwei Dinge standen falsch da.

*Das Handout verlor seine erste Notizzeile.* Die Seite ist so breit wie die
Folie und mal Wurzel zwei hoch; ein Deck im Format `a4-hoch` ist damit genau so
hoch wie das Blatt, und unter der Folie ist kein Platz. Gemessen: die erste
Zeile stand bei y = 1899 auf einem 1810 hohen Blatt, also auf keiner Seite des
PDF. Die Regel „die erste Zeile einer Seite wird nie umgebrochen" gilt für eine
*Notizseite*, auf der es keinen besseren Ort gäbe — die Folienseite hat einen,
nämlich die nächste.

*Die Kacheln des Filmstreifens wurden abgeschnitten.* Sie rechneten ihre Höhe
aus einer festen Breite; hochkant sind das 187 Pixel in einem 104 Pixel hohen
Streifen. Der Streifen gibt seine Höhe vor, also ist sie die feste Größe und
die Breite folgt. Die Zahl ist so gewählt, dass sich für ein 16:9-Deck nichts
ändert.

**Und was ich für den Fehler hielt, war keiner.** Erwartet hatte ich, dass die
mittig gesetzten Layouts auf einem hohen Blatt verloren aussehen; nachgesehen
stimmt es: eine Titelfolie hat unten viel Luft. Nur ist das die ehrliche Folge
davon, dass frei gelegte Elemente ihre Koordinaten behalten und der Fließtext
in einem höheren Rahmen mittig steht — dagegen eine Regel zu erfinden, hieße
das Layout für ein Format umzudeuten. Die Übersicht, die Fußzeile, der
Satzspiegel und das Zoomen auf „Passend" waren durchweg richtig.

**Die Maskierung versprach wohlgeformtes XML und hielt es nur halb.**
`ohneSteuerzeichen()` fing die C0-Steuerzeichen — die Zeichenproduktion von
XML 1.0 verbietet aber zwei weitere Gruppen: **einsame Ersatzstellen**
(U+D800…U+DFFF) und die Nichtzeichen U+FFFE und U+FFFF. Beide kamen durch, und
die Folge ist dieselbe wie beim ersten Fall: die exportierte `.svg` öffnet
nicht, und der PNG-Weg scheitert mit „Das SVG ließ sich nicht als Bild laden" —
derselbe Satz, aus einer anderen Ursache, und danach sucht niemand ein zweites
Mal. Sie heißt jetzt `ohneVerboteneZeichen()`.

Ein *Paar* von Ersatzstellen bleibt heil, und das ist der Grund für die Bauart:
`for…of` läuft über Codepunkte, ein Emoji ist damit ein Zeichen ≥ U+10000, und
nur eine übrig gebliebene Hälfte landet im verbotenen Bereich. Wer hier über
`charCodeAt` liefe, zerschlüge jedes Emoji — die Gegenrichtung steht deshalb
als eigene Zusicherung daneben.

**Und die Prüfung dazu hat sich zuerst die tolerierte Anordnung ausgesucht.**
Geschrieben stand `Hallo\ud800Welt`, mitten im Wort — und der Parser von jsdom
nahm das klaglos an. Die Gegenprobe blieb grün, obwohl das Zeichen
nachweislich im Markup stand; erst freistehend, als eigener Textlauf, wird es
abgelehnt. Gefunden hat das nicht der Test, sondern die Frage, warum die
Sabotage nichts tat.

**Zwei Konstanten für dieselbe Tatsache — und ein Kommentar, der das Gegenteil
behauptete.** `DIN_HOCH` stand in `scene.ts` und in `theme/folienformat.ts`,
und der Kopf der zweiten schrieb aus, sie stehe dort, „weil zwei Konstanten für
dieselbe Tatsache früher oder später auseinanderlaufen". Der Satz war richtig,
die Tat fehlte: `scene.ts` behielt seine eigene. Jetzt importiert es.

**Zwei Wege zeichnen dieselbe Folie, und nichts hielt sie zusammen.** Die
Fläche ruft `buildSlideBackdrop`, `buildElementPrims` und `buildSlideChrome`
einzeln; der Export ruft `buildSlideScene`, das dieselben drei zusammensetzt.
Liefen sie auseinander, sähe man es nicht auf dem Bildschirm und nicht in der
Datei, sondern nur im Vergleich — also nirgends. Eine Zusicherung hält beide
jetzt an jedem mitgelieferten Deck gegeneinander.

Dieselbe Sorte Wächter für den PPTX-Weg, aber über **Wörter** statt über
Positionen: was im SVG steht, muss auch in der `.pptx` stehen. Drei Fehler
dieses Repos hatten genau diese Bauart — die Beschriftung einer Form fiel
heraus, Tabellenzellen standen zu groß, ein Kartenlabel doppelt —, und keine
der vorhandenen Prüfungen sah sie: sie greifen einzelne XML-Knoten heraus, und
was gar nicht da ist, hat keinen Knoten.

**Ein kaputtes Bild nahm den Rest der Folie mit.** „Füllend" klemmt den
Überstand ab — `saveGraphicsState()`, ein Pfad, `clip()` —, und das
`restoreGraphicsState()` stand hinter dem `addImage` im `try`. Warf das, und
genau darauf ist der `catch` daneben gebaut („ein falsch angemeldetes Format,
eine beschädigte Datei"), blieb die Klemme stehen: alles, was danach auf der
Seite gezeichnet wird, liegt im Rechteck des kaputten Bildes und ist nicht zu
sehen. Gemessen am Operatorenlauf: `save · clip · showText · restore`, die
Textzeile also innerhalb der Klemme.

Der Satz über dem `catch` stimmt weiterhin — ein kaputtes Bild darf den Export
nicht abbrechen. Nur hat es dabei die halbe Folie mitgenommen, und das ist
schlimmer als ein Abbruch: **der Abbruch sagt es.** Aufgehoben wird der
Beschnitt jetzt im `finally`.

Geprüft wird am **Operatorenlauf** und nicht am Text: `getTextContent()` liest
den Inhaltsstrom und meldet die Zeile auch dann, wenn eine Klemme sie
unsichtbar macht. Nur die Reihenfolge sagt es.

**Und für den Text im PDF gab es keine Zusicherung über seinen Ort.** Drei
Fehler dieses Repos waren „zwei Ausgaben, zwei Stellen"; der PDF-Weg rechnet
die Position selbst, teilt Läufe an Schriftgrenzen und misst den Vorlauf mit
`measureText()` — und niemand hielt das je gegen die Szene. Verglichen wird
jetzt der **Zeilenanfang**: pdfjs fasst Läufe zusammen und zerlegt eine
gesperrte Zeile in einzelne Zeichen, aber der erste Eintrag einer Zeile beginnt
in beiden Fällen dort, wo die Szene sie ansetzt. Nachgemessen stimmen alle
Zeilen beider mitgelieferter Decks.

**Was nachgemessen wurde und richtig ist: das Abflachen halbdurchsichtiger
Flächen.** Der Kopf von `drawText` begründet, warum Text *nicht* gegen den
Folienuntergrund verrechnet wird — für Flächen und Striche gilt es weiter, und
die Frage war, ob dabei gegen den falschen Grund gerechnet wird. Zwei
Messungen: in den mitgelieferten Decks gibt es drei Sorten halbdurchsichtiger
Nicht-Text-Primitive, alle auf dem Untergrund, gegen den sie verrechnet werden;
und über alle Elementarten, Töne, Füllungen und Untergründe gibt es **keine**
Kombination, in der ein solches Primitiv auf einem eigenen, andersfarbigen
Körper liegt. Der Fall, der beim Text falsch war, ist hier nicht erreichbar.

**Neun Zeichennamen, und alles andere stand da, wie es geschrieben war.**
`decodeEntities()` führte eine getippte Liste von neun Paaren; `&uuml;` kam
damit als `&uuml;` auf die Folie, in jeder Ausgabe, ohne ein Wort. Ein
Markdown-Leser, der nach HTML setzt, zeigt dort „ü" — der Browser übersetzt für
ihn, und wer aus einem Redaktionssystem einfügt, bekommt genau diese
Schreibweise. Übersetzt werden jetzt der ganze **Latin-1-Block** und **jede
Zahl** in beiden Schreibweisen; die sechsundneunzig Namen sind dabei
*gerechnet* und nicht getippt — der n-te Name gehört zu U+00A0 + n. Eine
getippte Liste wäre wieder das, was vorher dastand.

Vollständig ist es damit nicht: HTML5 kennt 2231 Namen, und die mitzuschleppen
hieße, hundert Kilobyte für einen Fall auszuliefern, den ein Deck nie hat. Was
fehlt, bleibt deshalb **stehen und wird nicht erraten** — dieselbe Linie wie
beim unbekannten `theme:`: den Wert behalten, die Lücke zeigen. Und eine Zahl,
die gar kein XML-Zeichen benennt (`&#0;`, `&#xD800;`), bleibt ebenfalls
sichtbar: übersetzt schnitte `ohneVerboteneZeichen()` sie beim Schreiben der
`.svg` wieder heraus, und aus einer sichtbaren Angabe würde eine unsichtbare.
Geprüft werden die **Ränder** des Blocks und drei Stellen darin — eine um eins
verschobene Namensreihe übersetzt weiterhin, nur eben falsch.

**Ein weicher Umbruch kam als rohes `\n` bis in die Ausgaben.** Eingeebnet
wurde er dreimal am Ende: im PPTX-Weg von `flattenWhitespace()`, auf der Fläche
vom Browser, der ein `\n` im `<tspan>` wie ein Leerzeichen misst — und die
vierte Einebnung fehlte. Die Ersatzmessung der Tests gibt `\n` eine andere
Breite als dem Leerzeichen (8,48 gegen 4,5), also brach **jede Prüfung ohne
Canvas an einer anderen Stelle um als der Browser**. Drei Rechnungen für
dieselbe Tatsache, und man sieht es nur im Vergleich. Eingeebnet wird jetzt in
`laufText()`, wo der Lauf entsteht.

**Ein Einzug, der die Breite auffrisst, ergab ein negatives Maß.** Ein sechs
Ebenen tiefer Listenpunkt schiebt den Einzug über die Elementbreite hinaus, und
`this.width - indent` wurde negativ. Gemessen kam die Codeplatte als `<rect
width="-6.4">` heraus — im SVG ein Fehlerwert, den kein Betrachter zeichnet —,
und im PPTX-Weg wird daraus ein `<a:ext cx="-…">`, das die Datei gegen ihr
eigenes Schema stellt. Fünf Stellen rechneten so; sie fragen jetzt `platz()`.
Der Überlauf selbst bleibt: der Inhalt läuft über die Kante, wie im Browser
auch, und eine Regel dagegen wäre erfunden. Nur die Maße bleiben Maße.

**Eine Abbildung im Listenpunkt fiel aus jeder Ausgabe.** Der Zerleger stand
nur im Absatz-Zweig; ein Listenpunkt reicht seine Kinder an `flattenInline()`
weiter, und dort wird aus einem `image`-Token stillschweigend ein *kursiver
Lauf mit dem Alternativtext*. Aus `- ![Logo](logo.png)` wurde damit „Logo" in
Kursiv — in allen drei Schreibweisen, auch der, in der das Bild allein im Punkt
steht. Wörtlich „Eine Abbildung wurde nur erkannt, wenn sie allein im Absatz
stand", eine Einrückung weiter: die Reparatur von damals hat die zweite Stelle
nicht mitgenommen, weil es sie als eigene Rechnung gab. Zerlegt wird jetzt in
`absatzteile()`, und beide fragen dieselbe.

Was ausdrücklich bleibt: in einer **Überschrift** und in einer
**Tabellenzelle** wird ein Bild weiter zum kursiven Alternativtext. Beides ist
kein Blockfluss — eine Abbildung mitten in einer Zellenreihe hätte keinen Ort
—, und der Text ist dort das, was von der Angabe übrig bleibt, nicht ihr
stiller Verlust.

**Die gemeldete Breite versprach die breiteste Zeile und lieferte weniger.**
`TypesetResult.width` wurde nebenher gebucht, an fünf Stellen von Hand, und die
Linie, die Codeplatte, der Zitatbalken und der Marker hakten nicht ein: ein
Codeblock über die volle Breite meldete 105,6 von 600. Gelesen hat die Zahl
niemand — und genau das ist die Falle, nicht ihre Entschuldigung: ein falscher
Wert, den keiner liest, ist ein Wert, den der Nächste liest. Gemessen wird
jetzt am fertigen Primitiv, und die Zeile darüber sagt, was die Zahl meint —
dass eine Linie und eine Codeplatte die angebotene Breite *nehmen* und nicht
*fordern*.

**Der PPTX-Weg setzte das Markdown-Element in einer anderen Stufe als die
Folie.** `baseStyle: 'small'` stand dort, wo die Szene den Grundstil `body`
nimmt: 13 gegen 16, also fast ein Viertel kleiner — und dazu gar keine
Ausrichtung, ein mittig gesetztes Element stand linksbündig. Gesehen hat es
niemand, weil das einzige Markdown-Element der mitgelieferten Decks aus einer
Überschrift und einer Tabelle besteht; beide tragen ihre eigene Stufe, und der
Grundstil kommt darin nicht vor. Die Vorgabe steht jetzt als `GRUNDSTIL` in
`typeset.ts`, und beide Wege lesen sie.

**Ein Innenabstand, den nur die Datei kannte.** `scene.ts` rechnet für `text`
und `markdown` `inner = fill === 'none' ? 0 : padding` — ein Abstand braucht
eine Kante, an der er messbar ist, und `nutztInnenabstand()` sagt dasselbe.
`textBox()` im PPTX-Weg nahm dagegen immer den Abstand. Beide Arten kommen mit
`fill: 'none'` aus der Fabrik, es traf also den Normalfall: gemessen an einem
Markdown-Element bei x = 100 mit 600 Breite und 40 Abstand setzt die Folie bei
100 auf 600, die `.pptx` bei 140 auf 520 — nicht nur verschoben, sondern auch
anders umbrochen.

**Ein Abzeichen, eine Einheit zu klein.** Die Szene setzt es in `label` und
deckelt auf 40 % der Höhe, damit ein flaches Abzeichen seine Versalien nicht
über die eigene Kante schiebt; der PPTX-Weg schrieb `labelSmall`, ungedeckelt.
Das traf **jedes** Abzeichen beider mitgelieferter Decks — auf der Folie 12, in
der Datei 11 —, und es traf auch den Vorlauf für das Icon, der aus derselben
Größe gerechnet wird. `abzeichenGroesse()` ist jetzt die eine Rechnung mit drei
Kunden.

**Ein gedrehter Textrahmen drehte sich um die falsche Mitte.** PowerPoint dreht
eine Form um die Mitte *ihres eigenen* Rahmens, `elementMatrix()` dreht jedes
Element um dessen Mitte. Solange der Textkasten mit dem Element konzentrisch
ist — gleicher Abstand ringsum —, ist das dasselbe, und für ein schlichtes
Text- oder Markdown-Element stimmte es deshalb. Sobald ein Icon, ein
Ziffernquadrat oder eine Tabellenüberschrift den Kasten verschiebt, nicht mehr.
Gemessen bei 30°: die Ziffer einer Schritt-Karte lag 70 Einheiten neben ihrem
Quadrat, die Überschrift einer Tabelle 33,5, die einer Karte mit Icon 13,5, der
Text eines Abzeichens mit Icon 6,3.

Der Kasten wird deshalb dorthin gelegt, wo ihn PowerPoints eigene Drehung
hinbringt — dieselbe Rechnung wie in `scenenTextShape()` und `jsPdfEcke()`, zum
dritten Mal aus demselben Grund. Geprüft wird an der Stelle, an der der Text
landet, und nicht am Rahmen: der Inhalt sitzt unverändert im Kasten, der Kasten
liegt bei 30° woanders, gedreht wird um dessen Mitte. Die erste Fassung der
Prüfung verglich die Rahmenmitte mit einer Grundlinie und meldete deshalb an
einem *richtigen* Element eine Abweichung von 204.

**Alle Absätze rutschten über alle Tabellen.** Dass eine Tabelle nicht im
Textfluss stehen kann, ist eine Eigenschaft des Formats — in PowerPoint ist sie
ein eigener Rahmen. Dass deshalb der ganze Fließtext nach oben und alle
Tabellen nach unten sortiert wurden, war keine: bei „Text davor / Tabelle /
Text danach" stand die Erklärung in der `.pptx` über dem, was sie erklärt.
Gestapelt wird jetzt in der Reihenfolge des Textes, nach einer mit `wrapRuns()`
gemessenen Höhe — also mit dem Umbruch des Setzers und nicht mit einer zweiten
Rechnung.

Und der Zweig mit Tabelle gab gar keinen Anker mit. Fünf der sechs Layouts
setzen ihren Fließtext mittig; die Folie zeigte den Satz in der Mitte, die
`.pptx` oben am Satzspiegel. Ausgerichtet wird jetzt der ganze Stapel, über
`flowOffsetY()` — dieselbe Funktion, mit der die Szene ihn ausrichtet.

**Zwei erfundene Zahlen im Listeneinzug.** `marL` stand auf `level * 24 +
round(size * 1.1)`; weder die 24 noch die 1,1 stehen in einer Leiter der CI.
Der Setzer stellt seine Marke in einen Streifen von 1,35 Geviert und schreibt
dahinter weiter — damit steht der Punkt eines Eintrags auf `level * Streifen`
und sein Text auf `(level + 1) * Streifen`. `listenEinzug()` ist jetzt die eine
Rechnung, und geprüft wird nicht gegen die Formel, sondern gegen die Stelle, an
der das SVG den Text zeigt: 109,6 und 131,2 in beiden Ausgaben.

**Was nachgemessen wurde und in Ordnung ist.** Jeder Zahlenwert des Pakets
liegt im erlaubten Bereich seines Schemas — Versätze, Ausdehnungen,
Schriftgrößen, Strichstärken, Spaltenbreiten, Zeilenhöhen, Deckkraft,
Zeilenabstände, Einzüge —, und zwar für beide mitgelieferten Decks. Die Farbe
jedes Wortes stimmt zwischen SVG und `.pptx` überein. Und beide Pakete gehen
durch LibreOffice: sechs plus fünf Seiten, angesehen und richtig.

**Der Verweis wurde überall ersetzt, wo er dastand.** `inlineImageHrefs()`
schrieb `out.split(escapeXml(src)).join(entry.dataUrl)` über das ganze Markup,
und das hat zwei Folgen, die beide gemessen sind. Der Pfad wurde auch dort
ersetzt, wo er **Text** ist: eine Folie, die zeigt, wie man ein Bild einbindet
— also ein Codeblock mit `![Alt](logo.png)` —, trug danach ein bis zwei
Megabyte Base64 als Fließtext, im SVG wie in jeder Ausgabe, die daraus
entsteht. Und er wurde **innerhalb eines längeren Pfades** ersetzt: sind
`logo.png` und `bilder/logo.png` beide im Deck, wird aus dem zweiten
`href="bilder/data:image/png;base64,…"`. Der Verweis ist tot, seine eigene
Daten-URL wird nie eingesetzt, und im PNG fehlt das Bild — ohne ein Wort, denn
geladen war es ja. Gesucht wird jetzt der **ganze Attributwert**, und die
Daten-URL wird maskiert wie jeder andere: dass eine gerasterte URL nur Base64
enthält, ist heute wahr und wäre morgen eine Annahme über eine fremde Funktion.

**Ein Strich unter nichts.** Die Läufe ohne Text fielen aus den `<tspan>`
heraus, aus den Unter- und Durchstreichungen nicht: ein leerer Lauf mit
Unterstreichung ergab ein `<rect width="0">`, und ein Textprimitiv, dessen
Läufe alle leer sind, ein `<text></text>` samt Gruppe. Gefiltert wird jetzt
einmal, und beide Hälften lesen dasselbe Ergebnis.

Und die Prüfung dazu überlebte ihre eigene Gegenprobe. Sie führte nur den
*ganz* leeren Fall — und den fängt schon der frühe Ausstieg, nicht der Filter,
um den es geht. Rot wird sie erst an dem Fall, der wirklich daran hängt: ein
leerer Lauf **neben** einem mit Text.

**Zwei Regeln für dieselbe Deckkraft.** `paintAttrs()` schreibt `opacity` nur,
wenn es kleiner als 1 ist; das Bild schrieb es, sobald es überhaupt gesetzt
war. Jedes Bild trug damit ein `opacity="1"`, das kein Rechteck trug. Nichts
war zu sehen, und genau das ist die Sorte Unterschied, die man später für
Absicht hält.

**`default: return ''` war ein stiller Löschbefehl, zum dritten Mal.** Der
Ausdruck über die Primitivarten fiel bei einer unbekannten Art auf eine leere
Zeichenkette zurück — eine sechste Art wäre im SVG ersatzlos verschwunden, auf
der Fläche *und* in der Datei, denn beide gehen durch dieselbe Funktion. Die
Zuweisung an `never` bricht jetzt schon `tsc` ab; der Wurf darunter ist das
Eingeständnis, dass die Zeile unerreichbar sein soll. Dieselbe Zusicherung
steht im PDF-Weg, dessen `switch` alle fünf Fälle aufzählte und trotzdem keinen
sechsten bemerkt hätte. Belegt ist es nicht mit einem Testfall, sondern mit dem
Übersetzer: eine sechste Art in `ScenePrim` macht beide Stellen rot.

**Und der einzige englische Satz in einer ausgelieferten Datei.** Das SVG
schrieb `<desc>Exported from …</desc>`; PDF und PPTX legen nur den Produktnamen
in ihre Metadaten. Wer eine `.svg` in einem Zeichenprogramm öffnet, liest den
Satz dort — eine Oberfläche auf Deutsch und eine Datei auf Englisch sind zwei
Sprachen für dieselbe Sache. Er heißt jetzt „Erzeugt mit …".

**Was nachgemessen wurde und in Ordnung ist.** Jedes SVG beider mitgelieferter
Decks ist wohlgeformt und trägt keinen unendlichen Wert — jede Folie, der
Kontaktbogen und jede Seite jedes Handouts. Dasselbe gilt für neun feindselige
Eingaben: spitze Klammern, Anführungszeichen, ein rohes `&`, eine einsame
Ersatzstelle, die Nichtzeichen, Steuerzeichen, ein Emoji, arabischer Text und
ein Wort aus zweitausend Buchstaben. Und die Maskierung von Alternativtext und
Verweis hält in allen vier Richtungen, die dabei zählen: Anführungszeichen und
spitze Klammern im Alternativtext, `&` und `'` im Pfad.

**Ein `trimEnd()` nahm einem Wert sein letztes Leerzeichen.**
`buildSlideMetaBlock()` räumte den YAML-Rumpf auf, bevor er ihn in den
Kommentar setzte — und nahm mit dem Zeilenumbruch auch ein Leerzeichen mit, das
zum *Wert* gehört. js-yaml schreibt einen langen Text als gefalteten
Blockskalar (`text: >-`), und dessen letzte Zeile endet dann mit dem
Leerzeichen, mit dem der Wert endet. Gemessen an einer Notiz aus vier Sätzen:
308 Zeichen hinein, 307 zurück — ein Zeichen, bei jedem Sichern, ohne ein Wort.
Der Schreiber ist dabei nicht schuld: `dumpYaml → load` ist für denselben Text
verlustfrei; es war das Aufräumen danach. Abgeschnitten wird jetzt genau der
eine Umbruch.

**Und sonst kam `deck.ts` sauber heraus — das ist der Befund.** Zweiundzwanzig
feindselige Dateien, beide mitgelieferten Decks, jeder Wert jedes Feldes jeder
der elf Elementarten, jedes Maß (krumm, negativ, riesig) und dreizehn von Hand
geschriebene `nzl`-Blöcke: der Rundlauf ist überall ein Festpunkt, kein Modell
wandert, keine Zahl wird unendlich, nichts wirft. Was fehlte, war nicht die
Reparatur, sondern das Netz: die Prüfungen darüber sind Einzelfälle, jeder aus
einem Fehler entstanden, und keiner sagte etwas über die *Fläche*.

Zwei Dinge, die dabei zu lernen waren. Der Rundlauf-Sweep erreicht
`geschuetzterFliesstext()` **nicht** — ein `---` im Fließtext kommt nur ins
Modell, wenn es aus dem Editor stammt, und aus einer Quelle gelesen ist es
längst ein Trenner. Das deckt die ältere Prüfung daneben ab, und die Gegenprobe
zeigt, dass sie es tut. Und eine Gegenprobe an einer *Vorgabe* muss den Wert
wirklich fallen lassen: `keepIfChanged(..., 16)` statt `defaultPadding[kind]`
schreibt nur *mehr* in die Datei und ändert nichts — rot wird die Prüfung erst,
wenn der Schreiber den Wert ganz weglässt.

**Der Strich unter einem Wort lag im PNG woanders als im SVG.** Unter- und
Durchstreichung sind keine Glyphen; jede Ausgabe zieht sie selbst — und jede
zog sie anders: `svg.ts` nahm `max(0.8, size · 0.058)` bei `size · 0.13`, der
Umriss-Weg `max(1, size · 0.055)` bei `size · 0.14`. Gemessen an einem Link in
16 Einheiten: das SVG setzt ihn auf y = 90,64 mit 0,928 Dicke, der Umriss auf y
= 90,80 mit 1,00 — und der Umriss ist das, was im PNG steht. Bei kleiner
Schrift wächst der Unterschied auf ein Viertel, weil die beiden Untergrenzen
verschieden sind. `laufStriche()` ist jetzt die eine Rechnung, und geprüft wird
an beiden Ergebnissen: das SVG-Rect gegen die Hülle des Umriss-Pfades, für drei
Größen und beide Striche.

**Und was im Export herausfällt, sagte niemand.** Ein Zeichen, das keine der
Marken-Schriften führt, bekam ein `console.warn` — dieselbe Stille wie beim
leeren `catch` der Selbstsicherung und beim fehlenden Bild: die *Politik*
stimmt, ein fehlendes Zeichen darf keinen Export abbrechen, das Schweigen
nicht. Der zweite Fall stand überhaupt nirgends: kommt die `.ttf` eines
Schnitts nicht an — der wahrscheinlichste Grund ist ein eigenes
Erscheinungsbild, das nur die `.woff2` mitliefert —, bleibt sein Text
unkonvertiert. Gemessen: mit fehlendem Zilla Slab steht die Überschrift danach
als *Text* in der Szene, und im PNG malt sie die Vorgabeschrift des
Betrachters, denn ein über eine Blob-URL geladenes SVG sieht die Schriften der
Seite nicht. Das sieht aus wie ein Fehler des Werkzeugs und ist eine fehlende
Datei.

Gemeldet wird über `beiAusfallImExport()`, an genau *einer* Stelle:
`glyphCoverFor()` hat zwei Kunden, den Umriss-Weg und den PDF-Weg, und beide
bekommen die Meldung damit umsonst. Die Naht liegt wie bei den Bildern im
Sitzungsstart — `lib/` kennt `state/` nicht.

**Was nachgemessen wurde und in Ordnung ist.** Die Drehung eines Textprimitivs
ist im Umriss-Weg exakt: 106 Punkte, größte Abweichung 0,000000 gegen die
Drehung derselben Punkte um (x, y). Zusammengesetzte Zeichen stimmen — `ü` hat
dieselbe Breite und denselben Anfang wie `u` und nur mehr Höhe, `ä`/`a` und
`é`/`e` ebenso, `ß` ist ein eigenes Zeichen. Und die Ersatzkette greift: `⌘`
und `⌫` in einem Space-Mono-Lauf kommen aus Inter, kein Lauf bleibt als Text
stehen.

**Ein `Z` mit einer Zahl dahinter drehte sich, bis der Speicher überlief.**
Jeder Befehl des Pfad-Lesers verbraucht mindestens eine Zahl und kommt damit
voran — `Z` verbraucht keine. Stand hinter ihm eine Zahl, lief die Schleife
weiter, ohne den Zeiger zu bewegen: gemessen **34,8 Sekunden**, dann
`RangeError: Invalid array length`. Im Browser ist das ein eingefrorener Tab
und ein Gigabyte Speicher auf dem Weg. Nach einem `Z` ist eine Zahl jetzt ein
Fehler mit Namen.

**Und die Flaggen eines Bogens sind einzelne Ziffern, keine Zahl.** `a5 5 0
0110 0` heißt largeArc=0, sweep=1, x=10; der Leser zerlegte den Pfad vorweg in
eine Wortliste, las daraus die 110 und brach mit „Invalid number in path data:
undefined" ab. Das ist keine Schrulle, sondern genau das, was SVGO schreibt —
die Datei eines Logos sieht in aller Regel so aus. Der Wurf landet in
`pathSegs()`, also in einem `useMemo` beim Zeichnen: **weißes Fenster**.
Gelesen wird jetzt mit einem Zeiger statt mit einer Wortliste, und die Flaggen
zeichenweise.

**Und die Prüfliste sah die Pfaddaten nie an.** Für die Wortmarke prüfte sie
Größe, viewBox und Füllfarben — nie, ob aus dem `d` überhaupt eine Kurve wird.
Eine Datei mit einem unlesbaren Pfad kam grün durch und nahm beim Zeichnen die
Seite mit; dieselbe Bauart wie das weiße Fenster nach einer fremden `.json`.
Sie liest die Pfade jetzt wirklich — mit `parsePath()`, also mit dem Leser, der
beim Zeichnen urteilt, und nicht mit einer nachgebauten Regel.

**Eine Zahl wurde nicht gelesen, sondern freigeschnitten.** `zahlAus` warf
alles weg, was keine Ziffer, kein Komma, kein Punkt und kein Minus war — und
das ist etwas anderes als lesen: es macht aus *jeder* Zelle eine Zahl. Gemessen
am fertigen SVG stand über dem Balken „13", wo in der Zelle „1e3" steht, und
„1,2" für „1,23E+09" — die Schreibweise, in der eine Tabellenkalkulation große
Zahlen ausgibt. Eine mit Komma getrennte Zeile („Region,12") wurde zu 0,12 ohne
Beschriftung: aus einer eingefügten CSV-Datei ein Diagramm aus lauter Nullen.
Und ein Bindestrich im Namen wurde zum Vorzeichen — „Nord-West 12" zeichnete
einen Balken nach unten.

Gesucht wird jetzt die Zahl, und es muss **genau eine** in der Zelle sein.
Zierrat davor und dahinter darf weiter — ein Eurozeichen, ein Prozent, eine
Einheit —, solange keine Ziffer darin steht; „12 - 15" ist damit keine Zahl und
„1e3" auch nicht. Geprüft wird bis ins SVG: der Text am Balken muss der sein,
den der Leser zurückgibt.

**Und was dabei herausfiel, sagte niemand.** Eine Zeile ohne lesbare Zahl fiel
wortlos heraus — die Reihe hatte einen Balken weniger, und wer nicht
nachzählte, merkte es nie. Denselben Satz trägt diese Liste schon zweimal: beim
leeren `catch` der Selbstsicherung und beim fehlenden Bild im Export. Die
Politik stimmt — eine kaputte Zeile darf ein Diagramm nicht verhindern —, das
Schweigen nicht. `liesChart()` gibt jetzt beides zurück, und es ist *eine*
Rechnung mit zwei Kunden: der Zeichner nimmt `punkte`, der Inspektor
`ungelesen` und nennt die erste betroffene Zeile beim Namen.

Daran hängt eine Stelle, die keine Zusicherung in `chart.test.ts` zeigt: die
Rechnung kann stimmen und der Inspektor sie trotzdem nicht rufen. Der
Rauchtest tippt deshalb wirklich eine unlesbare Zeile und liest, was in der
Leiste steht — in beide Richtungen, denn eine Warnung, die immer dasteht, ist
keine.

**`Math.max(...werte)` ist eine Argumentliste, und die ist begrenzt.** Ab rund
130.000 Werten warf `chartScale` `RangeError: Maximum call stack size
exceeded`. So viele Zeilen hat eine eingefügte Tabellenkalkulation nicht oft,
aber sie kann sie haben — und die Rechnung läuft beim Zeichnen in einem
`useMemo`, das wäre ein weißes Fenster wie beim Bogen mit den
zusammengeschriebenen Flaggen. Gerechnet wird jetzt in einer Schleife.

**Eine Zeile aus Strichen war ein stiller Löschbefehl.** `parseTable` suchte
die Ausrichtungszeile (`---`, `:---:`, `---:`) in *jeder* Zeile und ließ sie
fallen. Damit verschwand jede Zeile, deren Zellen alle aus Bindestrichen
bestehen — und ein Strich ist die verbreitetste Schreibweise für „keine
Angabe". Eine zweite Trennzeile weiter unten stellte obendrein die Ausrichtung
aller Spalten um. In Markdown steht die Zeile aus Strichen genau einmal, unter
der Kopfzeile; was weiter unten wie eine aussieht, ist Inhalt. Den Wert
behalten, die Lücke zeigen — dieselbe Linie wie beim unlesbaren `nzl`-Block.

**Ein Einzug, den jede Zeile trägt, wurde eine leere Spalte.** Links wird
absichtlich nicht beschnitten, und der Grund steht weiter oben in dieser Liste:
bei Tabulatoren und der Zwei-Leerzeichen-Schreibweise *ist* der führende
Trenner eine leere erste Zelle. Ein Einzug, den **jede** Zeile hat, ist aber
keiner — eine eingerückt eingefügte Tabelle bekam vorn eine Spalte, die Platz
nimmt und nichts zeigt. Der Unterschied hängt an dem Wort „gemeinsam": der
Fall, für den das Nicht-Beschneiden gebaut ist, hat in der ersten Zeile keinen
Einzug, und damit ist der gemeinsame leer.

**Und der Prompt versprach im selben Atemzug zu viel.** Er nannte die
Trennzeile, ohne zu sagen, wo sie steht, und schwieg dazu, was in der Zelle mit
der Zahl stehen darf. Ein Modell, das sich daran hält, bekäme eine Zeile, die
nicht gezeichnet wird — und der Fehler stünde bei dem, der den Prompt befolgt
hat. Beides steht jetzt darin.

**Was nachgemessen wurde und so bleibt.** Ein Komma trennt in beiden Lesern
nicht — es ist das deutsche Dezimalzeichen, und „1,5" muss eine Zahl bleiben;
eine mit Komma getrennte Zeile hat deshalb weiterhin keine Beschriftung. Der
Tabellenleser kennt das Semikolon nicht, der Diagrammleser schon: dort steht
die Zahl hinten, und ein Semikolon in der Beschriftung kostet nur den
Strichpunkt, während es in einer Tabellenzelle mitten im Satz vorkommt. Und die
Trennzeile gilt auch bei `header: false` an zweiter Stelle — eine
hereinkopierte Markdown-Tabelle trägt sie dort, ob man ihre erste Zeile als
Kopf liest oder nicht.

**Zwei Merker für dieselbe Frage, und nur einer verfiel.** `overflowOf()` legt
sein Ergebnis in einer `WeakMap` am Element-Objekt ab — richtig, solange nur
das Element das Maß bestimmt. Drei Dinge bestimmen es außerdem, und keins davon
fasst das Element an: die echte Schrift (sie kommt erst nach dem ersten
Zeichnen an), das Erscheinungsbild (andere Typo-Leiter) und eingetroffene
Bildmaße. `announce()` in `fonts.ts` räumt bei genau diesen Anlässen den
*Messpuffer*; der Merker des Überlaufs blieb stehen. Gemessen an einer h1 in
einem 300 × 60-Kasten: unter nozilla 417 Einheiten Überlauf, unter dem
Musterkunden 307 — angezeigt wurden weiter 417. In beide Richtungen: ein
Fehlalarm, der nicht weggeht, und ein wirklicher Überlauf, der nie erscheint.

Und die zweite Hälfte hätte den Fix allein wirkungslos gemacht: die `useMemo`
in `CanvasStage`, die die Balken rechnet, hing nur an `slide.elements` — sie
hätte gar nicht erst nachgefragt. Dieselbe Bauart wie beim Folienformat („Ein
Effekt läuft nach dem Zeichnen"), nur an drei Zählern statt an einem.
`SlideView` liest alle vier seit je; die Fläche daneben las einen.

**Ein Bild im Fließtext eines Elements zählte nicht.** `untersteKante()` sah
nur Textprimitive, und der Kopf daneben begründet das: Flächen, Rahmen und
Zeichen werden aus dem Kasten heraus gezeichnet und können ihn nicht
überlaufen. Für alles, was der *Setzer* setzt, gilt das nicht — und ein
Markdown-Element, dessen Inhalt eine Abbildung ist, setzt gar keinen Text.
`untersteKante()` fand nichts, gab `null` zurück, der Überlauf war 0. Gemessen
an `![](logo.png)` in einem 400 × 80-Kasten: das Bild endet 145 Einheiten unter
der Unterkante. Ein Bild*element* bleibt weiter außen vor — das wird
eingepasst.

Daran hing eine zweite Ungenauigkeit: gerechnet wurde **ohne** die Bildmaße,
während die Fläche mit ihnen zeichnet. Das ist „Die Fläche maß Markdown-Bilder
anders als der Export" zum zweiten Mal, und ein Wächter, der ein anderes Bild
misst als das gezeichnete, meldet den Überlauf eines Bildes, das so nirgends
steht.

**Der Fließtext hatte gar keinen Wächter.** Der Überlauf gilt Elementen — und
damit ausgerechnet dem Inhalt nicht, den jede Folie hat. Gemessen an vierzig
Absätzen im `default`-Layout: der Satz endet 831 Einheiten unter der
Folienkante. Auf dem Bildschirm schneidet ihn der Folienrand ab, im PDF steht
er auf keiner Seite, und gesagt hat es nichts. Die Rechnung lag dabei fertig
da: `flowBounds()` misst die gesetzte Höhe, weil das Einsetzen ihr ausweichen
muss.

Gemessen wird gegen den **Satzspiegel** und nicht gegen die Folienkante:
darunter sitzt die Fußzeile, und ein Fließtext, der in sie hineinläuft, ist
schon falsch gesetzt. Es sind aber zwei Fragen, und der Hinweis nennt beide
getrennt — zwischen Satzspiegel und Folienkante steht der Text noch da,
darunter steht er in keiner Ausgabe. Ein Satz, der beides gleichsetzt, ist an
einer der zwei Stellen falsch.

Und die Gegenrichtung ist hier die eigentliche Prüfung: kein Fließtext der
mitgelieferten Decks kommt dem Satzspiegel näher als zwanzig Einheiten. Ein
Wächter, der auf dem eigenen Material anschlägt, wird abgeschaltet und bewacht
dann gar nichts mehr — das steht in dieser Liste schon zweimal, beim
Kontrastwächter und beim Überlaufbalken.

**`flowBounds()` maß ein anderes Bild als die Szene.** Es rief
`typesetMarkdown()` ohne `resolveImageSize`, die Szene ruft es mit — und ohne
die Maße fällt der Setzer auf „volle Spaltenbreite, Verhältnis 0,5625" zurück.
Gemessen an einem 300 × 300-Logo im Fließtext: 762 Einheiten statt 441. Der
Kasten, dem das Einsetzen ausweichen soll, war damit um ein Drittel zu hoch,
und eine eingefügte Karte landete entsprechend zu tief oder gar auf dem
Notplatz am unteren Satzspiegel. Durchgereicht wird der Maßgeber als
**Argument** und nicht als Import: `lib/layout/` käme über `images.ts → svg.ts
→ scene.ts` sonst wieder bei sich selbst heraus.

**Was nachgemessen wurde und in Ordnung ist.** Der Satzspiegel jedes Layouts
liegt in jedem der drei Folienformate innerhalb der Folie, und die Fußzeile
wandert mit der Höhe mit. `unterDerKante()` liest nur `element.y`, und das ist
auch bei einem gedrehten Element richtig: die Drehung geht um die Elementmitte,
der obere Rand des gedrehten Kastens liegt nie tiefer als vorher. Ein Element,
das nirgends mehr passt, landet am oberen Satzspiegel statt außerhalb der
Folie. Und die Unterkante einer Tabelle wird um rund elf Einheiten zu flach
geschätzt — die Linie unter der letzten Zeile liegt unter deren Grundlinie —,
was innerhalb der Nachsicht bleibt und keinen echten Überlauf verdeckt.

**Eine Tabellenzeile war vierzig Einheiten hoch, weil es dastand.**
`TABLE_ROW_HEIGHT = 40` mit dem Kommentar, `a:tr h` sei für PowerPoint ohnehin
nur eine *Mindest*höhe. Für die Zeile stimmt das — für den **Rahmen** nicht:
dessen `cy` ist die Höhe, mit der dieses Werkzeug im Fließtext weiterstapelt.
Gemessen am Setzer: eine einzeilige Zeile ist 34,45 hoch (13 × 1,55
Zeilenabstand plus zweimal 13 × 0,55 Innenabstand), die Datei schrieb 40 — bei
vier Zeilen 22 Einheiten Luft, die die Folie nicht hat. Und sobald eine Zelle
umbricht, ist die Zeile 54,6 oder 74,75 hoch und die feste 40 zu *klein*:
PowerPoint ließ die Zeile wachsen, der Rahmen blieb kurz, und der Absatz danach
rückte in die Tabelle.

`tabellenZeilen()` in `typeset.ts` ist jetzt die eine Rechnung mit zwei Kunden
— dieselbe Linie wie `tableColumnWidths()` eine Funktion weiter oben, und zum
vierten Mal in diesem Repo die Antwort auf „zwei Rechnungen für dieselbe
Frage". Sie gibt je Zeile den Umbruch *und* die Höhe zurück: der Setzer
zeichnet damit, der PowerPoint-Weg schreibt damit sein `a:tr h` und sein `cy`.
Der Innenabstand steht darin und nicht mehr an beiden Enden — 0,55 senkrecht,
0,7 waagerecht, aus der Schriftgröße gerechnet.

**Und der Maßstab des Layouts fehlte auf halbem Weg.** Die Zellen kamen
geskaliert in der Datei an (`typeScale.small.size × scale`), die Spaltenbreiten
aber nicht: `tableShape()` kannte den Maßstab nicht und rechnete mit der
ungeskalierten Größe. Im `split`-Layout (0,94) waren das zwei
Spaltenaufteilungen für dieselbe Tabelle — gemessen 0,75 Einheiten Unterschied
an der ersten Spaltenkante. Wenig, und trotzdem dieselbe Bauart: er steht jetzt
als `size` im `TableModel`, weil `tableShape()` ihn sonst aus den Läufen raten
müsste.

**Was die Gegenprobe im Betrachter zeigt und was nicht.** LibreOffice bricht
die Zellen **selbst** um und lässt die Zeilen wachsen: in der gerenderten Datei
steht „Regio / n" in einer Spalte, in der die Folie „Region" auf eine Zeile
setzt. Was man dort sieht, ist deshalb zum guten Teil die Zeilenumbruchrechnung
des Betrachters mit *seinen* Schriften — die entscheidende Messung ist die
deklarierte Höhe gegen die Haarlinien des Setzers, und die stimmt jetzt
zeilenweise. Der Blick in die Datei ist trotzdem nicht umsonst: drei Seiten,
geöffnet und angesehen, keine Zeile in einer anderen, der Absatz unter der
Tabelle unter der Tabelle.

**Kursiv fiel im Export still aus — jetzt wird geschert.** `*kursiv*` erzeugt
einen Lauf mit `font.italic`; SVG schreibt `font-style="italic"`, PPTX `i="1"`,
und Browser wie PowerPoint schrägen selbst nach. Die beiden Wege, die ihre
Glyphen selbst zeichnen, konnten das nicht: die CI führt in neun Schnitten
keinen kursiven, `resolveFace()` gibt den nächstliegenden aufrechten zurück,
und im eingebetteten PDF wie im PNG stand der Text aufrecht. Nachgemessen mit
`pdfjs-dist`: „Aufrecht" und „Kursiv" kamen beide als `Inter-Regular` zurück.

Der Winkel ist **nachgemessen und nicht angenommen**: derselbe Schnitt einmal
aufrecht und einmal kursiv in ein Canvas gezeichnet, den linken Rand des
H-Stammes in zwei Zeilen 190 Pixel auseinander gesucht — Chromium neigt um
0,2474, also tan 13,9°. Es ist auch der Wert, den CSS für `oblique` ohne
Winkelangabe vorsieht. Vierzehn Grad stehen deshalb in `theme.config.ts`, und
zwar bei den strukturellen Werten und nicht im `BrandTheme`: sie gehören keiner
Marke, sondern der Frage, wie ein fehlender Schnitt ersetzt wird.

**Die Richtung ist an beiden Stellen ausgeschrieben, weil sie verschieden
ist.** Auf der Folie wächst y nach unten, im Textraum eines PDF nach oben — und
ein kursiver Schnitt lehnt in beiden Fällen *oben* nach rechts. Im Umriss-Weg
geht die Neigung deshalb negativ ein (`x' = x − k·y`), in der PDF-Textmatrix
positiv. Wer eine der beiden aus der anderen abschreibt, bekommt ein Zeichen,
das nach hinten kippt, und sieht es erst in der Datei.

**Und jsPDF legt den Anker anders, sobald man ihm eine Matrix gibt.** Bei einer
*Gradzahl* dreht es um den Textanker; bei einer **Matrix** legt es den Anker
ausdrücklich in das Koordinatensystem, das die Matrix aufspannt („the x and y
offsets should be applied in the coordinate system established by this
matrix"). Gemessen: dasselbe H stand statt bei 300 pt bei 378,5 — genau um `k ·
y` verschoben, also um die Schere selbst. Mitgegeben wird deshalb `T(anker) · A
· T(−anker)`; was jsPDF daraus baut, ist wieder `T(anker) · A`.

**Was sich dabei *nicht* ändert, ist die Stelle.** Chromiums synthetische
Neigung fasst die Vorschübe nicht an — nachgemessen an Zilla Slab Bold in 68
px: „Kursiv" ist aufrecht wie kursiv 201,144 breit, und jedes einzelne Zeichen
ebenso. Beide Wege fragen denselben `measureText`, die Glyphen stehen also an
genau denselben x-Werten wie auf dem Bildschirm; geschert wird nur die Form,
und zwar um die **Grundlinie**, damit der Fuß bleibt, wo er war. Der Lauf wird
dadurch rechts breiter als seine gemessene Breite — genau wie im Browser.

Unter- und Durchstreichung bleiben gerade: der Browser zieht sie waagerecht,
und der SVG-Weg schreibt dafür ein ungeschertes Rechteck. Geschert wird
ausdrücklich nur, wenn die Schnittliste des Erscheinungsbilds **keinen**
kursiven führt — `resolveFace()` sucht heute nur unter `style === 'normal'`,
und wer ihm das eines Tages abgewöhnt, bekäme sonst beides: den echten Schnitt
und die Schere.

**Was das Bild zeigt und was nicht.** Angesehen wurde der ausgegebene Umriss
als SVG: die kursiven Wörter lehnen, die aufrechten stehen. Was dieses Bild
*nicht* zeigt, ist der Wortabstand — es entsteht ohne Canvas und damit mit den
Ersatzmaßen, nicht mit denen des Browsers. Dass die Stellen stimmen, ist
deshalb gemessen und nicht angesehen; das ist der Absatz darüber.

**Der zweite Kunde einer Rechnung wird beim Reparieren vergessen.**
`flowBounds()` bekam seinen Maßgeber für die Bildmaße, als der Fehler in
`useClipboard` auffiel — `insertPreset()` im Store rief ihn weiter ohne. Und
das ist der häufigere Weg: die Bausteinbibliothek gegen ein eingefügtes Bild
aus der Zwischenablage. Ohne die Maße fällt der Setzer auf „volle
Spaltenbreite, Verhältnis 0,5625" zurück; bei einem 300 × 300-Logo im Fließtext
sind das 762 Einheiten statt 441, und der Kasten, dem das Einsetzen ausweichen
soll, ist um ein Drittel zu hoch. Der Baustein landet entsprechend zu tief oder
gleich auf dem Notplatz am unteren Satzspiegel.

Gefunden hat es kein Test, sondern die Frage „wer ruft das noch" — zwei Zeilen
`grep`. Das ist dieselbe Familie wie „Sechs Wege ersetzten das Deck, einer
fragte", nur eine Runde später: **wer eine Rechnung um ein Argument erweitert,
muss ihre Aufrufer zählen und nicht den einen reparieren, der gerade wehtut.**

**„Alle ersetzen" ließ den Rohblock stehen — als einziger Weg.** Der Kopf von
`withElements()` führt es unter den zehn Wegen auf, die das früher taten, und
zählt es zu den reparierten. Es war der eine, der es weiter tat, und der Grund
steht in der Funktion selbst: `withElements()` gilt der **offenen** Folie,
`ersetzeImDeck()` geht durch alle. Erreichbar ist der Fehler heute nicht — ein
Element mit Rohblock kommt als `shape` mit lauter Vorgabewerten aus dem Leser,
und in leeren Feldern findet die Suche nichts. Die Zusage steht trotzdem an
zwei Stellen im Klartext, und eine Zusage, die nur fast gilt, ist keine.

**Vierundzwanzig von dreiundfünfzig.** Die Prüfung „fasst nichts an, was der
Verlauf noch hält" — die Bedingung, unter der der Verlauf seine Objekte
*teilen* darf statt sie zu klonen — führte ihre Handgriffe als getippte Liste.
Der Store hat inzwischen dreiundfünfzig Aktionen; vier davon fassen das Deck an
und standen nicht darin (`updateElement`, `addElements`, `ersetzeImDeck`,
`pushHistory`). Keine hat je an Ort und Stelle geändert, es fehlte also nichts
— aber „eine Härtungsliste, die man tippt, prüft die Hälfte" steht in dieser
Liste schon einmal, und diesmal war es nicht die Hälfte, sondern knapp die
Hälfte.

Der Wächter über dem Wächter geht jetzt `Object.keys()` des Stores durch: jede
Aktion muss entweder geprüft oder mit Grund ausgenommen sein, und die
Ausnahmeliste darf nichts führen, das es nicht mehr gibt. Wer eine Aktion
hinzufügt, muss sich entscheiden.

**Und ein Netz, das es noch nicht gab: der Rundlauf durch die Datei.** Was der
Store baut, muss die `.md` tragen können — eine Aktion, deren Ergebnis den Weg
durch `serializeDeck → parseDeck` nicht übersteht, verliert still, und man
sieht es erst beim nächsten Öffnen. Neunzehn Aktionen, jede einzeln, jede gegen
das ganze Deck verglichen. Ausgenommen ist die **Folienkennung**: sie steht im
Dateiformat nicht, sie ist ein Griff im Speicher und wird beim Lesen neu
vergeben.

**Was nachgemessen wurde und in Ordnung ist.** Alle neunzehn überstehen den
Rundlauf. Der Merker für das Zusammenfassen verfällt an jedem ⌘Z, jedem
geladenen Deck und jedem `setState` von selbst, weil er auf den Eintrag zeigt,
den er abgelegt hat. `undo` klemmt den Folienindex, wenn das wiederhergestellte
Deck kürzer ist; `goTo`, `moveSlide` und `deleteSlide` halten ihre Grenzen; die
Auswahl wird beim Folienwechsel geleert und trägt danach keine toten Kennungen.
`locked` gilt beim Schieben, Ausrichten, Verteilen und Ziehen und wird von
`selectAll` gar nicht erst eingesammelt. Und `updateElements` und
`transformElements` legen keinen Verlaufsschritt an — das tut die Geste einmal
am Anfang, und genau deshalb ist ein Ziehen ein Schritt und nicht sechzig.

**Ein Prompt, der die Folie ausmisst und ihr Blatt verschweigt.** Der
Deck-Prompt liest `canvas` aus der lebendigen Bindung: wer ein A4-Deck offen
hat, bekommt „Die Folie ist 1280 × 1810 Einheiten (DIN A hoch)" und einen
Satzspiegel, der bis 1738 reicht. Das Frontmatter, das er zeigt, führte
`title`, `author` und `footer` — `format:` nicht, und `theme:` auch nicht. Ein
Modell, das dem Prompt folgt, legt seine Karten bis y = 1810; die Antwort kommt
ohne beide Schlüssel zurück, öffnet auf 16:9 und ist 720 hoch. Gemessen: ein
Element bei y = 1400 steht danach 680 Einheiten unter der Folie, wo keine
Ausgabe es zeigt und kein Klick es trifft.

Dasselbe eine Marke weiter: der Prompt nennt die Schriften des gültigen
Erscheinungsbilds, seine Signalfarbe und sein Zeichen-Set — und das Deck, das
daraus entsteht, trägt nozilla. Beide Hälften sind derselbe Satz, und er steht
in dieser Liste schon dreimal: **wer zu viel verspricht, bekommt vom Modell
etwas, das die Seite eine Ecke weiter zurückweist, und der Fehler steht dann
bei dem, der den Prompt befolgt hat.** Geprüft wird am Leser und nicht am Text:
die beiden Zeilen, die der Prompt hinschreibt, gehen durch `parseDeck`, und was
zurückkommt, muss das Blatt und die Marke sein, für die er gerechnet hat.

**Elf von zwanzig Zahlen im eigenen Beispiel lagen neben dem Raster.** „Alle
Werte auf ein Vielfaches von 8 runden" steht im Prompt, und der Haken der
Prüfliste am Ende sagt es noch einmal — dazwischen stand `x: 700, y: 140, w:
492, h: 190`, also in dem Beispiel, das ein Modell abschreibt. Vier von vier
Zahlen im ersten Block, zwei von vier in jeder Karte des zweiten. Der
Satzspiegel liegt selbst im Raster (88, 1192, 72, 648), die Forderung ist also
erfüllbar: x 704 mit w 488 endet auf derselben Kante wie x 700 mit w 492.

Und dahinter lag eine dritte Wahrheit über dasselbe Raster. `computeSnap()` und
`resizeRect()` rasten jedes gezogene Element darauf ein, der Prompt verlangt es
vom Modell — `insertColumnWidth()` legte ein eingesetztes Element mit 530
Einheiten bei x = 662 daneben. Sichtbar wurde das beim ersten Anfassen: das
Element sprang aufs Raster und verlor dabei die rechte Kante des Satzspiegels.
Zwei Einheiten schmaler, und die Rechnung geht auf — 528 bei x = 664 endet
genau auf `width - margin.right`.

**`labelStyle` wirkte in vier Ausgaben und stand in keinem Prompt.** Die
Feldtabelle ist von Hand geschrieben, elf Zeilen für elf Elementarten, und
`minimizeElement()` schreibt daneben genau die Schlüssel, die in der `.md`
landen. Verglichen fehlte einer: die Typo-Stufe einer Formbeschriftung. Sie
steht im Dateiformat, wird gezeichnet und in die `.pptx` getragen — nur wusste
kein Modell davon, und die Zeile darunter behauptete obendrein, die Typo-Leiter
gelte „nur für kind: text". Gemessen wird jetzt am Serialisierer: eine zwölfte
Angabe bekommt keine stillschweigende Ausnahme.

**Zwei von fünf Untergründen wurden aufgezählt und nicht erklärt.** `ink` und
`signal` standen in der Liste der erlaubten Werte und in keiner Erklärzeile —
und es sind die beiden dunklen. Dazu fehlte die Warnung ganz, die die
Oberfläche für dieselbe Frage längst hat: eine Fläche im Ton ihres Untergrunds
ist da und nicht zu sehen. Nachgerechnet über alle Kombinationen sind es fünf
Paare — paper+white, cream+paper, ink+ink, signal+signal, grid+white —, und sie
stehen jetzt im Prompt. Getippt und nicht gerechnet, aus demselben Grund wie
die Icon-Auswahl darüber: eine Liste, die sich aus dem Zeichner selbst ergibt,
stellt den Test still, der sie prüfen soll. Gehalten wird sie gegen
`unsichtbareFlaeche()`, in beide Richtungen — eine Warnung, die zu viel nennt,
verurteilt eine Folie, die gut aussieht.

**Eine Regel, die das eigene Material bricht.** „Überschriften sind Sätze mit
Punkt." galt im Prompt für jede Überschrift. Das mitgelieferte Beispiel hält
sich nicht daran, die Willkommensmappe auch nicht und das Deck der zweiten
Marke ebenso wenig: in allen dreien trägt die `#`-Zeile einen Punkt und die
`##`-Zeile keinen. Der Punkt gehört dem Kampagnensatz und nicht der
Zwischenüberschrift. Die Regel sagt das jetzt, und geprüft wird sie an dem
Material, an dem man sie ablesen kann — in beide Richtungen, denn eine Prüfung
nur der ersten Hälfte wäre auch für „gar keine Punkte" grün.

**Und die Prüfung daneben zählte drei von zwölf.** Die Zusicherung „das
Beispiel hält sich an die eigenen Regeln" führte die Markergrenze als getippte
`3` und die Verbotsliste als `/seamless|disruptiv|synergie/i`. Wer ein Wort
ergänzt oder die Grenze senkt, bekäme von ihr kein Wort; sie liest jetzt
`MAX_MARKERS_PER_PARAGRAPH` und `forbiddenWords`. Dieselbe Zeile steht in
dieser Liste schon einmal und hieß dort „eine Härtungsliste, die man tippt,
prüft die Hälfte". Zwei Stellen in `PROMPT.md` gingen mit: der Knopf steht seit
dem Umbau der Kopfleiste nicht mehr „oben rechts", sondern links neben der
Folienübersicht, und die Aufzählung dessen, was der Prompt leistet, kannte
`theme:` und `format:` noch nicht.

**Die Leiste rechnete und abonnierte nicht.** Drei Auskünfte des Inspektors
sind gerechnet und nicht abgelesen: der Überlauf eines Elements, der des
Fließtextes und die Warnung vor einer Fläche in der Farbe des Untergrunds. Alle
drei ändern sich, ohne dass jemand die Folie anfasst — an der echten Schrift,
am Erscheinungsbild, an eingetroffenen Bildmaßen, und wogegen der Fließtext
gemessen wird, am Folienformat. `SlidePanel` rief drei der vier Zähler,
`ElementPanel` keinen einzigen.

Gemessen an einer h1 in einem 300 × 60-Kasten: 281 Einheiten Überlauf unter
nozilla, 185 unter dem Musterkunden. Der Balken auf der Fläche folgt dem
Wechsel — `CanvasStage` abonniert —, die Zahl in der Leiste daneben nicht, und
„Kasten anpassen" hätte um 281 statt um 185 vergrößert. Für den Fließtext
dieselbe Rechnung am Blatt: 999 Einheiten Überlauf auf 16:9, 0 auf A4 hoch, 814
auf A4 quer.

**Was davon im Browser dingfest zu machen ist, ist weniger, als es aussieht.**
Der Wechsel des Erscheinungsbilds und der des Formats stehen beide im Reiter
„Deck", und der Weg dorthin hängt die Element-Leiste aus — beim Zurückkommen
rechnet sie ohnehin neu. Bleibt der Wechsel im laufenden Fenster, etwa ein
geladenes Deck mit anderem Blatt: dort zeichnet binnen Millisekunden ohnehin
etwas anderes die Leiste neu, und eine Prüfung, die wartet, sieht den
stehengebliebenen Wert nie. Zwei Anläufe im Rauchtest blieben deshalb auch ohne
den Zähler grün — der erste ging obendrein über den Ladeweg, wo der Neustart
die Schriften holt und deren Zähler die Leiste nebenbei neu zeichnet. Genau
diese Falle steht in dieser Liste schon einmal.

Bewacht wird die Regel deshalb an der **Quelle**, wie bei `darfErsetzen()`: wer
eine dieser Rechnungen anstellt, ruft die vier Zähler. Und **je Komponente und
nicht je Datei** — denn genau das war der Fehler: die Datei rief sie, nur eben
in der anderen Leiste. Der Rauchtest prüft dafür etwas anderes, das sonst
niemand prüft: dass die Warnung nach einem Blattwechsel im laufenden Fenster
wirklich stimmt.

**`min={0}` an der Höhe, während der Leser bei 1 kappt.** Der Kommentar an
`NumberField` schreibt aus, warum getippte Werte im Feld gekappt werden —
„weder behalten noch abgelehnt, sondern still ersetzt" —, und für die Breite
stimmte die Grenze auch. Für die Höhe nicht: `normalizeElement` hebt alles
außer einem Verbinder auf 1, das Feld ließ 0 durch, und beim nächsten Öffnen
stand 1 da. Dieselbe Sorte Reparatur wie überall hier: `mindestHoehe(kind)` ist
jetzt die eine Rechnung, und der Verbinder behält seine Null, denn eine
waagerechte Linie hat keine Höhe.

Die Prüfung dazu hat zwei Anläufe gebraucht, und der erste war eine Tautologie:
sie verglich `normalizeElement` mit `mindestHoehe()` — und `normalizeElement`
*ruft* `mindestHoehe()`. Die Gegenprobe „gib überall 0 zurück" kam grün durch,
weil beide Seiten mitwanderten. Die Absicht steht jetzt als Zahl im Test und
wird zweimal gehalten: gegen die gesicherte Datei und gegen die Funktion, die
das Feld fragt. Und weil der Unterschied im *Argument* liegt —
`mindestHoehe(first.kind)` gegen eine feste Zahl sieht in jeder Zusicherung
über die Funktion gleich aus —, tippt der Rauchtest wirklich eine 0 in das Feld
und liest, was danach darin steht.

**Ein Vorgabewert, der beim Hinsehen falsch war.** Der Inspektor schrieb `icon
?? 'sparkle'`, und `sparkle` führt das nozilla-Set unter seinen 554 Zeichen
überhaupt nicht; die Fabrik nimmt `square-check`. Erreichbar war der Zweig
nicht — ohne „Ohne" in der Auswahlliste kommt nie `undefined` an —, aber ein
Name, der schon jetzt ins Leere zeigt, wird beim nächsten Umbau richtig
eingebaut. `standardIcon()` steht jetzt an einer Stelle und hat vier Kunden.

**Und `default: return null` war die vierte stille Lücke dieser Bauart.** Eine
zwölfte Elementart bekäme im Inspektor gar keine Felder, so wie sie früher aus
dem SVG ersatzlos verschwunden wäre. Die Zuweisung an `never` bricht jetzt
`tsc` ab. Geworfen wird hier aber **nicht**, anders als in `svg.ts`: das ist
eine Komponente, und ein Wurf im Renderpfad ist ein weißes Fenster — der Fall,
gegen den in diesem Repo schon einmal etwas gebaut wurde. Der Compiler ist die
Prüfung, das `null` ist die Notlandung.

**Was nachgemessen wurde und in Ordnung ist.** Die sechs Ausrichten-Knöpfe sind
auch bei einer einzelnen Auswahl nicht tot — `alignSelection` nimmt dann die
Folie als Bezug und nicht die Auswahl. „Verteilen" ist unter drei Elementen
gesperrt, „Gruppieren" unter zweien. Die Kartenfelder folgen
`kartenFelder(variant)`, die CI-Felder `elementFelder(kind)`, die Typo-Stufe
des Form-Labels erscheint nur, wenn ein Label dasteht. Und der Kopf der Datei
war der letzte englische Kommentar im Projekt.

---

## Git

Auf dem zugewiesenen Feature-Branch entwickeln, dorthin pushen, danach eine PR
öffnen. Ist die PR schon gemerged, den Branch frisch von `main` aufsetzen statt
auf gemergter Historie weiterzustapeln.
