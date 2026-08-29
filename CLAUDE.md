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
  gegen das gebaute Verzeichnis. Vierundvierzig Handgriffe, die je einen
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

---

## Git

Auf dem zugewiesenen Feature-Branch entwickeln, dorthin pushen, danach eine PR
öffnen. Ist die PR schon gemerged, den Branch frisch von `main` aufsetzen statt
auf gemergter Historie weiterzustapeln.
