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

  // Where the corridor opens.
  //
  // Two things fight for that decision and both get it wrong. The browser
  // restores the previous scrollY on reload, which in a corridor means opening
  // on whichever frame you happened to be looking at — it reads as landing on
  // the wrong page. And a #hash makes the browser scroll that element into
  // view, but every frame sits at the same document position inside a fixed
  // scene, so it lands on nothing.
  //
  // This effect settles it. It runs after the Frame effects have registered
  // their elements (children before parents), so the frame carrying the hash
  // can be found by id and turned into the scroll offset that actually brings
  // it to the camera.
  useEffect(() => {
    if (reduced) return;
    const prior = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    const hash = window.location.hash.slice(1).toLowerCase();
    const i = hash ? frames.current.findIndex((f) => f?.id.toLowerCase() === hash) : -1;
    window.scrollTo({ top: i > 0 ? i * SCROLL_PER_FRAME : 0, behavior: 'auto' });

    return () => {
      history.scrollRestoration = prior;
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;

    let raf = 0;
    let shown = -1;
    let idle = 0;

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

        // Depth is applied to the frame and to its contents separately, and
        // that split is the whole trick on a dark ground.
        //
        // The architecture — border, floor line, and the wall of ground colour
        // the box-shadow paints — stays at full strength going back, so the
        // corridor keeps its shape. The *text* inside recedes hard, because
        // white type at 45% through a translucent frame face is still bright
        // enough to fight the headline in front of it. Fading the whole element
        // instead would dissolve the walls and collapse the corridor; fading
        // nothing would bury the frame you are meant to be reading.
        const behind = Math.max(0, -d);
        const passing = Math.max(0, d);
        const fade = passing > 0 ? Math.pow(Math.max(0, 1 - passing / NEAR), 1.6) : 1;

        el.style.opacity = String(Math.pow(0.88, behind) * fade);
        const content = el.firstElementChild as HTMLElement | null;
        if (content) content.style.opacity = String(Math.pow(0.055, behind));

        // Only the frame at the camera stands on a floor. A receding frame's
        // floor line is lifted toward the vanishing point by perspective and
        // lands across the middle of the page, where it reads as a stray rule
        // through the copy rather than as architecture.
        el.style.setProperty('--floor', String(Math.max(0, 1 - behind * 2.4)));
        el.style.transform = `translate(-50%, -50%) translateZ(${d * SPACING}px)`;
      }

      const n = Math.min(count, Math.max(1, Math.round(p) + 1));
      if (n !== shown) {
        shown = n;
        setCurrent(n);
      }
    };

    // `will-change: transform` promotes a frame to its own compositor layer for
    // as long as it is set, and text on a promoted layer is rendered with
    // grayscale rather than subpixel antialiasing — which on a dark ground
    // reads as slightly soft, exactly the fuzziness you saw. It is only worth
    // paying while the corridor is moving, so it goes on at the first scroll
    // event and comes off once scrolling stops.
    const setHint = (on: boolean) => {
      for (const el of frames.current) {
        if (el) el.style.willChange = on ? 'transform, opacity' : 'auto';
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
      if (!idle) setHint(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        idle = 0;
        setHint(false);
      }, 140);
    };

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
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

      {/*
        The spacer is the only thing in flow, so it alone decides how far the
        page scrolls. Its height is the offset that brings the *last* frame to
        the camera, plus one viewport — which makes the maximum scroll position
        exactly that offset. The corridor used to carry an extra 0.9 frames of
        tail, so you could keep scrolling after the last wall and watch it fly
        past into an empty room.
      */}
      {/* the light lying on the floor — over the scene, see .corridor-floor */}
      <div aria-hidden className="corridor-floor pointer-events-none fixed inset-0 z-20" />

      <div
        aria-hidden
        style={{ height: `calc(${(count - 1) * SCROLL_PER_FRAME}px + 100svh)` }}
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
      style={{ visibility: 'hidden' }}
      className={cn(
        'corridor-frame pointer-events-auto absolute top-1/2 left-1/2',
        // Fixed, not content-sized: a corridor only reads as one if every
        // doorway is the same opening. Sizing to content gave each frame its
        // own width and height, so the walls stepped in and out.
        'h-[70vh] w-[85vw] max-w-[1200px] px-10 md:px-16',
      )}
    >
      <div className="flex h-full flex-col justify-center">{children}</div>
    </section>
  );
}

function Counter({ current, total }: { current: number; total: number }) {
  return (
    <p
      data-counter
      className="pointer-events-none fixed top-[18px] right-5 z-50 text-[12px] text-muted-foreground tabular-nums sm:right-6"
    >
      {String(current).padStart(2, '0')}/{String(total).padStart(2, '0')}
    </p>
  );
}

/**
 * Scrolls the corridor to a frame. Exported so the nav can drive it.
 *
 * `instant` is for arriving on a deep link: flying the reader from the first
 * frame to the seventh on page load is a long trip through content they did not
 * ask to see, and smooth-scrolling before first layout gets cancelled anyway.
 */
export function goToFrame(index: number, instant = false) {
  const smooth =
    !instant && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: index * SCROLL_PER_FRAME, behavior: smooth ? 'smooth' : 'auto' });
}
