import { ArrowUpRight, Mail } from 'lucide-react';

import { Frame, goToFrame } from '@/components/site/corridor';
import { FRAMES } from '@/site-map';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { WhitewallsMark } from '@/components/ui/whitewalls-mark';
import { about, art, projects, site } from '@/content';

/**
 * The seven panels of the corridor.
 *
 * Structure is borrowed from the whitewalls preview: a small caps label, a
 * headline, a paragraph, and — where there is something worth showing — a
 * second column beside it. The register is this site's: near-black ground,
 * one accent-free palette, mono labels, and the metal pill as the only
 * material object.
 */

const LABEL = 'font-mono text-[10.5px] tracking-[0.26em] text-muted-foreground uppercase';
const HEADLINE = 'display mt-5 text-[clamp(1.9rem,3.9vw,3.2rem)] leading-[1.06] text-balance';
const BODY = 'mt-5 max-w-[46ch] text-[13.5px] leading-[1.8] text-muted-foreground';

function Split({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      className={
        right
          ? 'grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16'
          // A doorway is a fixed 85vw wide. A single column pinned to its left
          // edge leaves most of the opening empty and the frame looks broken
          // rather than spare, so single-column frames centre in it — the same
          // move the reference makes with .frame--single.
          : 'mx-auto max-w-[58ch]'
      }
    >
      <div>{left}</div>
      {right && <div className="min-w-0">{right}</div>}
    </div>
  );
}

/* ── 01 ─────────────────────────────────────────────────────────────────── */

export function HeroFrame() {
  return (
    <Frame index={0} id="top">
      <div className="text-center">
        <p className={LABEL}>{site.location}</p>
        <h1 className="display mt-6 text-[clamp(2.6rem,8vw,5.8rem)] leading-[0.98]">
          {site.name}
        </h1>
        <p className="mx-auto mt-7 max-w-[44ch] text-[clamp(0.95rem,1.35vw,1.05rem)] text-muted-foreground">
          {site.tagline}
          <span className="mt-1 block text-muted-foreground/70">{site.now}</span>
        </p>
        {/* Not #work / #contact. Every frame sits at the same document
            position inside the fixed scene, so an anchor scrolls nowhere —
            these two pills did nothing at all in the corridor. */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <LiquidMetalButton
            label="View the work"
            onClick={() => goToFrame(FRAMES.work.index, FRAMES.work.id)}
          />
          <LiquidMetalButton
            label="Get in touch"
            onClick={() => goToFrame(FRAMES.contact.index, FRAMES.contact.id)}
          />
        </div>
      </div>
    </Frame>
  );
}

/* ── 02 · the work, all of it on one wall ───────────────────────────────── */

/**
 * Three projects, one doorway.
 *
 * They had a frame each, which made the corridor claim the gallery work was
 * three times the journey it is, and forced a reader to fly past two walls to
 * learn there were only three. On one wall they can be compared at a glance:
 * name and discipline on the left, what it is on the right, ruled apart.
 */
export function WorkFrame({ index }: { index: number }) {
  return (
    <Frame index={index} id="work">
      <div className="flex items-baseline justify-between border-b border-white/[0.16] pb-4">
        <p className={LABEL}>Selected work</p>
        <p className={LABEL}>{String(projects.length).padStart(2, '0')}</p>
      </div>

      {/* Row spacing scales with the height available. At a fixed py-7 this wall
          needed 471px inside a 448px doorway on a 640px-tall screen and spilled
          out of the frame; the vh term gives it back on short screens without
          tightening anything on a normal one. first/last trim the outer padding
          so the block's ink is centred — with it, the wall sat 26px high at
          every size. */}
      <ul className="mt-6">
        {projects.map((p) => (
          <li
            key={p.id}
            className="grid gap-3 py-[clamp(0.7rem,2.4vh,1.75rem)] first:pt-0 last:pb-0 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-12"
          >
            <div>
              <h3 className="name relative flex items-center gap-2.5 text-[clamp(1.45rem,2.5vw,2rem)] leading-tight">
                {p.mark === 'whitewalls' && (
                  <WhitewallsMark
                    className="size-[0.68em] shrink-0 text-foreground/70 md:absolute md:top-[0.2em] md:right-full md:mr-2.5"
                  />
                )}
                {p.name}
              </h3>
              <p className={`${LABEL} mt-2`}>
                {p.role}
                {p.year && ` · ${p.year}`}
              </p>
            </div>

            <div>
              {/* Capped in characters, not pixels. The column is wide enough for 76
                  characters of Courier, which is a long way to track back to the
                  start of the next line, and every other paragraph on the site
                  sets around 46. */}
              <p className="max-w-[60ch] text-[13px] leading-[1.75] text-muted-foreground">
                {p.summary}
              </p>

              {p.pages && (
                <ul className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  {p.pages.map((pg, k) => (
                    <li key={pg.href} className="flex items-center gap-1.5">
                      {k > 0 && (
                        <span aria-hidden className="text-muted-foreground/25">
                          ·
                        </span>
                      )}
                      <a
                        href={pg.href}
                        className="font-mono text-[11.5px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                      >
                        {pg.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {p.href && (
                <a
                  href={p.href}
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Open the site
                  <ArrowUpRight size={11} className="opacity-70" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/* ── 05 · art ───────────────────────────────────────────────────────────── */

export function ArtFrame({ index }: { index: number }) {
  const frames = art.gallery.length
    ? art.gallery.map((g, i) => ({ ...g, ratio: ['4 / 5', '1 / 1', '3 / 4'][i % 3] }))
    : [{ ratio: '4 / 5' }, { ratio: '1 / 1' }, { ratio: '3 / 4' }];

  return (
    <Frame index={index} id="art">
      <Split
        left={
          <>
            <p className={LABEL}>Art</p>
            <h2 className={HEADLINE}>The other half of the work</h2>
            <p className={BODY}>{art.body}</p>
          </>
        }
        right={
          <div>
            <div className="flex items-end gap-4 sm:gap-6">
              {frames.map((f, i) => (
                <figure
                  key={i}
                  style={{ aspectRatio: f.ratio }}
                  className="w-[30%] max-w-[160px] min-w-0 border border-white/[0.14] bg-white/[0.015]"
                >
                  {'src' in f && f.src ? (
                    <img
                      src={f.src}
                      alt={('title' in f && f.title) || ''}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </figure>
              ))}
            </div>
            <div className="mt-4 border-t border-white/[0.07]" />
            <p className={`${LABEL} mt-3`}>
              {art.gallery.length ? 'Own work' : 'Own work — not up yet'}
            </p>
          </div>
        }
      />
    </Frame>
  );
}

/* ── 06 · about ─────────────────────────────────────────────────────────── */

export function AboutFrame({ index }: { index: number }) {
  return (
    <Frame index={index} id="about">
      <Split
        left={
          <>
            <p className={LABEL}>About</p>
            <p className="mt-6 text-[clamp(1rem,1.6vw,1.2rem)] leading-[1.6]">{about[0]}</p>
            {about[1] && <p className={BODY}>{about[1]}</p>}
          </>
        }
        right={
          <div className="md:pt-2">
            <p className={LABEL}>{site.disciplines.join(' · ')}</p>
            <p className={`${LABEL} mt-2`}>{site.education}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Out href={site.links.linkedin}>LinkedIn</Out>
              <Out href={site.links.github}>GitHub</Out>
              <Out href={site.links.resume}>Résumé</Out>
            </div>
          </div>
        }
      />
    </Frame>
  );
}

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowUpRight size={12} className="opacity-50 transition-opacity group-hover:opacity-90" />
    </a>
  );
}

/* ── 07 · contact ───────────────────────────────────────────────────────── */

export function ContactFrame({ index }: { index: number }) {
  return (
    <Frame index={index} id="contact">
      <div className="rounded-3xl border border-white/[0.09] bg-[#0a0a0c]/70 p-9 backdrop-blur-md md:p-12">
        <p className={LABEL}>Contact</p>
        <h2 className={HEADLINE}>A role, freelance, or something you want built.</h2>
        <p className={BODY}>
          Email is the fastest way to reach me. If you have a web app in mind and want scope,
          timing and cost back, send it through the intake form instead.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <LiquidMetalButton label="Email me" href={`mailto:${site.email}`} />
          <a
            href="/build"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-[13.5px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
          >
            Send a build request
            <ArrowUpRight size={14} className="opacity-70" />
          </a>
        </div>

        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-white/[0.07] pt-6 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Mail size={13} className="opacity-60" />
            <a className="transition-colors hover:text-foreground" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </span>
          <span className="ml-auto">
            © {new Date().getFullYear()} {site.name} · {site.location}
          </span>
        </div>
      </div>
    </Frame>
  );
}
