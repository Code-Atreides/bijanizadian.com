import { goToFrame, useCurrentFrame } from '@/components/site/corridor';
import { site } from '@/content';
import { FRAMES } from '@/site-map';

const LINKS = [
  { label: 'Work', frame: FRAMES.work },
  { label: 'Art', frame: FRAMES.art },
  { label: 'About', frame: FRAMES.about },
  { label: 'Contact', frame: FRAMES.contact },
] as const;

export function Nav() {
  const current = useCurrentFrame();

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, frame: { index: number; id: string }) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goToFrame(frame.index, frame.id);
  }

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#top" className="site-signature" onClick={(event) => navigate(event, FRAMES.hero)} aria-label={`${site.name} — home`}>
          <span className="signature-full">{site.name}</span><span className="signature-short" aria-hidden="true">bi.</span><span className="signature-dot" aria-hidden="true" />
        </a>
        <ul className="nav-links">
          {LINKS.map(({ label, frame }) => (
            <li key={frame.id}>
              <a href={`#${frame.id}`} onClick={(event) => navigate(event, frame)} aria-current={current === frame.index ? 'location' : undefined}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
