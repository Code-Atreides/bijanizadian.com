/**
 * Everything the site says, in one file.
 *
 * House style: describe, do not sell. No slogans, no claims that need a
 * superlative to land. If a line could appear on a landing page for a product,
 * it does not belong here — the work is the argument.
 *
 * Anything marked TODO is a real gap I could not fill from the repo.
 */

export const site = {
  name: 'Bijan Izadian',
  location: 'New York City',
  status: { label: 'Open to work', available: true },
  /** Plain description of the work. Not a pitch. */
  tagline: 'Brand, copy and front-end for early-stage companies.',
  /** One line of context under it. */
  now: 'Currently building fomo’s campus programme.',
  email: 'hello@bijanizadian.com',
  /** Shown as a quiet inline list; these are disciplines, not selling points. */
  disciplines: ['Brand', 'Copy', 'Front end', 'Forms & data'],
  /** From the indexed LinkedIn headline: "Student at the University of Oregon".
   *  It is the only field the profile exposes publicly — the rest is behind an
   *  authwall, so nothing else here is sourced from it. */
  education: 'University of Oregon',
  links: {
    linkedin: 'https://www.linkedin.com/in/bijan-izadian-848123265/',
    github: 'https://github.com/', // TODO: still a placeholder
    resume: '/resume.pdf', // TODO: not on the server yet (404)
  },
} as const;

export type Page = { name: string; href: string; note: string };

/**
 * One project, not four.
 *
 * Greek Wars, the Dinner Series and Game Day are not separate clients — they
 * are surfaces of the same campus programme, built in the same language on the
 * same weekend afternoons. Listing them as four entries padded a portfolio that
 * is stronger described honestly: one body of work, eight live pages.
 */
export const work = {
  name: 'fomo / campus',
  role: 'Brand · Copy · Front end',
  year: '2026',
  href: '/campus',
  summary:
    'The recruiting site for fomo’s campus programme — a five-person student team inside every school. Eight pages that recruit the team, run the competitions and take the applications, on one design language.',
  detail: [
    'A twelve-section internship manual: the five seats, an eight-week goal map, and the rules that are not up to the reader',
    'Three stepped applications writing to Firebase, validated harder than the browser does — phone formatting, Instagram normalising, an email check that rejects what the browser accepts',
    'A national chapter map with no mapping library and no runtime fetch: TopoJSON decoded and Albers-projected at build time into a 27KB inline path',
    'Aeonik, a four-step spacing scale and one button set, which every page inherits',
  ],
  tags: ['Brand', 'Copywriting', 'Front end', 'Firebase', 'Data viz'],
} as const;

/** The surfaces. Every href is live — these are not screenshots. */
export const pages: Page[] = [
  { name: 'campus', href: '/campus', note: 'The hub, and the campus-team application' },
  { name: 'manual', href: '/campus/manual', note: 'Twelve sections: the seats, the map, the rules' },
  { name: 'greekwars', href: '/greekwars', note: 'Chapter competition — live map and PnL board' },
  { name: 'onboard', href: '/greekwars/onboard', note: 'Chapter registration, twelve steps' },
  { name: 'dinners', href: '/dinners', note: 'A funded table of twelve' },
  { name: 'apply', href: '/dinners/apply', note: 'Host application, ten questions' },
  { name: 'gameday', href: '/gameday', note: 'Two schools trading through a game' },
  { name: 'crewsheet', href: '/crewsheet', note: 'Who is doing what, shared by code' },
];

export const about = [
  'fomo’s campus programme is the bulk of it: a five-person student team inside every school, and the eight pages that recruit them, run the competitions and take the applications. I did the brand, the copy and the front end.',
  'Most of what I make gets shipped rather than presented — forms that take real submissions, boards that read live data, manuals people actually follow.',
  // TODO: a line about what you did before fomo. I have nothing to source it
  // from: your LinkedIn is behind an authwall and the repo does not say.
] as const;
