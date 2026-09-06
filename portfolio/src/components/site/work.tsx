import { ArrowUpRight } from 'lucide-react';

import { LABEL, SECTION, WRAP } from '@/components/site/sections';
import { Reveal } from '@/components/ui/reveal';
import { pages, work } from '@/content';

/**
 * One project, given the room a single project deserves.
 *
 * The accordion this replaced existed to rank four entries against each other.
 * With one body of work there is nothing to rank, so the section reads as a
 * record instead: what it is, what is in it, and an index of the eight live
 * surfaces — each of which a reader can open and poke at, which is worth more
 * than four names in a list.
 */
export function Work() {
  return (
    <section id="work" className={SECTION}>
      <div className={WRAP}>
        <Reveal>
          <div className="flex items-baseline justify-between border-b border-white/[0.07] pb-5">
            <p className={LABEL}>Selected work</p>
            <p className={LABEL}>{work.year}</p>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-9 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <h2 className="text-[clamp(1.6rem,3.4vw,2.6rem)] font-medium tracking-[-0.035em]">
              {work.name}
            </h2>
            <p className={LABEL}>{work.role}</p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-10 md:grid-cols-[1fr_1fr] md:gap-14">
          <Reveal delay={110}>
            <p className="max-w-[48ch] text-[15px] leading-[1.7] text-muted-foreground">
              {work.summary}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={work.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
              >
                Open the site
                <ArrowUpRight size={13} className="opacity-70" />
              </a>
              <span className={LABEL}>{pages.length} pages</span>
            </div>
          </Reveal>

          <Reveal delay={170}>
            <ul className="space-y-3">
              {work.detail.map((d) => (
                <li key={d} className="flex gap-3 text-[13.5px] leading-[1.65] text-muted-foreground">
                  <span aria-hidden className="mt-[0.6em] size-[3px] shrink-0 rounded-full bg-white/30" />
                  {d}
                </li>
              ))}
            </ul>
            <p className={`${LABEL} mt-6`}>{work.tags.join(' · ')}</p>
          </Reveal>
        </div>

        {/* the surfaces — an index, not a gallery */}
        <Reveal delay={220}>
          <p className={`${LABEL} mt-14`}>The pages</p>
        </Reveal>

        {/* One Reveal for the whole index rather than eight. Revealing rows
            individually left the ones below the fold as invisible placeholders
            holding open a column of empty space. */}
        <Reveal delay={240}>
          <ul className="mt-4 border-t border-white/[0.07]">
            {pages.map((pg, i) => (
              <li key={pg.href}>
                <a
                  href={pg.href}
                  className="group flex items-baseline gap-4 border-b border-white/[0.07] py-3.5 transition-colors hover:bg-white/[0.02] md:gap-6"
              >
                  <span className="font-mono text-[10.5px] text-muted-foreground/60 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="w-[7.5rem] shrink-0 font-mono text-[12.5px] text-foreground/85 transition-colors group-hover:text-foreground">
                    {pg.name}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] text-muted-foreground">{pg.note}</span>
                  <ArrowUpRight
                    size={13}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
