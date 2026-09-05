# Marken-Schriften

Zilla Slab, Inter und Space Mono — die drei Schriften der nozilla CI, selbst
gehostet, ohne CDN. Lizenz: SIL Open Font License 1.1, siehe `OFL.txt`.

Die Dateien stammen aus [`daimpad/nozilla-ci`](https://github.com/daimpad/nozilla-ci)
(`project/fonts/`, dort als TTF) und werden beim Sync nach WOFF2 gewandelt:

```
npm run sync:ci -- ../nozilla-ci
```

WOFF2 statt TTF, weil dieselben Konturen so rund zwei Drittel kleiner sind
(1875 kB → 630 kB über alle neun Schnitte). Nichts hier von Hand bearbeiten —
`scripts/sync-ci.mjs` überschreibt den Ordner.

Welche Datei zu welcher Familie und welchem Schnitt gehört, steht in
`theme.config.ts` unter `webfont.faces`; die `@font-face`-Regeln entstehen zur
Laufzeit daraus (`src/theme/fonts.ts`). Fehlen die Dateien, greift der
System-Fallback aus `fontFamily` — die Anwendung bleibt bedienbar und
exportiert weiterhin korrekt, nur eben nicht in den Marken-Schriften.
