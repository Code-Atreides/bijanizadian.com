/**
 * Which frame each section occupies in the corridor.
 *
 * Its own module on purpose. This lived in App.tsx, and the nav imported it
 * from there while App imported the nav — a cycle. Module-scope code in the
 * nav then read FRAMES before App had finished evaluating, so it was
 * undefined and the whole page failed to render. Nothing imports the nav or
 * App from here, so the cycle cannot come back.
 */
export const FRAMES = { hero: 0, work: 1, art: 2, about: 3, contact: 4 } as const;

export const FRAME_COUNT = Object.keys(FRAMES).length;
