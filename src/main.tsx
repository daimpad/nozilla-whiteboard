import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PresenterView } from './components/present/PresenterView';
import { isPresenterWindow } from './lib/presenterChannel';
import { applyThemeVariables, subscribeSurface, subscribeTheme, watchSystemSurface } from './theme';
import { installWebfonts } from './theme/fonts';
import { registerThemes } from './themes';
import './index.css';

// Die Erscheinungsbilder der Kunden anmelden, bevor ein Deck sein eigenes
// verlangt — sonst fiele es beim ersten Bild auf die Voreinstellung zurück.
registerThemes();

// Die CI als CSS-Custom-Properties und die Marken-Schriften, vor dem ersten
// Bild.
applyThemeVariables();
installWebfonts();

// Ein Wechsel des Erscheinungsbilds betrifft zwei Dinge, die außerhalb von
// React liegen: die Variablen auf `:root` und die `@font-face`-Regeln. Die
// Szene zieht ihre Werte selbst, die beiden hier müssen nachgeführt werden.
subscribeTheme(() => {
  applyThemeVariables();
  installWebfonts();
});

// Die Erscheinung des Werkzeugs — hell oder dunkel — steht ebenfalls in den
// Variablen auf `:root`. Sie hat mit dem Erscheinungsbild der Folie nichts zu
// tun und wird deshalb getrennt beobachtet; `watchSystemSurface()` hört dazu
// auf die Einstellung des Betriebssystems.
subscribeSurface(() => applyThemeVariables());
watchSystemSurface();

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing from index.html');

/*
   Die Referentenansicht wird **hier** abgezweigt und nicht innerhalb von
   `App`. Der Grund ist nicht die Übersichtlichkeit, sondern die Sitzung: `App`
   lädt beim Start das gemerkte Deck und schaltet die Selbstsicherung ein. Ein
   zweites Fenster, das dasselbe täte, schriebe seinen eigenen Stand über den
   des ersten — und zwar genau während des Vortrags. Das Vortragsfenster hat
   deshalb keinen Store, keine Sitzung und keine Sicherung; es bekommt sein
   Deck über den Kanal.
*/
const wurzel = isPresenterWindow(window.location.search) ? <PresenterView /> : <App />;

createRoot(container).render(<StrictMode>{wurzel}</StrictMode>);
