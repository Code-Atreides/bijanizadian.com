import { useEffect, useState } from 'react';

import { goToFrame } from '@/components/site/corridor';
import { site } from '@/content';
import { FRAMES } from '@/site-map';
import { cn } from '@/lib/utils';

/**
 * Fixed chrome over the corridor.
 *
 * The links move the corridor rather than jumping the document. An anchor would
 * scroll to a frame's position in the document, which in a fixed 3D scene is
 * the same position for every frame — so #contact would go nowhere. Each link
 * scrolls to the offset that brings its frame to the camera plane, and the
 * reader flies there instead of teleporting.
 */
const LINKS = [
  { label: 'Work', frame: FRAMES.work },
  { label: 'Art', frame: FRAMES.art },
  { label: 'About', frame: FRAMES.about },
  { label: 'Contact', frame: FRAMES.contact },
] as const;

export function Nav() {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const onScroll = () => setMoved(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500',
        moved
          ? 'border-b border-white/[0.07] bg-black/55 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      {/* 900px, not a Tailwind stop: it is the width at which the corridor
          takes over from the flat layout, and therefore the width at which a
          counter appears in the top-right corner and needs room. */}
      <nav className="flex h-14 items-center gap-6 px-5 sm:px-6">
        <button
          type="button"
          onClick={() => goToFrame(0)}
          className="text-[13.5px] tracking-[-0.01em] transition-opacity hover:opacity-70"
        >
          {site.domain}
        </button>

        <ul className="ml-auto flex items-center gap-5 sm:gap-8 min-[900px]:pr-16">
          {LINKS.map((l) => (
            <li key={l.label}>
              <button
                type="button"
                onClick={() => goToFrame(l.frame)}
                className="font-mono text-[12px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
