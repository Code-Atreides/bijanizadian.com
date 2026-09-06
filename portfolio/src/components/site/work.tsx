import { ArrowUpRight } from 'lucide-react';

import { LABEL, SECTION, WRAP } from '@/components/site/sections';
import { Reveal } from '@/components/ui/reveal';
import { WhitewallsMark } from '@/components/ui/whitewalls-mark';
import { art, pages, work } from '@/content';

/**
 * One project, stated once.
 *
 * This was a two-column block, four detail bullets and an eight-row table with
 * a note beside every row. The notes mostly restated the page names, and the
 * bullets said in four sentences what one paragraph says. What is left: the
 * name, a paragraph, the disciplines, and the eight pages as a row of links —
 * which is the fastest way for a reader to get into the actual work.
 */
export function Work() {
  return (
    <section id="work" className={SECTION}>
      <div className={WRAP}>
        <Reveal>
          <div className="flex items-baseline justify-between border-b border-white/[0.07] pb-4">
            <p className={LABEL}>Selected work</p>
            <p className={LABEL}>{work.year}</p>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.035em]">
              {work.name}
            </h2>
            <p className={LABEL}>{work.role}</p>
          </div>
        </Reveal>

        <Reveal delay={110}>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.7] text-muted-foreground">
            {work.summary}
          </p>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={work.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
            >
              Open the site
              <ArrowUpRight size={13} className="opacity-70" />
            </a>
          </div>
        </Reveal>

        {/* the eight surfaces, as one line rather than a table */}
        <Reveal delay={210}>
          <ul className="mt-9 flex flex-wrap items-center gap-x-1.5 gap-y-2 border-t border-white/[0.07] pt-6">
            {pages.map((pg, i) => (
              <li key={pg.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden className="text-muted-foreground/25">
                    ·
                  </span>
                )}
                <a
                  href={pg.href}
                  className="font-mono text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {pg.name}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Art-world work. Renders nothing until content.art.body is written, so the
 * live page never carries a placeholder.
 */
export function Art() {
  if (!art.body) return null;

  return (
    <section id="art" className={SECTION}>
      <div className={WRAP}>
        <Reveal>
          <div className="flex items-baseline justify-between border-b border-white/[0.07] pb-4">
            <p className={LABEL}>Art</p>
            {art.year && <p className={LABEL}>{art.year}</p>}
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            {art.logo ? (
              <img src={art.logo} alt={art.org} className="h-7 w-auto opacity-85 grayscale" loading="lazy" />
            ) : (
              <h2 className="flex items-center gap-3 text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.035em]">
                <WhitewallsMark className="size-[0.78em] shrink-0 text-foreground/75" />
                {art.org}
              </h2>
            )}
            {art.role && <p className={LABEL}>{art.role}</p>}
          </div>
        </Reveal>

        <Reveal delay={110}>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.7] text-muted-foreground">
            {art.body}
          </p>
        </Reveal>

        {/* The hang. Three frames on a wall line — empty until there are
            images, and captioned so the emptiness reads as deliberate rather
            than broken. Proportions are portrait / square / landscape so the
            row has the rhythm of an actual wall rather than a grid. */}
        <Reveal delay={200}>
          <div className="mt-12">
            <div className="flex items-end gap-4 sm:gap-7">
              {(art.gallery.length
                ? art.gallery.map((g, i) => ({ ...g, ratio: ['4 / 5', '1 / 1', '3 / 4'][i % 3] }))
                : [{ ratio: '4 / 5' }, { ratio: '1 / 1' }, { ratio: '3 / 4' }]
              ).map((frame, i) => (
                <figure
                  key={i}
                  style={{ aspectRatio: frame.ratio }}
                  className="w-[26%] max-w-[190px] min-w-0 border border-white/[0.13] bg-white/[0.015]"
                >
                  {'src' in frame && frame.src ? (
                    <img
                      src={frame.src}
                      alt={('title' in frame && frame.title) || ''}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </figure>
              ))}
            </div>
            {/* the wall line the frames hang against */}
            <div className="mt-4 border-t border-white/[0.07]" />
            <p className={`${LABEL} mt-3`}>
              {art.gallery.length ? 'Own work' : 'Own work — not up yet'}
            </p>
          </div>
        </Reveal>

        {art.href && (
          <Reveal delay={160}>
            <a
              href={art.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
            >
              Open
              <ArrowUpRight size={13} className="opacity-70" />
            </a>
          </Reveal>
        )}
      </div>
    </section>
  );
}
