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

// Local concept search. Visual and functional descriptions are curated metadata,
// not live screenshot analysis. Queries never call an AI or a remote service.
const FILLER = new Set('a an the i me my we our us you your please show find search browse looking look see give get bring list display tell need want would like could can should do does did have has had is are was were be been to for from with of in on at by and that this these those some any all everything something anything it its s ve re m d ll t ui ux idea ideas inspiration example examples design designs work works project projects archive library catalog catalogue item items piece pieces starting point points flow flows screen screens helps help lets let allows allow able built made use using used'.split(' '));
const TYPES = {
  portal:'Portals', portals:'Portals',
  page:'Pages', pages:'Pages', website:'Pages', websites:'Pages', webpage:'Pages', webpages:'Pages', site:'Pages', sites:'Pages',
  form:'Forms', forms:'Forms', application:'Forms', applications:'Forms', apply:'Forms', intake:'Forms',
  tool:'Tools', tools:'Tools',
};
const TOPICS = [
  {id:'signup', aliases:['onboarding','onboard','signup','signups','registration','register','join','joining'], words:['onboarding','onboard','signup','registration','register','join','joining']},
  {id:'referral', aliases:['referral','referrals','invite','invites','invitation','invitations'], words:['referral','referrals','invite','invitation','invitations','attribution']},
  {id:'greekwars', aliases:['greekwars','greek','wars'], words:['greekwars','greek','wars','chapter','chapters','clan','fraternity']},
  {id:'art', aliases:['artwork','artworks','art','painting','paintings'], words:['artwork','art','painting','paintings','gallery','artist','exhibition']},
  {id:'assistant', aliases:['chatbot','chatbots','chat','assistant','assistants'], words:['chatbot','chat','assistant','widget']},
  {id:'crm', aliases:['crm','relationship','relationships','outreach','contacts','contactmanagement'], words:['crm','relationship','relationships','outreach','contacts','conversations']},
  {id:'followup', aliases:['followup','followups','followthrough'], words:['followup','followups','followthrough','tasks','reminders']},
  {id:'recruitment', aliases:['recruit','recruiting','recruitment','hire','hiring'], words:['recruit','recruiting','recruitment','hiring','roles','ambassadors','internship']},
  {id:'campus', aliases:['college','colleges','campus','campuses','university','universities'], words:['college','campus','university','school']},
  {id:'scheduling', aliases:['booking','book','schedule','scheduling','appointment','appointments'], words:['booking','schedule','scheduling','appointment','calendar','visit','reservation']},
  {id:'calendar', aliases:['calendar','calendars','datepicker'], words:['calendar','datepicker','scheduling']},
  {id:'landing', aliases:['landing','homepage','homepages'], words:['landing','homepage','entry','introduction']},
  {id:'dinner', aliases:['dinner','dinners','dining'], words:['dinner','dinners','dining','table']},
  {id:'event', aliases:['event','events','rsvp'], words:['event','events','rsvp','dinner','dinners']},
  {id:'photo', aliases:['photo','photos','photography','photographic','picture','pictures','image','images','imagery'], words:['photo','photos','photography','photographic','image','images','imagery','imagehero']},
  {id:'dark', visual:true, aliases:['dark','black','night'], words:['dark','black','night']},
  {id:'light', visual:true, aliases:['light','white','ivory','cream','offwhite'], words:['light','white','ivory','cream','offwhite']},
  {id:'minimal', visual:true, aliases:['minimal','minimalist','clean','simple'], words:['minimal','minimalist','clean','simple']},
  {id:'imagehero', visual:true, aliases:['imagehero'], words:['imagehero','photographic','image-led','imagery']},
  {id:'boldtype', visual:true, aliases:['boldtype'], words:['boldtype','typography','typographic']},
  {id:'multistep', aliases:['multistep','stepped','wizard'], words:['multistep','stepped','wizard','steps']},
  ...['blue','purple','green','red','orange','yellow','pink','gray','grayscale','space','3d','gradient','editorial','grid','sidebar','rounded'].map(id=>({id,visual:true,aliases:[id,...(id==='gray'?['grey']:id==='grayscale'?['greyscale','monochrome']:[])],words:[id,...(id==='grayscale'?['greyscale','monochrome']:[])]})),
];
const TOPIC_BY_ALIAS = new Map(TOPICS.flatMap(topic=>topic.aliases.map(alias=>[alias,topic])));
const baseText = value => String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'");
const conceptText = value => baseText(value)
  .replace(/\bgreek[\s-]*wars\b/g,'greekwars')
  .replace(/\bsign[\s-]+ups?\b/g,'signup')
  .replace(/\bweb[\s-]+sites?\b/g,'website')
  .replace(/\bfollow[\s-]*(ups?|through)\b/g,'followup')
  .replace(/\b(?:keep(?:ing)? track of|manag(?:e|ing)) (?:people|contacts|relationships)\b/g,'crm')
  .replace(/\b(?:relationship|contact) management\b/g,'crm')
  .replace(/\b(?:step[\s-]+by[\s-]+step|multi[\s-]+step)\b/g,'multistep')
  .replace(/\b(?:dark|night)[\s-]+mode\b/g,'dark').replace(/\blight[\s-]+mode\b/g,'light')
  .replace(/\b(?:big|large|full[\s-]+(?:screen|bleed)|hero) (?:photo(?:graph(?:y|ic)?)?s?|images?|pictures?|imagery)\b/g,'imagehero')
  .replace(/\b(?:photo(?:graphic)?|image) hero\b/g,'imagehero')
  .replace(/\b(?:big|large|bold|oversized) (?:type|typography|text|headlines?)\b/g,'boldtype')
  .replace(/\bthree[\s-]+dimensional\b/g,'3d')
  .replace(/\b(?:off[\s-]+white)\b/g,'offwhite');
const words = value => new Set(conceptText(value).match(/[a-z0-9]+/g)||[]);
const literalText = value => baseText(value).replace(/[^a-z0-9]+/g,' ').trim();
function variants(word) {
  if(word.length>4&&word.endsWith('ies'))return [word,word.slice(0,-3)+'y'];
  if(word.length>3&&word.endsWith('s')&&!word.endsWith('ss')&&!word.endsWith('us'))return [word,word.slice(0,-1)];
  return [word,word+'s'];
}
function makeField(value,weight,visual=false) {
  const text=Array.isArray(value)?value.join(' '):String(value??'');
  return {weight,visual,words:words(text),literal:literalText(text)};
}
function indexArchive(items) {
  const identities=new Set();
  const records=items.map((item,index)=>{
    const project=typeof item.project==='object'?item.project?.name:item.project;
    for(const term of words([project,item.projectName,item.projectId,item.origin].filter(Boolean).join(' ')))if(!FILLER.has(term))identities.add(term);
    const meta=item.searchMeta||{};
    const fields=[makeField(item.name,8),makeField([project,item.projectName,item.projectId,item.origin,item.id].filter(Boolean),6),makeField(item.tags||[],5),makeField(item.description,2),makeField(meta.visual||[],5,true),makeField(meta.features||[],5),makeField(meta.phrases||[],4)];
    if(/[/\\]greekwars(?:[/\\.]|$)/i.test(`${item.sourcePath||''} ${item.sourceUrl||''}`))fields.push(makeField('greekwars',3));
    return {item,index,fields};
  });
  const dictionary=new Map();
  const add=word=>{if(!FILLER.has(word))dictionary.set(word,(dictionary.get(word)||0)+1);};
  records.forEach(record=>record.fields.forEach(field=>field.words.forEach(add)));
  Object.keys(TYPES).forEach(add);TOPIC_BY_ALIAS.forEach((_,word)=>add(word));
  return {records,dictionary,identities};
}

// Optimal string-alignment distance catches adjacent swapped letters as one
// typo. Short fragments and ambiguous equal-distance alternatives stay exact.
function editDistance(a,b,limit) {
  if(Math.abs(a.length-b.length)>limit)return limit+1;
  let previousPrevious=null,previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const current=[i];
    for(let j=1;j<=b.length;j++){
      current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])current[j]=Math.min(current[j],previousPrevious[j-2]+1);
    }
    previousPrevious=previous;previous=current;
  }
  return previous[b.length];
}
function conceptKey(word){return TYPES[word]?`type:${TYPES[word]}`:TOPIC_BY_ALIAS.has(word)?`topic:${TOPIC_BY_ALIAS.get(word).id}`:`word:${variants(word).sort()[0]}`;}
function correctWord(term,dictionary) {
  if(term.length<4||term.length>32||dictionary.has(term)||variants(term).some(word=>dictionary.has(word)))return term;
  const limit=term.length>=9?2:1;
  let best=limit+1,candidates=[];
  for(const [candidate,frequency] of dictionary){
    if(candidate.length<4||Math.abs(candidate.length-term.length)>limit)continue;
    if(term.length===4){
      const changed=[...term].map((letter,i)=>letter!==candidate[i]?i:-1).filter(i=>i>=0);
      if(candidate.length!==4||changed.length!==2||changed[1]!==changed[0]+1||term[changed[0]]!==candidate[changed[1]]||term[changed[1]]!==candidate[changed[0]])continue;
    }
    const distance=editDistance(term,candidate,limit);
    if(distance<best){best=distance;candidates=[{candidate,frequency}];}
    else if(distance===best)candidates.push({candidate,frequency});
  }
  if(best>limit||new Set(candidates.map(x=>conceptKey(x.candidate))).size!==1)return term;
  candidates.sort((a,b)=>b.frequency-a.frequency||a.candidate.localeCompare(b.candidate));
  return candidates[0]?.candidate||term;
}
function tokenize(query) {
  // Quotes are literal; phrase aliases and typo correction operate outside them.
  const tokens=[];
  const input=String(query??'').slice(0,160).replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
  for(const part of input.matchAll(/"([^"]*)"|'([^']*)'|((?:[a-z0-9]'[a-z0-9]|[^"'])+)/gi)){
    if(part[1]!==undefined||part[2]!==undefined){const text=literalText(part[1]??part[2]);if(text)tokens.push({literal:text});continue;}
    const text=conceptText(part[3]).replace(/\b(?:other than|rather than|but not|apart from|except for)\b/g,' except ').replace(/\b(?:do not|don't|dont|don t) (?:show|include|want|need)\b/g,' not ');
    for(const match of text.matchAll(/(?<![a-z0-9])-[a-z0-9]+|[a-z0-9]+|(?<![a-z0-9])[-,]/g))tokens.push({word:match[0]});
  }
  return tokens;
}
function parseQuery(query,index) {
  const corrections=[],tokens=tokenize(query),positive=[],negative=[];
  let excluding=false,excluded=[],excludeNext=false;
  const flushNegative=()=>{if(excluded.length)negative.push(excluded);excluded=[];};
  for(const token of tokens){
    const word=token.word;
    if(excludeNext){negative.push([token]);excludeNext=false;continue;}
    if(['without','except','excluding','exclude','not'].includes(word)){flushNegative();excluding=true;continue;}
    if(word?.startsWith('-')&&word.length>1){negative.push([{word:word.slice(1)}]);continue;}
    if(word==='-'){excludeNext=true;continue;}
    if(excluding){
      if(['and','or',','].includes(word)){flushNegative();continue;}
      if(word==='but'){flushNegative();excluding=false;continue;}
      excluded.push(token);
    }else positive.push(token);
  }
  flushNegative();
  const toConcept=token=>{
    if(token.literal)return {key:`phrase:${token.literal}`,literal:token.literal};
    if(FILLER.has(token.word)||['or',',','but'].includes(token.word))return null;
    const term=correctWord(token.word,index.dictionary);
    if(term!==token.word&&!corrections.some(x=>x.from===token.word))corrections.push({from:token.word,to:term});
    const topic=TOPIC_BY_ALIAS.get(term);
    return {key:conceptKey(term),term,category:TYPES[term],visual:topic?.visual||false,words:[...new Set((topic?.words||[term]).flatMap(variants))],identity:index.identities.has(term)};
  };
  const dedupe=list=>[...new Map(list.filter(Boolean).map(concept=>[concept.key,concept])).values()];
  // A category on both sides of "and" means two requested kinds of work.
  // Ordinary feature conjunctions stay AND: signup + calendar must both match.
  const rawGroups=[[]];
  for(let i=0;i<positive.length;i++){
    const token=positive[i],current=rawGroups.at(-1);
    const leftType=current.some(t=>TYPES[t.word]);
    const remaining=positive.slice(i+1),nextAlternative=remaining.findIndex(t=>t.word==='or');
    const rightTokens=remaining.slice(0,nextAlternative<0?undefined:nextAlternative);
    const rightType=rightTokens.some(t=>TYPES[t.word]);
    if(token.word==='or'||((token.word==='and'||token.word===',')&&leftType&&rightType)){if(current.length)rawGroups.push([]);continue;}
    current.push(token);
  }
  let groups=rawGroups.map(group=>dedupe(group.map(toConcept)));
  const exclusions=negative.map(group=>dedupe(group.map(toConcept))).filter(group=>group.length);
  // Preserve a shared project/style in "fomo pages or portals". Explicitly
  // named alternative projects remain independent ("fomo or milo pages").
  if(groups.length>1){
    const first=groups[0],shared=first.filter(c=>!c.category);
    groups=groups.map((group,i)=>{
      if(!i||!group.length)return group;
      if(group.every(c=>c.category))return dedupe([...shared,...group]);
      return group;
    });
    const lastCategories=groups.at(-1).filter(c=>c.category);
    const allCategories=new Set(groups.flatMap(group=>group.filter(c=>c.category).map(c=>c.category)));
    if(lastCategories.length&&allCategories.size===1){
      groups=groups.map(group=>group.length&&!group.some(c=>c.category)?dedupe([...group,...lastCategories]):group);
    }
  }
  // A dangling OR must not widen a constrained search to the whole archive.
  if(groups.some(group=>group.length))groups=groups.filter(group=>group.length);
  return {groups,exclusions,corrections};
}
function matchConcept(record,concept) {
  if(concept.category)return record.item.category===concept.category?10:0;
  if(concept.literal)return record.fields.reduce((score,field)=>score+(` ${field.literal} `.includes(` ${concept.literal} `)?field.weight+4:0),0);
  let score=0;
  for(const field of record.fields){
    if(concept.visual&&!field.visual)continue;
    if(concept.words.some(word=>field.words.has(word)))score+=field.weight+(field.words.has(concept.term)?1:0);
  }
  return score;
}
function matchGroup(record,group) {
  let score=0;
  for(const concept of group){const match=matchConcept(record,concept);if(!match)return null;score+=match;}
  return score;
}

/** Ranked originals plus transparent spelling feedback. No network, mutation,
 * hidden result limit, or relaxing a failed constraint into unrelated results. */
export function searchArchiveDetailed(items,query='') {
  const index=indexArchive(items),parsed=parseQuery(query,index);
  const ranked=[];
  for(const record of index.records){
    if(parsed.exclusions.some(group=>matchGroup(record,group)!==null))continue;
    const scores=parsed.groups.map(group=>matchGroup(record,group)).filter(score=>score!==null);
    if(scores.length)ranked.push({...record,score:Math.max(...scores)});
  }
  ranked.sort((a,b)=>b.score-a.score||a.index-b.index);
  return {items:ranked.map(record=>record.item),corrections:parsed.corrections};
}
export function searchArchive(items,query=''){return searchArchiveDetailed(items,query).items;}
