import { ArrowDown, ArrowUpRight } from 'lucide-react';

import { Frame, goToFrame } from '@/components/site/corridor';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { WhitewallsMark } from '@/components/ui/whitewalls-mark';
import { about, art, projects, site } from '@/content';
import { FRAMES } from '@/site-map';

// The project demonstrations live on the main site, including during local preview.
function siteHref(href: string) {
  return href.startsWith('/') ? `https://${site.domain}${href}` : href;
}

function WallLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <p className="wall-label">
      <span className="wall-label-number" aria-hidden="true">{number}</span>
      {children}
    </p>
  );
}

export function HeroFrame() {
  return (
    <Frame index={0} id="top">
      <div className="hero-layout">
        <div className="hero-identity">
          <WallLabel number="01">Personal portfolio</WallLabel>
          <h1 className="hero-name display" aria-label={site.name}>
            <span>bijan</span>
            <span>izadian</span>
          </h1>
        </div>
        <div className="hero-intro">
          <p className="eyebrow hero-location"><span aria-hidden="true" />{site.location}</p>
          <p className="hero-description">Brand, copy<br /> &amp; front end.</p>
          <p className="body-copy hero-context">For early-stage companies.<br />{site.now}</p>
          <div className="hero-actions">
            <LiquidMetalButton
              label="View the work"
              onClick={() => goToFrame(FRAMES.work.index, FRAMES.work.id)}
            />
            <a href="#contact" className="text-link" onClick={(event) => {
              event.preventDefault();
              goToFrame(FRAMES.contact.index, FRAMES.contact.id);
            }}>
              Get in touch <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function WorkFrame({ index }: { index: number }) {
  return (
    <Frame index={index} id="work">
      <div className="work-heading">
        <WallLabel number="02">Selected work</WallLabel>
        <span className="eyebrow work-count">{String(projects.length).padStart(2, '0')} projects</span>
      </div>
      <ul className="project-list">
        {projects.map((project, index) => (
          <li key={project.id} className="project-row">
            <div className="project-identity">
              <span className="project-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h2 className="project-name name">
                {project.mark === 'whitewalls' && <WhitewallsMark className="project-mark" />}
                {project.href ? (
                  <a href={siteHref(project.href)} target="_blank" rel="noopener noreferrer" className="project-title-link">
                    {project.name}<ArrowUpRight className="project-arrow" size={21} aria-hidden="true" />
                  </a>
                ) : project.name}
              </h2>
              <p className="project-role">{project.role}{project.year && <span> / {project.year}</span>}</p>
            </div>
            <div className="project-detail">
              <p className="body-copy">{project.summary}</p>
              {project.pages && (
                <ul className="project-pages" aria-label={`${project.name} pages`}>
                  {project.pages.map((page) => (
                    <li key={page.href}>
                      <a href={siteHref(page.href)} target="_blank" rel="noopener noreferrer">{page.name}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function ArtFrame({ index }: { index: number }) {
  return (
    <Frame index={index} id="art">
      <div className="wall-split art-layout">
        <div className="wall-copy">
          <WallLabel number="03">Art</WallLabel>
          <h2 className="wall-title display">Away from<br />the screen.</h2>
          <p className="body-copy">{art.body}</p>
        </div>
        <div className="art-display">
          <div className="art-frames" aria-label={art.gallery.length ? 'Personal artwork' : 'Space reserved for upcoming artwork'}>
            {art.gallery.length ? art.gallery.map((item, i) => (
              <figure key={item.src} className={`art-piece art-piece-${i % 3 + 1}`}>
                <img src={item.src} alt={item.title || 'Personal artwork'} loading="lazy" />
                {item.title && <figcaption>{item.title}{item.year && ` / ${item.year}`}</figcaption>}
              </figure>
            )) : [1, 2, 3].map((number) => (
              <div key={number} className={`art-piece art-piece-${number}`} aria-hidden="true">
                <span className="art-mat" />
                <span className="art-piece-number">0{number}</span>
              </div>
            ))}
          </div>
          <p className="art-caption eyebrow">{art.gallery.length ? 'Personal collection' : 'Personal work · Coming soon'}</p>
        </div>
      </div>
    </Frame>
  );
}

export function AboutFrame({ index }: { index: number }) {
  return (
    <Frame index={index} id="about">
      <div className="wall-split about-layout">
        <div className="wall-copy">
          <WallLabel number="04">About</WallLabel>
          <h2 className="wall-title display">A little<br />context.</h2>
          <p className="body-copy">{about[0]}</p>
          {about[1] && <p className="body-copy">{about[1]}</p>}
        </div>
        <div className="about-details">
          <dl>
            <div><dt className="eyebrow">Practice</dt><dd>{site.disciplines.join(' / ')}</dd></div>
            <div><dt className="eyebrow">Based in</dt><dd>{site.location}</dd></div>
            <div><dt className="eyebrow">Education</dt><dd>{site.education}<span className="education-detail">{site.educationDetail}</span></dd></div>
          </dl>
          <div className="about-links">
            <Out href={site.links.linkedin}>LinkedIn</Out>
            {site.links.github && <Out href={site.links.github}>GitHub</Out>}
            {site.links.resume && <Out href={site.links.resume}>Résumé</Out>}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={siteHref(href)} target="_blank" rel="noopener noreferrer" className="text-link">
    {children}<ArrowUpRight size={14} aria-hidden="true" />
  </a>;
}

export function ContactFrame({ index }: { index: number }) {
  return (
    <Frame index={index} id="contact">
      <div className="contact-card">
        <WallLabel number="05">Contact</WallLabel>
        <h2 className="contact-title display">Something in mind?</h2>
        <p className="body-copy contact-copy">A role, a collaboration, or something you want built.<br className="desktop-break" /> Email is the best place to start.</p>
        <div className="contact-actions">
          <LiquidMetalButton label="Email me" href={`mailto:${site.email}`} />
          <Out href="/build">Send a build request</Out>
        </div>
        <div className="contact-footer">
          <a className="contact-email" href={`mailto:${site.email}`}>{site.email}<ArrowUpRight size={14} aria-hidden="true" /></a>
          <span className="contact-colophon">© {new Date().getFullYear()} {site.name}</span>
        </div>
      </div>
      <a href="#top" className="mobile-back-top text-link" onClick={(event) => {
        event.preventDefault();
        goToFrame(FRAMES.hero.index, FRAMES.hero.id);
      }}>Back to the beginning <ArrowDown size={13} className="rotate-180" aria-hidden="true" /></a>
    </Frame>
  );
}
