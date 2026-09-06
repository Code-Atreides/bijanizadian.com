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

export type Page = { name: string; href: string };

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
    'The recruiting site for fomo’s campus programme — a five-person student team inside every school. Eight pages on one design language: a twelve-section internship manual, three stepped applications wired to Firebase, and a national chapter map built without a mapping library.',
  tags: ['Brand', 'Copywriting', 'Front end', 'Firebase', 'Data viz'],
} as const;

/** The surfaces, as links. Every href is live. */
export const pages: Page[] = [
  { name: 'campus', href: '/campus' },
  { name: 'manual', href: '/campus/manual' },
  { name: 'greekwars', href: '/greekwars' },
  { name: 'onboard', href: '/greekwars/onboard' },
  { name: 'dinners', href: '/dinners' },
  { name: 'apply', href: '/dinners/apply' },
  { name: 'gameday', href: '/gameday' },
  { name: 'crewsheet', href: '/crewsheet' },
];

/**
 * Art-world work.
 *
 * Empty on purpose. I have nothing to source it from, and inventing a role at
 * a real organisation is the same mistake as the Polymarket line. Fill `body`
 * and the section renders itself — until then it stays hidden, so the live
 * page never shows a placeholder.
 *
 * `logo` takes a path to a file dropped in portfolio/public/, served as
 * '/v2/whitewall.svg'. I have not drawn one: approximating someone else's
 * trademark is worse than the text credit the section falls back to.
 */
export const art = {
  org: 'Whitewall', // TODO: which Whitewall — the magazine, the printer, or the galleries?
  role: '', // TODO: e.g. 'Editorial · Social'
  year: '', // TODO
  href: '', // TODO: link to the work, or to the organisation
  body: '', // TODO: two sentences on what you did. The section appears once this is set.
  logo: '', // TODO: optional path to an SVG/PNG you add
};

export const about = [
  'fomo’s campus programme is the bulk of it: a five-person student team inside every school, and the eight pages that recruit them, run the competitions and take the applications. I did the brand, the copy and the front end.',
  'Most of what I make gets shipped rather than presented — forms that take real submissions, boards that read live data, manuals people actually follow.',
  // TODO: a line about what you did before fomo. I have nothing to source it
  // from: your LinkedIn is behind an authwall and the repo does not say.
] as const;
