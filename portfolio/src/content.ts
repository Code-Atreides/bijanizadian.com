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

export type Project = {
  id: string;
  name: string;
  role: string;
  year: string;
  href: string;
  summary: string;
  detail: string[];
  tags: readonly string[];
  meta?: string;
};

/** Every href is a page in this repo that is live today. */
export const projects: Project[] = [
  {
    id: 'campus',
    name: 'fomo / campus',
    role: 'Brand · Copy · Front end',
    year: '2026',
    href: '/campus',
    summary:
      'The recruiting site for fomo’s campus programme — a five-person student team inside every school, with the application and the internship manual behind it.',
    detail: [
      'Twelve-section manual: the five seats, an eight-week goal map, and the rules that are not up to the reader',
      'Stepped application writing to Firebase, validated harder than the browser does',
      'Aeonik, a four-step spacing scale and one button set, which the six pages around it inherit',
    ],
    tags: ['Brand', 'Copywriting', 'Front end', 'Firebase'],
    meta: 'Six pages',
  },
  {
    id: 'greekwars',
    name: 'Greek Wars',
    role: 'Product · Front end',
    year: '2026',
    href: '/greekwars',
    summary:
      'A semester-long chapter trading competition: a national map of who has qualified, a raw-PnL board, and twelve-step chapter registration.',
    detail: [
      'US map with no mapping library and no runtime fetch — TopoJSON decoded and Albers-projected at build time into a 27KB inline path',
      'Standings read from Firebase, falling back to a labelled sample season when the node is empty',
      'A custom combobox for school and chapter, replacing the native datalist',
    ],
    tags: ['Data viz', 'Front end', 'Firebase'],
    meta: '27KB map',
  },
  {
    id: 'dinners',
    name: 'Dinner Series',
    role: 'Brand · Copy · Front end',
    year: '2026',
    href: '/dinners',
    summary:
      'fomo funds a table of twelve; the host picks the room and the people. The programme page and the ten-question host application.',
    detail: [
      'The application sits on its own page, measured against a reference layout on fifteen spacing metrics',
      'Phone formatting, Instagram normalising, and an email check that rejects what the browser accepts',
      'Tables stack on a phone rather than scrolling sideways',
    ],
    tags: ['Brand', 'Copywriting', 'Forms'],
    meta: 'Ten questions',
  },
  {
    id: 'gameday',
    name: 'Game Day',
    role: 'Product · Front end',
    year: '2026',
    href: '/gameday',
    summary:
      'A second scoreboard: two schools trade against each other while their teams play, running a simulated game so the mechanic is legible before the season is.',
    detail: ['Live scoreboard and trade feed', 'Simulated game on load, so the page moves with no real data behind it'],
    tags: ['Product', 'Front end'],
  },
];

export const about = [
  'fomo’s campus programme is the bulk of it: a five-person student team inside every school, and the eight pages that recruit them, run the competitions and take the applications. I did the brand, the copy and the front end.',
  'Most of what I make gets shipped rather than presented — forms that take real submissions, boards that read live data, manuals people actually follow.',
  // TODO: a line about what you did before fomo. I have nothing to source it
  // from: your LinkedIn is behind an authwall and the repo does not say.
] as const;
