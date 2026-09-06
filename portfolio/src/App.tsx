import { Corridor } from '@/components/site/corridor';
import {
  AboutFrame,
  ArtFrame,
  ContactFrame,
  HeroFrame,
  WorkFrame,
} from '@/components/site/frames';
import { Nav } from '@/components/site/nav';
import { FRAMES, FRAME_COUNT } from '@/site-map';

export default function App() {
  return (
    <>
      <Nav />
      <Corridor count={FRAME_COUNT}>
        <HeroFrame />
        <WorkFrame index={FRAMES.work} />
        <ArtFrame index={FRAMES.art} />
        <AboutFrame index={FRAMES.about} />
        <ContactFrame index={FRAMES.contact} />
      </Corridor>
    </>
  );
}
