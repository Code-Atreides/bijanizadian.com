import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Fades a block up the first time it enters the viewport, then stops watching.
 *
 * A single IntersectionObserver per element is cheap and, unlike a scroll
 * listener, does no work while nothing is crossing the threshold. Anything the
 * observer cannot reach — a browser without IO, or a user who prefers reduced
 * motion — starts visible, so content is never gated behind an animation.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  /** ms, for staggering siblings */
  delay?: number;
  /** Widened to ElementType: a union of tag names makes TypeScript intersect
   *  every element's ref type, which nothing can satisfy. */
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(
    () =>
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
