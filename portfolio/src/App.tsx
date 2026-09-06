import { Suspense, lazy } from 'react';

import { Footer, Nav } from '@/components/site/nav';
import { Scrim } from '@/components/site/scrim';
import { About, Capabilities, Contact, Hero } from '@/components/site/sections';
import { Work } from '@/components/site/work';

// Three.js is ~570kB of the bundle and paints nothing the reader needs in order
// to read. Splitting it out lets the type and the buttons arrive first; the
// wave fades in a moment later, over ground that already looks intentional.
const DottedSurface = lazy(() =>
  import('@/components/ui/dotted-surface').then((m) => ({ default: m.DottedSurface })),
);

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <DottedSurface size={6} opacity={0.55} speed={1.2} />
      </Suspense>
      <Scrim />

      <Nav />
      <main>
        <Hero />
        <Work />
        <Capabilities />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
