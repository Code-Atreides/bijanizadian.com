import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { site } from '@/content';

const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#capabilities', label: 'What I do' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
] as const;

/**
 * Fixed chrome. It starts transparent over the hero and takes on its glass only
 * once the page has moved, so the first screen is the dot field and the name
 * and nothing else.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section currently in the middle of the viewport.
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    for (const s of sections) io.observe(s);
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500',
        scrolled
          ? 'border-b border-white/[0.07] bg-black/55 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <a
          href="#top"
          className="text-[15px] font-medium tracking-[-0.02em] transition-opacity hover:opacity-70"
        >
          {site.name}
        </a>

        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13.5px] transition-colors',
                  active === l.href.slice(1)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <span className="ml-auto flex items-center gap-2 md:ml-0">
          <span className="relative flex size-1.5">
            {site.status.available && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70 [animation-duration:2.6s] motion-reduce:hidden" />
            )}
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">
            {site.status.label}
          </span>
        </span>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.07]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-8 text-[13px] text-muted-foreground">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span className="hidden sm:inline">{site.location}</span>
        <a className="ml-auto transition-colors hover:text-foreground" href={`mailto:${site.email}`}>
          {site.email}
        </a>
      </div>
    </footer>
  );
}
