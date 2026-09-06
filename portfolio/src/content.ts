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

export type Project = {
  id: string;
  name: string;
  role: string;
  year?: string;
  href?: string;
  summary: string;
  /** Draws the whitewalls mark before the name. */
  mark?: 'whitewalls';
  /** Only fomo/campus has an index of surfaces beneath it. */
  pages?: Page[];
};

/**
 * Work, newest first.
 *
 * The fomo entry is one project with eight pages under it, not eight projects.
 * The two gallery entries are separate bodies of work for separate clients,
 * which is why they get their own rows.
 */
export const projects: Project[] = [
  {
    id: 'fomo',
    name: 'fomo / campus',
    role: 'Brand · Copy · Front end',
    year: '2026',
    href: '/campus',
    summary:
      'The recruiting site for fomo’s campus programme — a five-person student team inside every school. Eight pages on one design language: a twelve-section internship manual, three stepped applications wired to Firebase, and a national chapter map built without a mapping library.',
    pages: [
      { name: 'campus', href: '/campus' },
      { name: 'manual', href: '/campus/manual' },
      { name: 'greekwars', href: '/greekwars' },
      { name: 'onboard', href: '/greekwars/onboard' },
      { name: 'dinners', href: '/dinners' },
      { name: 'apply', href: '/dinners/apply' },
      { name: 'gameday', href: '/gameday' },
      { name: 'crewsheet', href: '/crewsheet' },
    ],
  },
  {
    id: 'whitewalls',
    name: 'whitewalls',
    role: 'Product · Front end',
    year: '2025',
    mark: 'whitewalls',
    // TODO: a link, and a line on what it actually handles day to day.
    summary:
      'A CRM built for an art gallery in the autumn of 2025 — the system it runs on day to day.',
  },
  {
    id: 'cyrus',
    name: 'Cyrus Collective',
    role: 'Backend · Gallery systems',
    // TODO: dates, and a line on what the systems actually handle. Broad for
    // now because that is all I have, not as a stylistic choice.
    summary:
      'Backend work for art galleries, across the gallery business — the systems behind the front desk.',
  },
];

/**
 * My own practice, as opposed to the gallery work above.
 *
 * No images yet, so the section hangs empty frames and says so. Add entries to
 * `gallery` and they replace the frames in place.
 */
export const art = {
  body:
    'The art world is the other half of what I do. My own work is not online yet; the wall beside this is where it goes.',
  gallery: [] as Array<{ src: string; title?: string; year?: string }>,
};

export const about = [
  'fomo’s campus programme is the bulk of it: a five-person student team inside every school, and the eight pages that recruit them, run the competitions and take the applications. I did the brand, the copy and the front end.',
  'Most of what I make gets shipped rather than presented — forms that take real submissions, boards that read live data, manuals people actually follow.',
  // TODO: a line about what you did before fomo. I have nothing to source it
  // from: your LinkedIn is behind an authwall and the repo does not say.
] as const;
