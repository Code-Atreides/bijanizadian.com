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
  /** Always lowercase — it is set as a mark, not as a proper noun. */
  name: 'bijan izadian',
  /** What the top-left corner says. */
  domain: 'bijanizadian.com',
  location: 'New York City',
  /** Plain description of the work. Not a pitch. */
  tagline: 'Brand, copy and front-end for early-stage companies.',
  /** One line of context under it. */
  now: 'Building onboarding tools for fomo’s campus dinners.',
  email: 'hello@bijanizadian.com',
  /** Shown as a quiet inline list; these are disciplines, not selling points. */
  disciplines: ['Brand', 'Copy', 'Front end', 'Forms & data'],
  /** Confirmed on the current LinkedIn profile, September 2026. */
  education: 'NYU School of Professional Studies',
  educationDetail: 'Information Systems & Technology',
  links: {
    linkedin: 'https://www.linkedin.com/in/bijan-izadian-848123265/',
    github: null, // Add the profile URL when available; don't send readers to a placeholder.
    resume: null, // Add the résumé URL once the file is available.
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
    role: 'Onboarding · Web development',
    year: '2026',
    href: '/campus',
    // Lane A: campus/sponsored dinners with Arya. fomo is a product Bijan
    // works with, not his company. The separate affiliate/TRENCHES project
    // belongs to Lane B and must not be folded into this entry.
    summary:
      'Onboarding for fomo’s sponsored campus dinners: clear roles for hosts, setup and media, with shared checklists that keep the crew in sync.',
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
      'A custom CRM for an art gallery. The product and front end for the work that happens behind the exhibitions.',
  },
  {
    id: 'cyrus',
    name: 'Cyrus Collective',
    role: 'Gallery operations · Backend',
    // Gallery responsibilities from LinkedIn; backend work supplied by Bijan.
    // No single date for this broader body of gallery work.
    summary:
      'Gallery operations, client relations and art handling, alongside backend work for art galleries.',
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
    'Alongside the gallery systems, there is my own practice. A selection of personal work will live here soon.',
  gallery: [] as Array<{ src: string; title?: string; year?: string }>,
};

export const about = [
  'I’m an Information Systems and Technology student at NYU, working across development, brand and the arts.',
  'Alongside onboarding tools for fomo and gallery software, I’ve worked on art handling, client relations and exhibition openings in New York.',
] as const;
