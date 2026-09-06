import { ArrowUpRight, Mail } from 'lucide-react';

import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { Reveal } from '@/components/ui/reveal';
import { about, capabilities, site } from '@/content';

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The first screen is the dot field, the name, and two pills. The wave crests
 * around the lower third, so the name sits above the horizon and the buttons
 * sit in it.
 */
export function Hero() {
  return (
    <section id="top" className="relative grid min-h-dvh place-items-center px-6 pt-14">
      <div className="flex w-full max-w-4xl flex-col items-center text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
            {site.location}
          </p>
        </Reveal>

        <Reveal delay={90}>
          <h1 className="mt-7 text-[clamp(2.75rem,10.5vw,8rem)] leading-[0.88] font-medium tracking-[-0.05em]">
            {site.name}
          </h1>
        </Reveal>

        <Reveal delay={180}>
          <p className="mx-auto mt-8 max-w-[46ch] text-[clamp(0.95rem,1.5vw,1.15rem)] leading-relaxed text-muted-foreground">
            {site.tagline}
          </p>
        </Reveal>

        <Reveal delay={270}>
          <div className="mt-11 flex flex-wrap items-center justify-center gap-5">
            <LiquidMetalButton label="View the work" href="#work" />
            <LiquidMetalButton label="Get in touch" href="#contact" />
          </div>
        </Reveal>
      </div>

      <a
        href="#work"
        aria-label="Scroll to the work"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70 uppercase transition-colors hover:text-foreground"
      >
        Scroll
      </a>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Capabilities                                                               */
/* -------------------------------------------------------------------------- */

export function Capabilities() {
  return (
    <section id="capabilities" className="relative scroll-mt-20 py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
            What I do
          </p>
          <h2 className="mt-5 max-w-2xl text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.02] font-medium tracking-[-0.038em]">
            Four things, done properly.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-2">
          {capabilities.map((c, i) => (
            <Reveal key={c.title} delay={i * 70}>
              <article className="h-full bg-[#0a0a0c]/85 p-8 backdrop-blur-sm md:p-10">
                <h3 className="text-[1.35rem] font-medium tracking-[-0.025em]">{c.title}</h3>
                <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">{c.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  About                                                                      */
/* -------------------------------------------------------------------------- */

export function About() {
  return (
    <section id="about" className="relative scroll-mt-20 py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-[auto_1fr] md:gap-24">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.28em] text-muted-foreground uppercase md:pt-3">
              About
            </p>
          </Reveal>

          <div className="max-w-2xl">
            {about.map((p, i) => (
              <Reveal key={p} delay={i * 90}>
                <p
                  className={
                    i === 0
                      ? 'text-[clamp(1.25rem,2.4vw,1.75rem)] leading-[1.35] font-medium tracking-[-0.028em]'
                      : 'mt-6 text-[15.5px] leading-relaxed text-muted-foreground'
                  }
                >
                  {p}
                </p>
              </Reveal>
            ))}

            <Reveal delay={270}>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3">
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
      className="group inline-flex items-center gap-1.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowUpRight size={13} className="opacity-50 transition-opacity group-hover:opacity-90" />
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Contact                                                                    */
/* -------------------------------------------------------------------------- */

export function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-20 py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0a0a0c]/75 p-10 backdrop-blur-md md:p-16">
            <p className="font-mono text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
              Contact
            </p>
            <h2 className="mt-5 max-w-2xl text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.02] font-medium tracking-[-0.038em]">
              A role, freelance, or something you want built.
            </h2>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
              Email is the fastest way to reach me. If you have a web app in mind and want
              scope, timing and cost back, send it through the intake form instead.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <LiquidMetalButton label="Email me" href={`mailto:${site.email}`} />
              <a
                href="/build"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-[13.5px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.08]"
              >
                Send a build request
                <ArrowUpRight size={14} className="opacity-70" />
              </a>
            </div>

            <p className="mt-9 flex items-center gap-2 text-[13.5px] text-muted-foreground">
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
