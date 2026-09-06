/**
 * Which frame each section occupies, and the id it carries.
 *
 * Its own module on purpose. This lived in App.tsx, and the nav imported it
 * from there while App imported the nav — a cycle that left FRAMES undefined
 * at module scope and rendered a blank page. Nothing imports App or the nav
 * from here, so it cannot come back.
 *
 * The id matters as much as the index: in the corridor a section is reached by
 * scroll offset, and in the flat layout by the element itself. Navigation needs
 * both.
 */
export const FRAMES = {
  hero: { index: 0, id: 'top' },
  work: { index: 1, id: 'work' },
  art: { index: 2, id: 'art' },
  about: { index: 3, id: 'about' },
  contact: { index: 4, id: 'contact' },
} as const;

export type FrameKey = keyof typeof FRAMES;

export const FRAME_COUNT = Object.keys(FRAMES).length;
