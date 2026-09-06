import { ArrowUpRight, Mail } from 'lucide-react';

import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { Reveal } from '@/components/ui/reveal';
import { about, site } from '@/content';

/**
 * Spacing scale for the whole page. Sections were on py-28/py-40, which left
 * ~320px of dead ground between blocks and made the page read as a deck of
 * slides. One step down, and consistent.
 */
export const SECTION = 'relative scroll-mt-24 py-16 md:py-24';
export const WRAP = 'mx-auto max-w-5xl px-6';
export const LABEL =
  'font-mono text-[10.5px] tracking-[0.26em] text-muted-foreground uppercase';

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

export function Hero() {
  return (
    <section id="top" className="relative grid min-h-[92svh] place-items-center px-6 pt-14">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <Reveal>
          <p className={LABEL}>{site.location}</p>
        </Reveal>

        <Reveal delay={90}>
          <h1 className="mt-6 text-[clamp(2.5rem,9vw,6.5rem)] leading-[0.9] font-medium tracking-[-0.045em]">
            {site.name}
          </h1>
        </Reveal>

        <Reveal delay={170}>
          <p className="mt-7 text-[clamp(0.95rem,1.35vw,1.05rem)] text-muted-foreground">
            {site.tagline}
            <span className="mt-1 block text-muted-foreground/70">{site.now}</span>
          </p>
        </Reveal>

        <Reveal delay={250}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <LiquidMetalButton label="View the work" href="#work" />
            <LiquidMetalButton label="Get in touch" href="#contact" />
          </div>
        </Reveal>
      </div>

      <a
        href="#work"
        aria-label="Scroll to the work"
        className="absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[9.5px] tracking-[0.3em] text-muted-foreground/60 uppercase transition-colors hover:text-foreground"
      >
        Scroll
      </a>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  About                                                                      */
/* -------------------------------------------------------------------------- */

export function About() {
  return (
    <section id="about" className={SECTION}>
      <div className={WRAP}>
        <div className="grid gap-8 md:grid-cols-[8rem_1fr] md:gap-16">
          <Reveal>
            <p className={`${LABEL} md:pt-2`}>About</p>
          </Reveal>

          <div className="max-w-2xl">
            {about.map((p, i) => (
              <Reveal key={p} delay={i * 80}>
                <p
                  className={
                    i === 0
                      ? 'text-[clamp(1.05rem,1.8vw,1.3rem)] leading-[1.55]'
                      : 'mt-4 text-[15px] leading-[1.65] text-muted-foreground'
                  }
                >
                  {p}
                </p>
              </Reveal>
            ))}

            <Reveal delay={200}>
              <div className="mt-9 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className={LABEL}>{site.disciplines.join(' · ')}</p>
                <span aria-hidden className="text-muted-foreground/30">/</span>
                <p className={LABEL}>{site.education}</p>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
                <ExternalLink href={site.links.linkedin}>LinkedIn</ExternalLink>
                <ExternalLink href={site.links.github}>GitHub</ExternalLink>
                <ExternalLink href={site.links.resume}>Résumé</ExternalLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
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

/* -------------------------------------------------------------------------- */
/*  Contact — left as it was, per your note that this one works                */
/* -------------------------------------------------------------------------- */

export function Contact() {
  return (
    <section id="contact" className={SECTION}>
      <div className={WRAP}>
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0a0a0c]/75 p-10 backdrop-blur-md md:p-14">
            <p className={LABEL}>Contact</p>
            <h2 className="mt-5 max-w-2xl text-[clamp(1.85rem,3.8vw,2.85rem)] leading-[1.05] font-medium tracking-[-0.035em]">
              A role, freelance, or something you want built.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-[1.65] text-muted-foreground">
              Email is the fastest way to reach me. If you have a web app in mind and want
              scope, timing and cost back, send it through the intake form instead.
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

            <p className="mt-8 flex items-center gap-2 text-[13.5px] text-muted-foreground">
              <Mail size={14} className="opacity-60" />
              <a className="transition-colors hover:text-foreground" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
