import { useEffect, useRef } from 'react';

/**
 * A veil that lies between the wave field and the page.
 *
 * The field is `fixed`, so it does not scroll away — without this it sits at
 * full strength behind body copy and the two fight. Rather than dimming the
 * field everywhere (which costs the hero its drama), the veil is transparent at
 * the top of the page and reaches full strength one viewport down: the first
 * screen keeps the whole wave, everything after it reads against near-solid
 * ground with the wave still faintly alive underneath.
 *
 * Driven by a CSS custom property written from a rAF-throttled scroll handler,
 * so scrolling never triggers a React render.
 */
export function Scrim() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;
    const apply = () => {
      ticking = false;
      const t = Math.min(window.scrollY / Math.max(window.innerHeight * 0.85, 1), 1);
      // ease-out so the veil arrives quickly, then settles
      el.style.setProperty('--veil', String(1 - (1 - t) * (1 - t)));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ ['--veil' as string]: 0 }}
      className="pointer-events-none fixed inset-0 -z-[5]"
    >
      {/* the scroll-driven veil */}
      <div
        className="absolute inset-0 bg-[#08080a]"
        style={{ opacity: 'calc(var(--veil) * 0.82)' }}
      />
      {/* a permanent vignette: keeps the field off the corners at all times */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_18%,transparent_38%,rgba(8,8,10,0.75)_100%)]" />
    </div>
  );
}
