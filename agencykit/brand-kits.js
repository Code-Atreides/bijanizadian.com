/**
 * Client brand kits. A kit is curated here from a published brand kit page,
 * which stays the source of truth; values match its tokens file and the
 * brand kit test checks that they still do. Drafts for the client use the
 * kit unless a project chooses to customize its own brand.
 */
const DOWNLOADS = '/assets/campus-brandkit/downloads/';
const file = (label, svg, png) => ({ label, svg: svg ? DOWNLOADS + svg : '', png: png ? DOWNLOADS + png : '' });
const clientKey = name => String(name || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export const brandKits = [{
  id: 'fomo-campus',
  client: 'fomo',
  name: 'fomo campus',
  summary: 'fomo comes first. Campus is an edition of fomo: it builds on fomo’s rules and never overrides them.',
  sourceUrl: '/campus/brandkit',
  tokensUrl: DOWNLOADS + 'tokens.json',
  colors: [
    { name: 'fomo blue', value: '#516AF6', use: 'Default background and primary accent. Called campus purple.' },
    { name: 'Electric blue', value: '#4A36FF', use: 'Small accent or gradient depth. Never a background.' },
    { name: 'Light blue', value: '#ACB8F9', use: 'Soft glow, or one highlighted word on ink.' },
    { name: 'fomo ink', value: '#0B091F', use: 'Dark title cards and high contrast.' },
    { name: 'Pale lavender', value: '#EAEDFF', use: 'Type on blue and ink, or a light background.' },
    { name: 'White', value: '#FFFFFF', use: 'Type on blue and ink, or a light background.' },
    { name: 'Action blue', value: '#4057DF', use: 'Web links and solid buttons on light surfaces only.' },
  ],
  type: { family: 'Aeonik', fallback: 'Arial, sans-serif', weights: ['Regular 400 · captions', 'Medium 500 · web body and headings', 'Bold 700 · social headlines'], note: 'Licensed font, not included in downloads. Web body copy runs at Medium 500.' },
  logo: { label: 'Campus mark', src: DOWNLOADS + 'fomo-campus-blue.svg', note: 'Graduation-cap mark for campus content. One flat color; keep the eyes, cap, and tassel together.' },
  voice: [
    'Write fomo in lowercase.',
    'Start with what people can do.',
    'Use one clear hook and one action.',
    'Keep amounts attached to their purpose, pay to its context, and fundraisers to the beneficiary.',
    'Replace placeholders only with confirmed names, dates, or figures.',
  ],
  examples: [['Headline', 'your campus / your approach'], ['Action', 'dm “fomo” to get the link'], ['Application', 'Become an ambassador']],
  avoid: 'Rainbow gradients, neon green, orange or yellow, metallic effects, and crypto gloss.',
  // The kit's light web surface. Its dark surface uses a translucent button
  // that drafts cannot reproduce yet, and the kit recommends light for forms.
  draft: {
    surface: 'Light web surface',
    // keepCase: fomo is always lowercase, so labels are never forced to capitals.
    brand: { accent: '#4057df', bg: '#ffffff', ink: '#141322', font: 'aeonik', keepCase: true, logo: 'data:image/png;base64,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' },
  },
  assets: [
    { name: 'fomo marks', note: 'Unchanged from fomo’s kit', files: [
      file('Eyes, pale', 'fomo/fomo-eyes-pale.svg', 'fomo/fomo-eyes-pale.png'),
      file('Eyes, ink', '', 'fomo/fomo-eyes-ink.png'),
      file('Wordmark, pale', 'fomo/fomo-wordmark-pale.svg', 'fomo/fomo-wordmark-pale.png'),
      file('Wordmark, ink', 'fomo/fomo-wordmark-ink.svg', 'fomo/fomo-wordmark-ink.png'),
      file('Wordmark, blue', 'fomo/fomo-wordmark-blue.svg', 'fomo/fomo-wordmark-blue.png'),
    ] },
    { name: 'Campus logo masters', note: 'Transparent PNG at 2480 × 1660', files: [
      file('White', 'fomo-campus-white.svg', 'fomo-campus-white.png'),
      file('Purple', 'fomo-campus-blue.svg', 'fomo-campus-blue.png'),
      file('Ink', 'fomo-campus-ink.svg', 'fomo-campus-ink.png'),
    ] },
    { name: 'Social colorways', note: 'Grid 1080 × 1350 · Story 1080 × 1920', files: ['purple', 'lavender', 'ink', 'white'].flatMap(colorway => [
      file(`${colorway[0].toUpperCase()}${colorway.slice(1)} grid`, `campus-grid-${colorway}.svg`, `campus-grid-${colorway}.png`),
      file(`${colorway[0].toUpperCase()}${colorway.slice(1)} story`, `campus-story-${colorway}.svg`, `campus-story-${colorway}.png`),
    ]) },
    { name: 'Campaign templates', note: 'Six patterns in four colorways', link: '/campus/brandkit#campaigns' },
    { name: 'Tokens and templates', note: 'Color and type tokens, carousel teaching slide', files: [
      { label: 'Color and type tokens', css: DOWNLOADS + 'tokens.css', json: DOWNLOADS + 'tokens.json' },
      file('Carousel teaching slide', 'campus-carousel-template.svg', 'campus-carousel-template.png'),
    ] },
  ],
}];

/** The kit for a client name, matched the way the project store compares names. */
export function brandKitFor(clientName) {
  const key = clientKey(clientName);
  return key ? brandKits.find(kit => clientKey(kit.client) === key) || null : null;
}

/** The brand a draft renders with: the client's kit unless the project customizes. */
export function draftBrand(project = {}) {
  const kit = project.brandMode === 'custom' ? null : brandKitFor(project.client);
  return kit ? { ...kit.draft.brand } : { ...(project.brand || {}) };
}
