import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

import { LABEL, SECTION, WRAP } from '@/components/site/sections';
import { Reveal } from '@/components/ui/reveal';
import { projects, type Project } from '@/content';
import { cn } from '@/lib/utils';

/**
 * The work, as an index rather than a pitch.
 *
 * There is no headline and no framing paragraph above it on purpose — a
 * statement like "shipped, not presented" is a slogan, and a slogan turns a
 * showcase into an advert. The label, the four names and the years are enough
 * for someone to know what they are looking at.
 *
 * One row is expanded at a time: four projects in a grid all claim equal
 * weight, whereas a list lets a reader scan the names and open the one they
 * care about.
 */
export function Work() {
  const [openId, setOpenId] = useState<string>(projects[0].id);

  return (
    <section id="work" className={SECTION}>
      <div className={WRAP}>
        <Reveal>
          <div className="flex items-baseline justify-between">
            <p className={LABEL}>Selected work</p>
            <p className={LABEL}>{projects.length} projects</p>
          </div>
        </Reveal>

        <ul className="mt-8 border-t border-white/[0.07]">
          {projects.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 60} className="border-b border-white/[0.07]">
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
    <div className="group">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-baseline gap-4 py-5 text-left md:gap-7"
      >
        <span className="font-mono text-[10.5px] text-muted-foreground/70 tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>

        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
          <span
            className={cn(
              'text-[clamp(1.15rem,2vw,1.6rem)] font-medium tracking-[-0.028em] transition-colors',
              open ? 'text-foreground' : 'text-foreground/65 group-hover:text-foreground',
            )}
          >
            {project.name}
          </span>
          <span className={LABEL}>{project.role}</span>
        </span>

        <span className="hidden font-mono text-[10.5px] text-muted-foreground/70 tabular-nums sm:block">
          {project.year}
        </span>
      </button>

      {/* grid-rows 0fr→1fr animates height without measuring it */}
      <div
        id={panelId}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-6 pb-8 md:grid-cols-[1fr_1fr] md:gap-12 md:pl-[calc(0.65rem+1.75rem)]">
            <div>
              <p className="max-w-[46ch] text-[14.5px] leading-[1.65] text-muted-foreground">
                {project.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href={project.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
                >
                  Open
                  <ArrowUpRight size={12} className="opacity-70" />
                </a>
                {project.meta && <span className={LABEL}>{project.meta}</span>}
              </div>
            </div>

            <div>
              <ul className="space-y-2.5">
                {project.detail.map((d) => (
                  <li
                    key={d}
                    className="flex gap-2.5 text-[13.5px] leading-[1.6] text-muted-foreground"
                  >
                    <span aria-hidden className="mt-[0.55em] size-[3px] shrink-0 rounded-full bg-white/30" />
                    {d}
                  </li>
                ))}
              </ul>
              <p className={`${LABEL} mt-5`}>{project.tags.join(' · ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
