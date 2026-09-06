import { Corridor } from '@/components/site/corridor';
import {
  AboutFrame,
  ArtFrame,
  ContactFrame,
  HeroFrame,
  WorkFrames,
} from '@/components/site/frames';
import { Nav } from '@/components/site/nav';
import { projects } from '@/content';

// hero + one frame per project + art + about + contact
const COUNT = 1 + projects.length + 3;

export default function App() {
  return (
    <>
      <Nav />
      <Corridor count={COUNT}>
        <HeroFrame />
        <WorkFrames />
        <ArtFrame index={1 + projects.length} />
        <AboutFrame index={2 + projects.length} />
        <ContactFrame index={3 + projects.length} />
      </Corridor>
    </>
  );
}
