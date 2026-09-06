import { Suspense, lazy } from 'react';

import { Footer, Nav } from '@/components/site/nav';
import { Scrim } from '@/components/site/scrim';
import { About, Contact, Hero } from '@/components/site/sections';
import { Art, Work } from '@/components/site/work';

// Three.js is ~570kB and paints nothing the reader needs in order to read.
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
        <Art />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
