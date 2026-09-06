/**
 * Everything the site says, in one file.
 *
 * Edit here rather than in the components — the sections read from this, so
 * copy changes never require touching layout. Anything marked TODO is a real
 * gap I could not fill from the repo and you should overwrite.
 */

export const site = {
  name: 'Bijan Izadian',
  location: 'New York City',
  status: { label: 'Open to work', available: true },
  /** One line under the name. Keep it to a claim you can defend. */
  tagline:
    'I design and build the things a company actually ships — the brand, the words on the page, and the front end underneath them.',
  email: 'hello@bijanizadian.com',
  links: {
    // TODO: replace with your real profile URLs — these are the placeholders
    // that were already in the current landing page.
    github: 'https://github.com/',
    linkedin: 'https://www.linkedin.com/in/',
    resume: '/resume.pdf', // TODO: this file is not on the server yet (404)
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
  /** Shown as the card's quiet metric line. */
  meta?: string;
};

/**
 * The work. Every href below is a page in this repo that is live today, so
 * nothing here is a mockup — a visitor can click straight into the real thing.
 */
export const projects: Project[] = [
  {
    id: 'campus',
    name: 'fomo / campus',
    role: 'Brand · Copy · Front end',
    year: '2026',
    href: '/campus',
    summary:
      'The recruiting site for fomo’s campus programme — a five-person student team inside every school, with the application and the manual behind it.',
    detail: [
      'Twelve-section internship manual covering the five seats, the eight-week goal map and the rules that are not up to the reader',
      'Stepped application writing to Firebase, with validation stricter than the browser’s',
      'A design language — Aeonik, a four-step spacing scale, one button set — that the six pages around it inherit',
    ],
    tags: ['Brand', 'Copywriting', 'Front end', 'Firebase'],
    meta: 'Six pages · one shared language',
  },
  {
    id: 'greekwars',
    name: 'Greek Wars',
    role: 'Product · Front end',
    year: '2026',
    href: '/greekwars',
    summary:
      'A semester-long chapter trading competition: a live national map of who has qualified, a raw-PnL board, and twelve-step chapter registration.',
    detail: [
      'US map built with no mapping library and no runtime fetch — TopoJSON decoded and Albers-projected at build time into a 27KB inline path',
      'Live standings from Firebase, falling back to a clearly-labelled sample season when the node is empty',
      'A custom combobox for school and chapter, replacing the native datalist',
    ],
    tags: ['Data viz', 'Front end', 'Firebase'],
    meta: '2,400-point map · 27KB',
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
      'Application lives on its own page, laid out against a contact-sales reference and matched to it on fifteen measured spacing metrics',
      'Phone formatting, Instagram normalising and an email check that rejects what the browser accepts',
      'Every table stacks on a phone rather than scrolling sideways',
    ],
    tags: ['Brand', 'Copywriting', 'Forms'],
    meta: 'Ten questions · two minutes',
  },
  {
    id: 'gameday',
    name: 'Game Day',
    role: 'Product · Front end',
    year: '2026',
    href: '/gameday',
    summary:
      'A second scoreboard: two schools trade against each other while their teams play, with a simulated game so the page moves before the season does.',
    detail: [
      'Live scoreboard and trade feed',
      'Runs a simulated game on load so the mechanic is legible with no real data behind it',
    ],
    tags: ['Product', 'Front end'],
  },
];

/** What I actually do, phrased as outcomes rather than tools. */
export const capabilities = [
  {
    title: 'Brand',
    body: 'A palette, a typeface and a button set that hold up across a dozen pages — then written down so other people can use them without asking.',
  },
  {
    title: 'Copy',
    body: 'The words on the page, in the voice of the company rather than the voice of a marketer. Including the parts nobody wants to write: the rules, the fine print, the disclosure.',
  },
  {
    title: 'Front end',
    body: 'Hand-written HTML, CSS and TypeScript, or React when the interaction earns it. Measured against real browsers at real widths, not eyeballed.',
  },
  {
    title: 'Forms & data',
    body: 'Multi-step applications that validate properly, fail closed, and write somewhere you can read them. Wired to Firebase, with rules that keep applicant data out of the browser.',
  },
] as const;

export const about = [
  'I work on growth, brand and product for early-stage companies — currently building fomo’s college programme, turning campuses into a distribution channel.',
  'I like work that has to perform. A page that converts, a programme people apply to, a brand that sounds like a person rather than a deck.',
  'Most of what I make ends up shipped rather than presented: forms that take real submissions, boards that read live data, manuals that people follow.',
] as const;
