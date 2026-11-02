/**
 * Der Einstieg der Generator-Seite.
 *
 * Er tut fast dasselbe wie `src/main.tsx` — und ausdrücklich **nicht das
 * eine**, was dort noch dazukommt: er mountet kein `<App />`. Der Grund steht
 * dort ausgeschrieben und gilt hier genauso: `App` lädt beim Start das
 * gemerkte Deck und schaltet die Selbstsicherung ein. Eine zweite Seite, die
 * dasselbe täte, schriebe ihren Stand über den des Werkzeugs — und zwar
 * während jemand daneben arbeitet, ohne dass etwas davon zu sehen wäre.
 *
 * Diese Seite hat deshalb keinen Store, keine Sitzung und keine Sicherung.
 * Dieselbe Linie wie bei der Referentenansicht.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CiGenerator } from './CiGenerator';
import { applyThemeVariables, subscribeSurface, subscribeTheme, watchSystemSurface } from '@/theme';
import { installWebfonts } from '@/theme/fonts';
import { ladeSchriftablage, subscribeSchriftablage } from '@/theme/schriftablage';
import { registerThemes } from '@/themes';
import '@/index.css';

// Die angelegten Erscheinungsbilder anmelden: die Vorschau meldet ihren Entwurf
// dazu an und stellt hinterher zurück — ohne das Verzeichnis fiele sie ins
// Leere.
registerThemes();

applyThemeVariables();
installWebfonts();

/*
   Der Setzer misst gegen die echte Schrift, und ein `@font-face` allein lädt
   nichts. Die Vorschau steht und fällt damit: gemessen würde sonst die
   Ersatzschrift, und die Wortpositionen blieben falsch, auch nachdem die
   richtigen Glyphen da sind. `installWebfonts()` fordert jeden Schnitt an und
   zählt danach einen Zähler hoch — hier hängt daran das Neuzeichnen der
   Vorschau.
*/
subscribeTheme(() => {
  applyThemeVariables();
  installWebfonts();
});
subscribeSurface(() => applyThemeVariables());
watchSystemSurface();

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing from ci.html');

/*
   Die Schriftablage vor dem ersten Bild. Ein Deck, dessen Marke einen
   hochgeladenen Schnitt nennt, fragte sonst den Server nach einer Datei, die
   dort nicht liegt — die `@font-face`-Regel scheiterte, und der Browser klagte
   in der Konsole, bevor die Ablage nachgereicht hätte. Gewartet wird höchstens
   anderthalb Sekunden: eine Ablage, die hängt, soll den Start nicht mitnehmen.
   Kommt danach ein Schnitt dazu oder geht einer, werden die Regeln neu gebaut.
*/
subscribeSchriftablage(() => installWebfonts());
const ablageBereit = Promise.race([
  ladeSchriftablage(),
  new Promise<void>((weiter) => window.setTimeout(weiter, 1500)),
]);
void ablageBereit.then(() => {
  createRoot(container).render(
    <StrictMode>
      <CiGenerator />
    </StrictMode>,
  );
});
