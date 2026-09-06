import { ArrowUpRight } from 'lucide-react';

import { LABEL, SECTION, WRAP } from '@/components/site/sections';
import { Reveal } from '@/components/ui/reveal';
import { WhitewallsMark } from '@/components/ui/whitewalls-mark';
import { art, projects, type Project } from '@/content';

/**
 * Three bodies of work, one row each.
 *
 * Deliberately not the accordion this started as: with three entries of
 * genuinely different size, hiding two behind a click makes a reader work to
 * find out there is anything besides fomo. Everything is open, and the only
 * entry carrying an index beneath it is the only one that has eight pages.
 */
export function Work() {
  return (
    <section id="work" className={SECTION}>
      <div className={WRAP}>
        <Reveal>
          <div className="flex items-baseline justify-between border-b border-white/[0.07] pb-4">
            <p className={LABEL}>Selected work</p>
            <p className={LABEL}>{projects.length} projects</p>
          </div>
        </Reveal>

        <div className="divide-y divide-white/[0.07]">
          {projects.map((p, i) => (
            <Reveal key={p.id} delay={i * 70}>
              <Entry project={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Entry({ project }: { project: Project }) {
  return (
    <article className="py-9">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <h3 className="flex items-center gap-3 text-[clamp(1.4rem,2.7vw,2rem)] font-medium tracking-[-0.035em]">
          {project.mark === 'whitewalls' && (
            <WhitewallsMark className="size-[0.72em] shrink-0 text-foreground/75" />
          )}
          {project.name}
        </h3>
        <p className={LABEL}>{project.role}</p>
        {project.year && <p className={`${LABEL} ml-auto`}>{project.year}</p>}
      </div>

      <p className="mt-4 max-w-[62ch] text-[14.5px] leading-[1.7] text-muted-foreground">
        {project.summary}
      </p>

      {project.href && (
        <a
          href={project.href}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
        >
          Open the site
          <ArrowUpRight size={13} className="opacity-70" />
        </a>
      )}

      {project.pages && (
        <ul className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {project.pages.map((pg, i) => (
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
      )}
    </article>
  );
}

/**
 * The art practice — his own work, as distinct from the gallery clients above.
 *
 * No images yet, so the section hangs empty frames on a wall line and captions
 * them as such: portrait, square, landscape, so the row has the rhythm of a
 * real hang rather than a grid.
 */
export function Art() {
  const frames = art.gallery.length
    ? art.gallery.map((g, i) => ({ ...g, ratio: ['4 / 5', '1 / 1', '3 / 4'][i % 3] }))
    : [{ ratio: '4 / 5' }, { ratio: '1 / 1' }, { ratio: '3 / 4' }];

  return (
    <section id="art" className={SECTION}>
      <div className={WRAP}>
        <Reveal>
          <p className={`${LABEL} border-b border-white/[0.07] pb-4`}>Art</p>
        </Reveal>

        <Reveal delay={60}>
          <p className="mt-8 max-w-[52ch] text-[clamp(1.05rem,1.8vw,1.3rem)] leading-[1.55]">
            {art.body}
          </p>
        </Reveal>

        <Reveal delay={130}>
          <div className="mt-11">
            <div className="flex items-end gap-4 sm:gap-7">
              {frames.map((frame, i) => (
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
            {/* the wall the frames hang on */}
            <div className="mt-4 border-t border-white/[0.07]" />
            <p className={`${LABEL} mt-3`}>
              {art.gallery.length ? 'Own work' : 'Own work — not up yet'}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
