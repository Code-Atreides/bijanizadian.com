import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

import { Reveal } from '@/components/ui/reveal';
import { projects, type Project } from '@/content';
import { cn } from '@/lib/utils';

/**
 * The work, as a selectable list rather than a wall of cards.
 *
 * A portfolio's problem is that every project looks equally important in a
 * grid. A list with one expanded record borrows the shape of a case file: the
 * reader scans four names, picks one, and gets its detail without leaving the
 * section or losing the others.
 */
export function Work() {
  const [openId, setOpenId] = useState<string>(projects[0].id);

  return (
    <section id="work" className="relative scroll-mt-20 py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
            Selected work
          </p>
          <h2 className="mt-5 max-w-2xl text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.02] font-medium tracking-[-0.038em]">
            Shipped, not presented.
          </h2>
          <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
            Every project below is live. The links go to the real page, not a case-study
            screenshot of one.
          </p>
        </Reveal>

        <ul className="mt-14 divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {projects.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 70}>
              <Row project={p} open={openId === p.id} onOpen={() => setOpenId(p.id)} index={i} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Row({
  project,
  open,
  onOpen,
  index,
}: {
  project: Project;
  open: boolean;
  onOpen: () => void;
  index: number;
}) {
  const panelId = `work-panel-${project.id}`;

  return (
    <div className={cn('group transition-colors', open && 'bg-white/[0.015]')}>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-baseline gap-5 px-1 py-7 text-left md:gap-8 md:px-3"
      >
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span
              className={cn(
                'text-[clamp(1.35rem,2.6vw,2rem)] font-medium tracking-[-0.03em] transition-colors',
                open ? 'text-foreground' : 'text-foreground/70 group-hover:text-foreground',
              )}
            >
              {project.name}
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">
              {project.role}
            </span>
          </span>
        </span>

        <span className="hidden font-mono text-[11px] text-muted-foreground tabular-nums sm:block">
          {project.year}
        </span>
      </button>

      {/* Grid-rows 0fr→1fr animates height without measuring it. */}
      <div
        id={panelId}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-8 px-1 pb-10 md:grid-cols-[1.1fr_1fr] md:gap-14 md:px-3">
            <div>
              <p className="max-w-prose text-[15.5px] leading-relaxed text-muted-foreground">
                {project.summary}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={project.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[13.5px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
                >
                  Open {project.name}
                  <ArrowUpRight size={14} className="opacity-70" />
                </a>
                {project.meta && (
                  <span className="font-mono text-[10.5px] tracking-[0.14em] text-muted-foreground uppercase">
                    {project.meta}
                  </span>
                )}
              </div>
            </div>

            <div>
              <ul className="space-y-3">
                {project.detail.map((d) => (
                  <li key={d} className="flex gap-3 text-[14px] leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-white/35" />
                    {d}
                  </li>
                ))}
              </ul>
              <ul className="mt-6 flex flex-wrap gap-2">
                {project.tags.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
