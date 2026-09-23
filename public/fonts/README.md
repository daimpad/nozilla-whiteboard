# Schriften

Alles hier ist selbst gehostet, ohne CDN, und liegt in zwei Fassungen vor:
**WOFF2** für den Bildschirm und **TTF** für den Export — jsPDF bettet
TrueType ein, und der Umriss-Leser für PDF und PNG braucht die `glyf`-Tabelle.
Welche Datei zu welcher Familie gehört, steht in `src/assets/schriftbibliothek.ts`.

## Die Schriften der nozilla-CI

Zilla Slab, Inter und Space Mono, SIL Open Font License 1.1, siehe `OFL.txt`.
Sie stammen aus [`daimpad/nozilla-ci`](https://github.com/daimpad/nozilla-ci)
und kommen über

```
npm run sync:ci -- ../nozilla-ci
```

Der Abgleich schreibt nur seine eigenen neun Schnitte und lässt alles andere
in diesem Ordner liegen.

## Die Bibliothek

Zwanzig weitere Familien aus [Google Fonts](https://github.com/google/fonts),
je in 400, 500, 600 und 700, die Lizenz jeder Familie unter `lizenzen/`.
Sie kommen über

```
pip install fonttools
npm run fonts:bibliothek
```

Google liefert die meisten Familien nur noch als *variable* Schrift. Der
Umriss-Leser dieses Werkzeugs kennt keine Variationsachsen, er läse für jedes
Gewicht dieselben Umrisse — im PDF stünde jede Überschrift in Regular, während
der Bildschirm sie fett zeigt. Das Skript schneidet deshalb feste Schnitte.
`src/assets/schriftbibliothek.test.ts` prüft an jeder Datei, dass Bold
wirklich fetter ist als Regular.

Der Browser lädt eine Schrift erst, wenn eine Marke sie benutzt. Die
Bibliothek kostet also Platz im Repository, nicht beim Benutzer.

Nichts hier von Hand bearbeiten.
