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

`src/theme/theme.test.ts` liest die Komponenten-Quellen und schlägt an, wenn
eine Bedienfläche einen Marken-Ton benutzt. Der Test existiert, weil dieser
Fehler schon zweimal gemacht wurde.

---

## Wo was liegt

```
theme.config.ts               Die CI. Eine Datei. Alles liest von hier.
CLAUDE.md                     Diese Datei
README.md                     Für Menschen, die das Werkzeug benutzen
PROMPT.md                     Der Deck-Prompt, erklärt
scripts/sync-ci.mjs           Holt Schriften, Marke und Icons aus dem CI-Repo
src/
  assets/     *.generated.ts  ERZEUGT — nicht von Hand ändern
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
`src/assets/wordmark.generated.ts`. Sie kommen aus `npm run sync:ci`.

---

## Konventionen

- **Kommentare auf Deutsch, in ganzen Sätzen.** Sie erklären _warum_, nicht
  _was_. Ein Kommentar, der den Code nacherzählt, gehört gelöscht.
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
- **Oberfläche**: mit Playwright gegen `vite preview` klicken; Chromium liegt
  unter `/opt/pw-browsers/`.

Wenn du eine Ausgabe änderst, sieh sie dir an. Nicht die Zusicherung — das
Bild.

---

## Fallen, die schon zugeschnappt sind

Jede davon hat Zeit gekostet. Sie stehen hier, damit sie es nicht noch einmal
tun.

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
Kubiken (`arcToCubics` in `path.ts`). Ohne das fehlen 462 Icons im PDF.

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

---

## Git

Auf dem zugewiesenen Feature-Branch entwickeln, dorthin pushen, danach eine PR
öffnen. Ist die PR schon gemerged, den Branch frisch von `main` aufsetzen statt
auf gemergter Historie weiterzustapeln.
