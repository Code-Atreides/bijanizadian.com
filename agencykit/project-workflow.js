import { skeletonFamily } from './skeletons.js';

/** Catalog guidance is deterministic and stays on this device. */
const intents = [
  { key:'recruit', label:'Recruitment', terms:/\b(recruit\w*|ambassador\w*|hiring|hire|applicant\w*|campus team)\b/, families:['campaign-page','application-form','handbook'], preferred:['milo-fomo','milo-fomo-apply','fomo-campus-manual'] },
  { key:'onboard', label:'Member onboarding', terms:/\b(onboard\w*|member\w*|chapter\w*|clan\w*|portal\w*)\b/, families:['member-portal','application-form','directory'], preferred:['fomo-clan-claim','fomo-clan','milo-fomo-onboard'] },
  { key:'event', label:'Events & hosting', terms:/\b(event\w*|dinner\w*|host\w*|rsvp|guest\w*|crew\w*)\b/, families:['event-page','application-form','crew-planner'], preferred:['fomo-dinners','fomo-dinner-application','fomo-crewsheet'] },
  { key:'referral', label:'Referrals', terms:/\b(refer\w*|invit\w*|word of mouth)\b/, families:['referral-flow'], preferred:['fomo-refer','milo-fomo-refer'] },
  { key:'gallery', label:'Visual collections', terms:/\b(gallery|galleries|portfolio\w*|photo\w*|artwork\w*|cars?|showcase)\b/, families:['gallery'], preferred:[] },
  { key:'operations', label:'Relationships & operations', terms:/\b(crm|relationship\w*|operations|analytics|contact\w*|report\w*)\b/, families:['relationship-workspace'], preferred:['fomo-irrigation','milo-chapter-data'] },
  { key:'assistant', label:'Assistant', terms:/\b(assistant\w*|chatbot\w*|chat)\b/, families:['assistant'], preferred:['fomo-assistant'] },
  { key:'form', label:'Applications & intake', terms:/\b(form\w*|application\w*|intake|signup|sign up|register|registration|booking|visit\w*)\b/, families:['application-form'], preferred:[] },
  { key:'page', label:'Campaign pages', terms:/\b(landing|campaign\w*|launch\w*|marketing)\b/, families:['campaign-page'], preferred:[] },
  { key:'directory', label:'Directories', terms:/\b(directory|directories|resource\w*|handbook\w*|guide\w*)\b/, families:['directory','handbook'], preferred:[] },
  { key:'invoice', label:'Invoices', terms:/\b(invoice\w*|billing)\b/, families:['invoice'], preferred:[] },
];
const stop = new Set('a an and are as at be build by can client create for from have help i in into is it its make need new of on our page pages project should site so some that the their them this to us want we with would you your'.split(' '));
const normalize = value => String(value || '').toLowerCase().normalize('NFKC').replace(/[’']/g,'');
const tokens = value => [...new Set((normalize(value).match(/[a-z0-9]{3,}/g)||[]).filter(word=>!stop.has(word)))];
const stem = word => word.replace(/(?:ing|s)$/,'');
const metadata = source => [source.name,source.description,...(source.tags||[]),...(source.searchMeta?.features||[]),...(source.searchMeta?.phrases||[])].join(' ');

export function recommendOriginals(catalog, brief = {}, limit = 6) {
  const goal = normalize(brief.goal), audience = normalize(brief.audience);
  if (!goal.trim()) return [];
  const exclusions = [...goal.matchAll(/\b(?:no|not|without|exclude|excluding)\s+(?:(?:a|an|any)\s+)?([a-z]+(?:\s+pages?)?)/g)].map(match=>match[1]);
  const positive = goal.replace(/\b(?:no|not|without|exclude|excluding)\s+(?:(?:a|an|any)\s+)?([a-z]+(?:\s+pages?)?)/g,'');
  const active = intents.filter(intent=>intent.terms.test(positive));
  const excluded = new Set(intents.filter(intent=>exclusions.some(term=>intent.terms.test(term))).flatMap(intent=>intent.families));
  const goalWords = tokens(positive), audienceWords = tokens(audience);
  return catalog.flatMap(source=>{
    if (!source.sourceUrl || excluded.has(skeletonFamily(source))) return [];
    const words = new Set(tokens(metadata(source)).map(stem));
    const literal = goalWords.filter(word=>words.has(stem(word)));
    const audienceHits = audienceWords.filter(word=>words.has(stem(word)));
    const fits = active.filter(intent=>intent.families.includes(skeletonFamily(source)));
    const preferred = fits.some(intent=>intent.preferred.includes(source.id));
    const score = literal.length * 4 + fits.length * 7 + (preferred?30:0) + audienceHits.length;
    // Audience alone cannot turn an unrelated original into a recommendation.
    if (!literal.length && !fits.length) return [];
    const reasons = [...fits.map(intent=>`${intent.label}: reusable ${skeletonHandoff(source).name.toLowerCase()} structure`),...(literal.length?[`Archive mentions: ${literal.slice(0,3).join(', ')}`]:[]),...(audienceHits.length?[`Audience overlap: ${audienceHits.slice(0,2).join(', ')}`]:[])].slice(0,3);
    return [{source,score,reasons}];
  }).sort((a,b)=>b.score-a.score||a.source.name.localeCompare(b.source.name)).slice(0,limit);
}

const journeys = [
  {id:'recruitment',name:'Bring a team together.',intent:'recruit',description:'Introduce the opportunity, collect applications, then give the team a place to begin.',steps:[['Discover','milo-fomo'],['Apply','milo-fomo-apply'],['Get started','fomo-campus-manual']]},
  {id:'onboarding',name:'Give members a home.',intent:'onboard',description:'Claim a chapter, bring members in, and keep the group connected.',steps:[['Claim','fomo-clan-claim'],['Join','milo-fomo-onboard'],['Return','fomo-clan']]},
  {id:'dinner',name:'Make an event happen.',intent:'event',description:'Introduce the event, find a host, and organize the people making it happen.',steps:[['Discover','fomo-dinners'],['Host','fomo-dinner-application'],['Organize','fomo-crewsheet']]},
];

export function projectJourneys(catalog, brief = {}) {
  const sources = new Map(catalog.map(source=>[source.id,source]));
  const goal = normalize(brief.goal);
  return journeys.filter(journey=>journey.steps.every(([,id])=>sources.has(id))).map(journey=>({
    ...journey, relevant:intents.find(intent=>intent.key===journey.intent).terms.test(goal),
    steps:journey.steps.map(([label,id])=>({label,source:sources.get(id)})),
  })).sort((a,b)=>Number(b.relevant)-Number(a.relevant));
}

const handoffs = {
  'campaign-page': {name:'Campaign page',includes:'A hero, feature sections, and calls to action.',connect:'Connect button destinations, analytics, and any lead capture.'},
  'event-page': {name:'Event page',includes:'An event introduction, supporting sections, and demo event content.',connect:'Connect registration, scheduling, and the real event details.'},
  'application-form': {name:'Application form',includes:'A step-by-step form with local validation and a demo completion state.',connect:'Connect submissions to your database, consent handling, and team notifications.'},
  'referral-flow': {name:'Referral flow',includes:'A referral form and a local demo link flow.',connect:'Connect real referral identities, attribution, and any reward rules.'},
  'member-portal': {name:'Member portal',includes:'A member overview with example progress and local demo interactions.',connect:'Connect sign-in, access rules, member records, and shared progress.'},
  'relationship-workspace': {name:'Relationship workspace',includes:'An overview, example contacts, and local demo workspace controls.',connect:'Connect approved contact records, sign-in, permissions, and shared storage.'},
  'assistant': {name:'Assistant',includes:'An assistant launcher, chat panel, and local example replies.',connect:'Connect a server-side AI endpoint, project knowledge, and usage limits.'},
  'directory': {name:'Directory',includes:'Searchable example resource cards.',connect:'Replace example resources and connect the real destinations or content source.'},
  'handbook': {name:'Handbook',includes:'A contents navigation and neutral reference sections.',connect:'Replace the example guidance and connect the team’s resource links.'},
  'crew-planner': {name:'Crew planner',includes:'Task columns with local add and check-off interactions.',connect:'Connect shared tasks, owners, persistence, and access rules.'},
  'gallery': {name:'Gallery',includes:'A responsive visual collection with local filters and placeholder artwork.',connect:'Add approved media, captions, and real project destinations.'},
  'invoice': {name:'Invoice',includes:'Editable example line items and local totals.',connect:'Connect billing records, invoice numbering, storage, and payment handling.'},
};
export const skeletonHandoff = source => ({...handoffs[skeletonFamily(source)],note:'A neutral template for this kind of page. Original artwork, source code, private data, and backend services are not copied.'});

export const LAUNCH_CHECKS = [
  {id:'content',label:'Content reviewed',detail:'Replace placeholder copy, example data, and media throughout the exported page.'},
  {id:'brand',label:'Brand approved',detail:'Check the logo, type, colors, and contrast with the client.'},
  {id:'links',label:'Destinations tested',detail:'Follow every button and journey link on the final page.'},
  {id:'services',label:'Services connected',detail:'Connect and test the services this page needs, or confirm none are needed.'},
  {id:'mobile',label:'Phone & keyboard checked',detail:'Review the final page on a phone and with keyboard-only navigation.'},
  {id:'privacy',label:'Access & data reviewed',detail:'Check who can access the page and where submitted information is stored.'},
];
export const reviewProgress = draft => ({done:LAUNCH_CHECKS.filter(check=>draft.review?.[check.id]===true).length,total:LAUNCH_CHECKS.length});

export function projectNextStep(project) {
  if(!project.brief?.goal?.trim())return 'Add the project goal to find useful starting points.';
  if(!project.drafts?.length)return 'Choose an original below, or start with a complete page journey.';
  const incomplete=project.drafts.filter(draft=>reviewProgress(draft).done<LAUNCH_CHECKS.length);
  if(incomplete.length)return `${incomplete.length} draft${incomplete.length===1?' needs':'s need'} launch review. Open one to see what remains.`;
  return 'All draft review checklists are complete. Confirm the final build and deployment with your team.';
}
