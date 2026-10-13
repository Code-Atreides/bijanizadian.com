// Public Wikipedia file metadata; no API key and no registration data is sent.
const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function logoCandidates(images,title){
  const words=normalize(title).split(' ').filter(w=>w.length>2&&!['the','university','college','state','of','and'].includes(w));
  return images.map(image=>{
    const name=normalize(image.title),overlap=words.filter(w=>name.split(' ').includes(w)).length;
    const kind=/\b(wordmark|logo|logotype)\b/.test(name)?30:/\b(seal|crest)\b/.test(name)?10:0;
    return {...image,score:kind&&overlap?kind+overlap*5+(name.includes(normalize(title))?20:0):0};
  }).filter(image=>image.score>0).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
}
export async function discoverSchoolArtwork(name,{fetchImpl=globalThis.fetch}={}){
  const school=String(name||'').trim();if(school.length<4||school.length>180)return null;
  const query=async params=>{
    const url=new URL('https://en.wikipedia.org/w/api.php');
    url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',...params});
    const response=await fetchImpl(url.href,{signal:AbortSignal.timeout(6500),credentials:'omit'});
    if(!response.ok)throw new Error('School artwork unavailable');return response.json();
  };
  const result=await query({titles:school,redirects:'1',prop:'images|pageprops|extracts',imlimit:'100',exintro:'1',explaintext:'1',exsentences:'2'});
  const page=result.query?.pages?.[0];
  if(!page||page.missing||page.pageprops?.disambiguation!==undefined||!/(university|college|institute|polytechnic|school)/i.test(page.title)||!/(university|college|education|institution|polytechnic)/i.test(page.extract||''))return null;
  const candidates=logoCandidates(page.images||[],page.title).slice(0,3);if(!candidates.length)return null;
  const files=await query({titles:candidates.map(c=>c.title).join('|'),prop:'imageinfo',iiprop:'url',iiurlwidth:'800'});
  for(const candidate of candidates){
    const info=files.query?.pages?.find(p=>p.title===candidate.title)?.imageinfo?.[0];
    if(!info)continue;
    const logo=info.thumburl||info.url;
    try{const url=new URL(logo);if(url.protocol!=='https:'||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname))continue;}catch{continue;}
    return {logo,source:info.descriptionurl,title:page.title};
  }
  return null;
}
const requests=new Map();
export function resolveSchoolArtwork(name){
  const key=normalize(name),cached=requests.get(key);
  if(cached&&cached.expires>Date.now())return cached.promise;
  const entry={expires:Infinity};
  entry.promise=discoverSchoolArtwork(name).catch(()=>null).then(result=>{entry.expires=Date.now()+(result?86400000:60000);return result;});
  requests.set(key,entry);return entry.promise;
}
// Pick a saturated school color from the mark, excluding transparent/white pixels.
export function artworkPalette(image,fallback){
  try{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=48;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,48,48);
    const {data}=ctx.getImageData(0,0,48,48),bins=new Map();
    for(let i=0;i<data.length;i+=4){
      const rgb=[data[i],data[i+1],data[i+2]],max=Math.max(...rgb),min=Math.min(...rgb);
      if(data[i+3]<180||max-min<35||max>245&&min>190)continue;
      const key=rgb.map(c=>Math.round(c/32)*32).join(',');const bin=bins.get(key)||{count:0,rgb};bin.count++;bins.set(key,bin);
    }
    const color=[...bins.values()].sort((a,b)=>b.count-a.count)[0];
    return color?'#'+color.rgb.map(c=>Math.round(c*.70).toString(16).padStart(2,'0')).join(''):fallback;
  }catch{return fallback;}
}
