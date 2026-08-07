import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyThemeVariables } from './theme';
import { installWebfonts } from './theme/fonts';
import './index.css';

// Publish the CI as CSS custom properties, and the optional brand face, before
// the first paint.
applyThemeVariables();
installWebfonts();

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
