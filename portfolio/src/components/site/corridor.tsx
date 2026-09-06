import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

/**
 * A corridor of frames you move through by scrolling.
 *
 * The version this replaces put every frame on one z-axis and drove it by
 * rewriting document.body.style.height at runtime. Three problems followed:
 *
 *  1. The nav frames sat at z −30000/−35000/−40000 while the corridor ended at
 *     −21000, so reaching the last one meant scrolling 19,000px of empty
 *     corridor. The fix is not a bigger number — it is that depth should be
 *     derived from the frame's index, not authored per frame.
 *  2. Because body height was mutated to reach those depths and shrunk again
 *     afterwards, a reload restored a scroll position that no longer meant
 *     anything, which is what the `restoredScroll > 21000` guard was patching.
 *     Height here is a function of frame count and never changes.
 *  3. Frames only translated; they never faded. A panel arrived at full opacity
 *     from nowhere and passed through the camera at full opacity. Depth without
 *     atmosphere reads as popping, so opacity is now a curve over distance.
 *
 * Everything the reader sees is one linear map: scrollY → progress → z.
 */

/** z-distance between neighbouring frames. */
const SPACING = 1600;
/** scroll distance that advances the corridor by one frame. */
const SCROLL_PER_FRAME = 780;
/** how far past the last frame the corridor keeps going, so it can exit. */
const TAIL = 0.9;
/** the visible window, in frames, relative to the camera. */
const NEAR = 0.55; // past this it has gone by
const FAR = 2.3; // before this it is too far to see

type Ctx = { register: (el: HTMLElement | null, index: number) => void; reduced: boolean };
const CorridorCtx = createContext<Ctx | null>(null);

/**
 * Whether to fly the corridor or lay the frames out as a document.
 *
 * Two reasons to fall back. Reduced motion is the obvious one — moving the
 * whole page through depth is exactly what that setting exists to stop. The
 * second is phones: a frame taller than the screen has to scroll internally,
 * and a scroll inside a scroll-driven corridor means every swipe is ambiguous.
 * Under 900px the same content reads as an ordinary page, which on a phone is
 * not a downgrade.
 */
const FLAT = '(prefers-reduced-motion: reduce), (max-width: 899px)';

function useFlatLayout() {
  const [flat, setFlat] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(FLAT).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(FLAT);
    const on = () => setFlat(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return flat;
}

export function Corridor({ count, children }: { count: number; children: React.ReactNode }) {
  const reduced = useFlatLayout();
  const frames = useRef<Array<HTMLElement | null>>([]);
  const [current, setCurrent] = useState(1);

  const register = useCallback((el: HTMLElement | null, index: number) => {
    frames.current[index] = el;
  }, []);

  // The counter re-renders Corridor on every frame change. Without memoising
  // this, the context value is a new object each time, every Frame's effect
  // re-runs, and each one resets itself to hidden+inert — so past the third
  // frame the corridor froze with everything inert and the front frame stuck.
  const ctx = useMemo(() => ({ register, reduced }), [register, reduced]);

  useEffect(() => {
    if (reduced) return;

    let raf = 0;
    let shown = -1;

    const paint = () => {
      raf = 0;
      const p = window.scrollY / SCROLL_PER_FRAME;

      for (let i = 0; i < frames.current.length; i++) {
        const el = frames.current[i];
        if (!el) continue;

        const d = p - i; // 0 = at the camera plane, negative = still ahead
        const visible = d > -FAR && d < NEAR;

        // `data-on` is the source of truth for the current state. Frames are
        // born hidden and inert (see Frame below), so this flips only on a
        // genuine change and never writes to the DOM on every frame.
        const wasOn = el.dataset.on === '1';
        if (visible !== wasOn) {
          el.dataset.on = visible ? '1' : '0';
          el.style.visibility = visible ? 'visible' : 'hidden';
          // inert keeps links in frames you cannot see out of the tab order
          el.toggleAttribute('inert', !visible);
        }
        if (!visible) continue;

        // Depth needs atmosphere, not just distance. A linear fade left the
        // frame one step back at high opacity, sitting on top of the front
        // frame's paragraph and making both unreadable. Opacity now falls off
        // geometrically — each frame back is ~16% of the one in front — and
        // distance blurs, which is what actually reads as air between panels.
        const behind = Math.max(0, -d);
        const passing = Math.max(0, d);
        const fade = passing > 0 ? Math.pow(Math.max(0, 1 - passing / NEAR), 1.9) : 1;

        el.style.opacity = String(Math.pow(0.16, behind) * fade);
        el.style.filter =
          behind > 0.02 || passing > 0.02
            ? `blur(${Math.min(7, behind * 2.4 + passing * 6).toFixed(2)}px)`
            : 'none';
        el.style.transform = `translate(-50%, -50%) translateZ(${d * SPACING}px)`;
      }

      const n = Math.min(count, Math.max(1, Math.round(p) + 1));
      if (n !== shown) {
        shown = n;
        setCurrent(n);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced, count]);

  // Reduced motion gets the same content as an ordinary document. A corridor
  // that moves the whole page in depth is exactly what that setting is for.
  if (reduced) {
    return (
      <CorridorCtx.Provider value={ctx}>
        <div className="mx-auto max-w-5xl divide-y divide-white/[0.07] px-6 pt-24 pb-16">
          {children}
        </div>
      </CorridorCtx.Provider>
    );
  }

  return (
    <CorridorCtx.Provider value={ctx}>
      {/* the scene is fixed; the spacer below is what actually scrolls */}
      <div
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
        style={{ perspective: '2200px', perspectiveOrigin: '50% 48%' }}
      >
        <div className="relative size-full" style={{ transformStyle: 'preserve-3d' }}>
          {children}
        </div>
      </div>

      <div
        aria-hidden
        style={{ height: `calc(${(count - 1 + TAIL) * SCROLL_PER_FRAME}px + 100svh)` }}
      />

      <Counter current={current} total={count} />
    </CorridorCtx.Provider>
  );
}

export function Frame({
  index,
  children,
  id,
}: {
  index: number;
  children: React.ReactNode;
  id?: string;
}) {
  const ctx = useContext(CorridorCtx);
  const ref = useRef<HTMLElement>(null);
  const auto = useId();

  useEffect(() => {
    const el = ref.current;
    ctx?.register(el, index);
    if (el && !ctx?.reduced) {
      el.dataset.on = '0';
      el.setAttribute('inert', '');
    }
    return () => ctx?.register(null, index);
  }, [ctx, index]);

  if (ctx?.reduced) {
    return (
      <section
        id={id ?? auto}
        ref={ref as React.Ref<HTMLElement>}
        className="scroll-mt-20 py-14 first:pt-0"
      >
        {children}
      </section>
    );
  }

  return (
    <section
      id={id ?? auto}
      ref={ref as React.Ref<HTMLElement>}
      style={{ visibility: 'hidden', willChange: 'transform, opacity, filter' }}
      className={cn(
        'pointer-events-auto absolute top-1/2 left-1/2 w-[86vw] max-w-[980px]',
        'max-h-[78vh] overflow-y-auto overscroll-contain',
      )}
    >
      {children}
    </section>
  );
}

function Counter({ current, total }: { current: number; total: number }) {
  return (
    <p className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 font-mono text-[10.5px] tracking-[0.28em] text-muted-foreground/70 tabular-nums">
      {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </p>
  );
}

/** Scrolls the corridor to a frame. Exported so the nav can drive it. */
export function goToFrame(index: number) {
  window.scrollTo({
    top: index * SCROLL_PER_FRAME,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}
