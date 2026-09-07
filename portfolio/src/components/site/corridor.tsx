import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

/** Native page scrolling moves the camera through equally spaced walls. */
const SPACING = 1600;
const PERSPECTIVE = 2200;
const SCROLL_PER_FRAME = 780;
const NEAR = 0.55;
const FAR = 3.4;

// Keep the matching media query in index.css in sync.
const FLAT = '(prefers-reduced-motion: reduce), (max-width: 899px), (max-height: 599px)';
const NAVIGATE_EVENT = 'corridor:navigate';
const LABELS: Record<string, string> = {
  top: 'Introduction',
  work: 'Selected work',
  art: 'Art',
  about: 'About',
  contact: 'Contact',
};

type Ctx = { register: (el: HTMLElement | null, index: number) => void; flat: boolean };
const CorridorCtx = createContext<Ctx | null>(null);

let activeFrame = 0;
const subscribers = new Set<() => void>();
let pendingFocus: { index: number; expires: number } | null = null;

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}

/** Zero-based visible section, shared with navigation outside the scene. */
export function useCurrentFrame() {
  return useSyncExternalStore(subscribe, () => activeFrame, () => 0);
}

function publishFrame(index: number) {
  if (activeFrame === index) return;
  activeFrame = index;
  subscribers.forEach((listener) => listener());
}

function useFlatLayout() {
  const [flat, setFlat] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(FLAT).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(FLAT);
    const onChange = () => setFlat(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return flat;
}

function hashId() {
  try {
    return decodeURIComponent(window.location.hash.slice(1)).toLowerCase();
  } catch {
    return '';
  }
}

function frameElement(index: number, id?: string) {
  return (id ? document.getElementById(id) : null)
    ?? document.querySelector<HTMLElement>(`[data-frame-index="${index}"]`);
}

function scrollToFrame(index: number, el: HTMLElement | null | undefined, behavior: ScrollBehavior) {
  if (window.matchMedia(FLAT).matches) {
    if (el) el.scrollIntoView({ behavior, block: 'start' });
    else window.scrollTo({ top: 0, behavior });
  } else {
    window.scrollTo({ top: index * SCROLL_PER_FRAME, behavior });
  }
}

export function Corridor({ count, children }: { count: number; children: React.ReactNode }) {
  const flat = useFlatLayout();
  const current = useCurrentFrame();
  const frames = useRef<Array<HTMLElement | null>>([]);
  const previousLayout = useRef<boolean | null>(null);

  const register = useCallback((el: HTMLElement | null, index: number) => {
    frames.current[index] = el;
  }, []);
  const ctx = useMemo(() => ({ register, flat }), [register, flat]);

  useEffect(() => {
    const prior = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => { history.scrollRestoration = prior; };
  }, []);

  useLayoutEffect(() => {
    let raf = 0;
    let idle = 0;
    const clampIndex = (index: number) => Math.min(count - 1, Math.max(0, index));

    const paint = () => {
      raf = 0;
      if (flat) {
        const readingLine = Math.min(window.innerHeight * 0.35, 260);
        let index = 0;
        frames.current.forEach((el, i) => {
          if (el && el.getBoundingClientRect().top <= readingLine) index = i;
        });
        if (window.scrollY > 0
          && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
          index = count - 1;
        }
        publishFrame(clampIndex(index));
        return;
      }

      const progress = Math.max(0, Math.min(count - 1, window.scrollY / SCROLL_PER_FRAME));
      const index = clampIndex(Math.round(progress));
      const front = frames.current[index];

      // Receding walls stay visible, but only the closest wall is interactive.
      // Activate the new wall before transferring focus out of the old one.
      if (front && front.dataset.active !== '1') {
        // End/Home and history can jump to a wall that was fully hidden.
        // It must be visible before focus can leave the departing wall.
        front.style.visibility = 'visible';
        front.removeAttribute('inert');
        front.removeAttribute('aria-hidden');
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && frames.current.some(
          (el, i) => i !== index && el?.contains(focused),
        )) {
          front.focus({ preventScroll: true });
        }
      }

      for (let i = 0; i < frames.current.length; i++) {
        const el = frames.current[i];
        if (!el) continue;
        const distance = progress - i;
        const visible = distance > -FAR && distance < NEAR;
        const interactive = i === index;

        const visibilityState = visible ? '1' : '0';
        if (el.dataset.on !== visibilityState) {
          el.dataset.on = visibilityState;
          el.style.visibility = visible ? 'visible' : 'hidden';
        }
        const activeState = interactive ? '1' : '0';
        if (el.dataset.active !== activeState) {
          el.dataset.active = activeState;
          el.style.pointerEvents = interactive ? 'auto' : 'none';
          el.toggleAttribute('inert', !interactive);
          if (!interactive) el.setAttribute('aria-hidden', 'true');
        }
        if (!visible) continue;

        const behind = Math.max(0, -distance);
        const passing = Math.max(0, distance);
        const fade = passing > 0 ? Math.pow(Math.max(0, 1 - passing / NEAR), 1.6) : 1;

        // Let the next three doorways read through the current wall, with a
        // soft far edge. Their typography still disappears a full room away.
        const farFade = Math.min(1, Math.max(0, (FAR - behind) / 0.6));
        el.style.opacity = String(Math.pow(0.9, behind) * fade * farFade);
        const content = el.firstElementChild as HTMLElement | null;
        if (content) content.style.opacity = String(Math.pow(Math.max(0, 1 - behind), 3));
        // Exponential falloff leaves each room a floor. The former linear
        // curve reached zero before the second doorway and cut the hall off.
        el.style.setProperty('--floor', String(Math.pow(0.76, behind)));
        // Keep a one-pixel projected line; depth should dim the floor through
        // opacity, rather than also shrinking it to a disappearing subpixel.
        el.style.setProperty('--floor-width', `${1 + behind * SPACING / PERSPECTIVE}px`);
        el.style.transform = `translate(-50%, -50%) translateZ(${distance * SPACING}px)`;
      }

      if (pendingFocus) {
        if (performance.now() > pendingFocus.expires) pendingFocus = null;
        else if (Math.abs(progress - pendingFocus.index) < 0.04) {
          frames.current[pendingFocus.index]?.focus({ preventScroll: true });
          pendingFocus = null;
        }
      }
      publishFrame(index);
    };

    const setHint = (moving: boolean) => {
      if (flat) return;
      for (const el of frames.current) {
        if (el) el.style.willChange = moving ? 'transform, opacity' : 'auto';
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
    const restoreHash = () => {
      const hash = hashId();
      const index = hash ? frames.current.findIndex((el) => el?.id.toLowerCase() === hash) : 0;
      if (index < 0) return;
      pendingFocus = null;
      scrollToFrame(index, frames.current[index], 'auto');
      if (!raf) raf = requestAnimationFrame(paint);
    };

    // Resizing or changing motion preferences preserves the section being read.
    if (previousLayout.current !== null && previousLayout.current !== flat) {
      const index = clampIndex(activeFrame);
      pendingFocus = null;
      scrollToFrame(index, frames.current[index], 'auto');
    } else if (previousLayout.current === null) {
      if (window.location.hash) restoreHash();
      else window.scrollTo({ top: 0, behavior: 'auto' });
    }
    previousLayout.current = flat;
    cancelAnimationFrame(raf);
    paint();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('hashchange', restoreHash);
    window.addEventListener('popstate', restoreHash);
    window.addEventListener(NAVIGATE_EVENT, onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      setHint(false);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', restoreHash);
      window.removeEventListener('popstate', restoreHash);
      window.removeEventListener(NAVIGATE_EVENT, onScroll);
    };
  }, [flat, count]);

  return (
    <CorridorCtx.Provider value={ctx}>
      {flat ? (
        <div className="corridor-flat">{children}</div>
      ) : (
        <>
          <div
            className="corridor-scene pointer-events-none fixed inset-0 z-10 overflow-hidden"
            style={{ perspective: `${PERSPECTIVE}px`, perspectiveOrigin: '50% 48%' }}
          >
            <div className="relative size-full" style={{ transformStyle: 'preserve-3d' }}>
              {children}
            </div>
          </div>
          <div aria-hidden className="corridor-floor pointer-events-none fixed inset-0 z-20" />
          <div
            aria-hidden
            style={{ height: `calc(${(count - 1) * SCROLL_PER_FRAME}px + 100svh)` }}
          />
          <Progress current={current} total={count} frames={frames.current} />
        </>
      )}
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
  const auto = useId();
  const register = ctx?.register;
  const attach = useCallback((el: HTMLElement | null) => register?.(el, index), [register, index]);
  const flat = ctx?.flat ?? true;

  return (
    <section
      id={id ?? auto}
      ref={attach}
      data-frame-index={index}
      data-active={flat ? '1' : undefined}
      tabIndex={-1}
      inert={!flat}
      aria-hidden={flat ? undefined : true}
      style={flat ? undefined : { visibility: 'hidden' }}
      className={flat ? 'corridor-section' : 'corridor-frame absolute top-1/2 left-1/2'}
    >
      <div className="corridor-content">{children}</div>
    </section>
  );
}

function Progress({
  current,
  total,
  frames,
}: {
  current: number;
  total: number;
  frames: Array<HTMLElement | null>;
}) {
  const atEnd = current === total - 1;
  const next = atEnd ? 0 : current + 1;
  const label = (index: number) => LABELS[frames[index]?.id ?? ''] ?? Object.values(LABELS)[index] ?? `Section ${index + 1}`;

  return (
    <nav className="corridor-progress" aria-label="Portfolio sections">
      <div className="corridor-progress-position">
        <span className="corridor-progress-index" aria-hidden="true">
          <span>{String(current + 1).padStart(2, '0')}</span>
          <span> / {String(total).padStart(2, '0')}</span>
        </span>
        <span className="corridor-progress-label">{label(current)}</span>
      </div>
      <ol className="corridor-progress-track">
        {Array.from({ length: total }, (_, index) => (
          <li key={index}>
            <button
              type="button"
              className="corridor-progress-step"
              aria-label={`Go to ${label(index)}`}
              aria-current={current === index ? 'step' : undefined}
              data-past={index < current ? 'true' : undefined}
              onClick={() => goToFrame(index, frames[index]?.id)}
            >
              <span />
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="corridor-progress-next"
        onClick={() => goToFrame(next, frames[next]?.id)}
      >
        <span>{atEnd ? 'Back to start' : current === 0 ? 'Scroll to explore' : `Next: ${label(next)}`}</span>
        {atEnd ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />}
      </button>
    </nav>
  );
}

/** Navigate in either layout, retaining ordinary deep links and browser history. */
export function goToFrame(index: number, id?: string, instant = false) {
  const el = frameElement(index, id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = instant || reduced ? 'auto' : 'smooth';
  const targetId = el?.id ?? id;
  if (targetId) {
    const url = new URL(window.location.href);
    url.hash = targetId;
    if (url.hash !== window.location.hash) history.pushState(history.state, '', url);
  }

  if (window.matchMedia(FLAT).matches) {
    pendingFocus = null;
    el?.focus({ preventScroll: true });
  } else {
    pendingFocus = { index, expires: performance.now() + 2500 };
  }
  scrollToFrame(index, el, behavior);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}
