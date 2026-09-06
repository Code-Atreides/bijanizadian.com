import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

const el = document.getElementById('root');
if (!el) throw new Error('#root missing');

// next-themes went with the dot field: it existed only so DottedSurface could
// read a theme, and this site is dark-only.
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
