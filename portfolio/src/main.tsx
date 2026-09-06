import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';

import App from './App';
import './index.css';

const el = document.getElementById('root');
if (!el) throw new Error('#root missing');

// DottedSurface reads useTheme(), so the provider is required rather than
// optional. Despite the package name, next-themes is plain React and works
// outside Next: it writes a class onto <html> and remembers the choice.
createRoot(el).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
