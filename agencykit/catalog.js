export const categories = ['Portals', 'Pages', 'Forms', 'Tools'];
export const blocks = [
  { id:'member-portal', name:'Member portal', category:'Portals', preview:'portal', description:'A place to join, check progress, and find the next step.', tags:['onboarding','membership','progress','chapter','signup'], includes:['Welcome & identity','A clear next step','Progress & completion','Helpful links'], origin:'fomo · chapter portal', sourceId:'fomo-clan', status:'Blueprint' },
  { id:'client-portal', name:'Client portal', category:'Portals', preview:'dashboard', description:'Everything a client needs, gathered in one quiet place.', tags:['client','dashboard','overview','resources','status'], includes:['Project overview','Shared resources','Milestones','Contact & support'], origin:'New starting point', status:'Blueprint' },
  { id:'campaign-page', name:'Campaign page', category:'Pages', preview:'landing', description:'One story, one offer, one good reason to take part.', tags:['landing','launch','campaign','college','marketing'], includes:['Introduction','Program details','A primary action','Common questions'], origin:'fomo · campus', sourceId:'fomo-campus', status:'Blueprint' },
  { id:'event-page', name:'Event page', category:'Pages', preview:'event', description:'The who, what, and where. An easy way to be there.', tags:['event','dinner','rsvp','gameday','community'], includes:['Event details','Host & location','RSVP action','What to expect'], origin:'fomo · Dinner Series', sourceId:'fomo-dinners', status:'Blueprint' },
  { id:'application-form', name:'Application form', category:'Forms', preview:'form', description:'A few thoughtful questions, one step at a time.', tags:['apply','signup','intake','onboarding','questions','form'], includes:['Step-by-step questions','Validation','Review & submit','Confirmation'], origin:'fomo · chapter onboarding', sourceId:'fomo-onboard', status:'Blueprint' },
  { id:'referral-flow', name:'Referral flow', category:'Forms', preview:'referral', description:'Make an introduction. Give people a link of their own.', tags:['referral','share','attribution','invitation','link'], includes:['Basic details','Personal link','Copy & share','Attribution rules'], origin:'fomo · referrals', sourceId:'fomo-refer', status:'Blueprint' },
  { id:'relationship-workspace', name:'Relationship workspace', category:'Tools', preview:'directory', description:'Keep track of people, conversations, and follow-through.', tags:['crm','contacts','outreach','tasks','relationships'], includes:['People & organizations','Interaction notes','Follow-up tasks','Team views'], origin:'fomo · Irrigation', sourceId:'fomo-irrigation', status:'Blueprint' },
  { id:'assistant', name:'AI assistant', category:'Tools', preview:'assistant', description:'A helpful presence, shaped around each client’s world.', tags:['ai','assistant','chat','help','knowledge','widget'], includes:['Reusable launcher & panel','Client knowledge boundary','Page context','Usage controls'], origin:'fomo · assistant prototype', sourceId:'fomo-assistant', status:'Blueprint' },
];

export function filterItems(items, { query = '', category = 'All', saved = null } = {}) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => (category === 'All' || item.category === category)
    && (!saved || saved.includes(item.id))
    && terms.every(term => [item.name, item.description, item.category, item.origin || '', ...(item.tags || [])].join(' ').toLowerCase().includes(term)));
}

export function lookupItems(items, message) {
  const aliases = { signup:'onboarding', join:'member', leads:'referral', launch:'campaign', dinner:'event', people:'relationship', chatbot:'assistant', chat:'assistant' };
  const terms = message.toLowerCase().match(/[a-z]+/g) || [];
  const relevant = terms.filter(t => !['i','a','an','the','to','for','me','my','we','our','what','which','how','can','could','should','need','want','make','build','find','show','with','and','this','that','is','of','do','have','help'].includes(t));
  return items.map(item => {
    const haystack = [item.name, item.category, item.description, ...(item.tags || [])].join(' ').toLowerCase();
    return { item, score: relevant.reduce((n, term) => n + (haystack.includes(aliases[term] || term) ? 1 : 0), 0) };
  }).filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0,3).map(x=>x.item);
}

// Deterministic catalog search, not an AI or embedding service. Every meaningful
// query concept must match; synonyms within one concept are alternatives.
const ARCHIVE_FILLER = new Set('a an the i me my we our us you your please show find search browse looking look see give get bring list display tell need want would like could can should do does did have has had is are was were be been to for from with of in on at by and that this these those some any all everything something anything it its s ve re ui ux idea ideas inspiration example examples design designs work works project projects archive library catalog catalogue item items piece pieces starting point points'.split(' '));
const ARCHIVE_TYPES = {
  portal: 'Portals', portals: 'Portals',
  page: 'Pages', pages: 'Pages', website: 'Pages', websites: 'Pages', webpage: 'Pages', webpages: 'Pages', site: 'Pages', sites: 'Pages',
  form: 'Forms', forms: 'Forms', application: 'Forms', applications: 'Forms', apply: 'Forms', intake: 'Forms',
  tool: 'Tools', tools: 'Tools',
};
const ARCHIVE_TOPICS = [
  { aliases: ['onboarding', 'onboard', 'signup', 'signups', 'registration', 'register', 'join', 'joining'], words: ['onboarding', 'onboard', 'signup', 'signups', 'registration', 'register', 'join', 'joining', 'claim', 'setup'] },
  { aliases: ['referral', 'referrals', 'invite', 'invites', 'invitation', 'invitations'], words: ['referral', 'referrals', 'invite', 'invites', 'invitation', 'invitations', 'attribution'] },
  { aliases: ['greekwars', 'greek', 'wars'], words: ['greekwars', 'greek', 'wars', 'chapter', 'chapters', 'clan', 'fraternity'] },
  { aliases: ['artwork', 'artworks', 'art', 'painting', 'paintings'], words: ['artwork', 'artworks', 'art', 'painting', 'paintings', 'gallery', 'artist', 'exhibition', 'exhibitions'] },
  { aliases: ['chatbot', 'chatbots', 'chat', 'assistant', 'assistants'], words: ['chatbot', 'chatbots', 'chat', 'assistant', 'assistants', 'widget'] },
  { aliases: ['crm', 'relationship', 'relationships', 'outreach'], words: ['crm', 'relationship', 'relationships', 'outreach', 'contacts', 'conversations'] },
];
const archiveText = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\bgreek[\s-]*wars\b/g, 'greekwars').replace(/\bsign[\s-]+ups?\b/g, 'signup').replace(/\bweb[\s-]+sites?\b/g, 'website');
const archiveWords = value => new Set(archiveText(value).match(/[a-z0-9]+/g) || []);
function wordVariants(word) {
  if (word.length > 4 && word.endsWith('ies')) return [word, `${word.slice(0, -3)}y`];
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return [word, word.slice(0, -1)];
  return [word, `${word}s`];
}

/**
 * Search flattened archive entries. Returns the original objects in ranked order;
 * does not mutate, impose a result limit, filter status, or access the network.
 * Project context may be supplied as project, projectName, projectId, or origin.
 */
export function searchArchive(items, query = '') {
  const concepts = [];
  const seen = new Set();
  for (const term of archiveWords(query)) {
    if (ARCHIVE_FILLER.has(term)) continue;
    const category = ARCHIVE_TYPES[term];
    const topic = ARCHIVE_TOPICS.find(group => group.aliases.includes(term));
    const key = category ? `category:${category}` : topic ? `topic:${topic.aliases[0]}` : `word:${term}`;
    if (seen.has(key)) continue;
    seen.add(key);
    concepts.push({ category, term, words: topic?.words || wordVariants(term) });
  }
  if (!concepts.length) return [...items];

  return items.map((item, index) => {
    const project = typeof item.project === 'object' ? item.project?.name : item.project;
    const fields = [
      { weight: 8, words: archiveWords(item.name) },
      { weight: 6, words: archiveWords([project, item.projectName, item.projectId, item.origin, item.id].filter(Boolean).join(' ')) },
      { weight: 5, words: archiveWords((item.tags || []).join(' ')) },
      { weight: 2, words: archiveWords(item.description) },
    ];
    // Older archive entries record their program in the source route instead of
    // tags. Recognize that program marker without indexing arbitrary local paths.
    if (/[/\\]greekwars(?:[/\\.]|$)/i.test(`${item.sourcePath || ''} ${item.sourceUrl || ''}`)) {
      fields.push({ weight: 3, words: new Set(['greekwars']) });
    }
    let score = 0;
    for (const concept of concepts) {
      if (concept.category) {
        if (item.category !== concept.category) return null;
        score += 10;
        continue;
      }
      let conceptScore = 0;
      for (const field of fields) {
        if (concept.words.some(word => field.words.has(word))) conceptScore += field.weight;
        if (field.words.has(concept.term)) conceptScore += 1;
      }
      if (!conceptScore) return null;
      score += conceptScore;
    }
    return { item, score, index };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.index - b.index).map(result => result.item);
}
