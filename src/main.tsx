import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyThemeVariables, subscribeTheme } from './theme';
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

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
