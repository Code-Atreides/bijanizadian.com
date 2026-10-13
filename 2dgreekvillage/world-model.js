import {houseStandings} from './shared/village-competition.js?v=183';
import {rankedHouseSizes} from './shared/village-house-sizing.js?v=183';
import {backyardUnlocked,hasChapterHouse,onboardingGoal} from './shared/village-backyards.js?v=183';
import {bannerIdentity,houseEarnings} from './shared/village-banner-art.js?v=183';
import {campusIdentity} from './shared/village-school-identities.js?v=183';
import {hash} from './shared/village-district-layout.js?v=183';
export {houseStandings,rankedHouseSizes,backyardUnlocked,hasChapterHouse,onboardingGoal,bannerIdentity,houseEarnings,campusIdentity,hash};

const GREEK={alpha:'Α',beta:'Β',gamma:'Γ',delta:'Δ',epsilon:'Ε',zeta:'Ζ',eta:'Η',theta:'Θ',iota:'Ι',kappa:'Κ',lambda:'Λ',mu:'Μ',nu:'Ν',xi:'Ξ',omicron:'Ο',pi:'Π',rho:'Ρ',sigma:'Σ',tau:'Τ',upsilon:'Υ',phi:'Φ',chi:'Χ',psi:'Ψ',omega:'Ω'};
export const letters=c=>c.name.toLowerCase().split(/\s+/).map(w=>GREEK[w]||'').join('')||c.letters;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const visibleChapters=cs=>houseStandings(cs.filter(c=>c.joined>30),'members');
export const percent=c=>Math.round(c.joined/c.active*100);
// Brand rule: the company name is always lowercase "fomo", even in title case.
export const titleCase=s=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bFomo\b/g,'fomo');

// Street grid. Greek Row is a six-column grid of lots between the west campus
// (stadium, courts, helipad) and the east campus (trophy, shops). Cross streets
// only run through Greek Row, so no road passes through a landmark.
export const ROAD=44;
export const LOT_X=[656,846,1148,1338,1640,1830];
export const AVENUES=[100,572,1072,1564,2056,2356];
const LOT_W=176,LOT_H=248;
const inside=(x,y,r,pad=0)=>x>r.x-pad&&x<r.x+r.w+pad&&y>r.y-pad&&y<r.y+r.h+pad;
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export function createWorld(chapters){
 const visible=visibleChapters(chapters),sizes=rankedHouseSizes(visible,'members');
 const rows=Math.max(4,Math.ceil((visible.length+1)/6));
 const street=r=>264+r*288,south=street(rows)+ROAD,bottom=south+560;
 const world={width:2440,height:bottom+ROAD+96,chapters,visible,lots:[],vacant:[],people:[],obstacles:[],trees:[],furniture:[],buildings:[],roads:[],landmarks:[],walkways:[],parked:[],rows,south,bottom,streets:[]};
 visible.forEach((chapter,i)=>{
   const x=LOT_X[i%6],y=300+Math.floor(i/6)*288;
   const size=sizes.get(chapter.id),growth=1-Math.exp(-Math.max(0,chapter.joined-30)/85);
   const lot={id:chapter.id,chapter,x,y,w:LOT_W,h:LOT_H,size,growth,identity:bannerIdentity(chapter),school:campusIdentity({name:chapter.school}),pool:backyardUnlocked(chapter),rank:chapter.rank};
   lot.house={x:x+88,y:y+202,w:Math.round(88+growth*44),h:Math.round(74+growth*45)};
   lot.door={x:x+88,y:y+220};
   world.lots.push(lot);world.obstacles.push({x:lot.house.x-lot.house.w/2-3,y:y+149,w:lot.house.w+6,h:56,type:'house',id:lot.id});
   if(lot.pool)world.obstacles.push({x:x+17,y:y+26,w:85,h:42,type:'pool'});
   // Exactly one visual resident per onboarded member. Roles partition this roster.
   const spots=[];
   for(let yy=213;yy<=246;yy+=6)for(let xx=8;xx<170;xx+=7){if((xx>25&&xx<70&&yy>218)||(xx>111&&xx<150&&yy>216)||(xx>74&&xx<104&&yy<229))continue;spots.push([xx,yy]);}
   for(let yy=112;yy<210;yy+=7)for(const xx of [10,19,155,165])spots.push([xx,yy]);
   for(let xx=37;xx<140;xx+=8)spots.push([xx,207]);
   spots.sort((a,b)=>hash(lot.id,a[0],a[1])-hash(lot.id,b[0],b[1]));
   for(let m=0;m<chapter.joined;m++){
     const poolRole=lot.pool&&m<6,k=m-(lot.pool?6:0);
     const role=poolRole?(m<2?'swim':m<4?'lounge':'poolchat'):k<2?'pong':k<6?'die':hash(lot.id,m,'role')<.17?'dance':hash(lot.id,m,'role')<.42?'walk':'chat';
     const spot=spots[m%spots.length],py=y+spot[1]+hash(lot.id,m,'py'),px=x+spot[0]+hash(lot.id,m,'px');
     world.people.push({id:lot.id+':'+m,chapter:lot.id,index:m,lot,role,x:px,y:py,seed:hash(lot.id,m),skin:Math.floor(hash(lot.id,m,'skin')*6),shirt:Math.floor(hash(lot.id,m,'shirt')*9),hair:Math.floor(hash(lot.id,m,'hair')*5)});
   }
 });
 // The next free lot is the claimable one; the rest of the row is vacant land.
 const slot=i=>({x:LOT_X[i%6],y:300+Math.floor(i/6)*288,w:LOT_W,h:LOT_H});
 world.empty={...slot(visible.length),id:'empty'};
 for(let i=visible.length+1;i<rows*6;i++)world.vacant.push({...slot(i),id:'vacant-'+i});

 // Roads: full-width north, south-campus and bottom drives; Greek Row cross streets.
 for(const x of AVENUES)world.roads.push({x,y:264,w:ROAD,h:bottom+ROAD-264,vertical:true});
 for(let r=0;r<=rows;r++){const full=r===0||r===rows;world.roads.push({x:full?100:572,y:street(r),w:full?2300:2100-572,h:ROAD,vertical:false});world.streets.push(street(r));}
 world.roads.push({x:100,y:bottom,w:2300,h:ROAD,vertical:false});world.streets.push(bottom);
 const S=south;
 world.sites={
  terrace:{x:769,y:75,w:284,h:150},campusLife:{x:748,y:193},population:{x:764,y:229},bell:{x:450,y:59},waterTower:{x:1996,y:42},
  parking:{x:168,y:322,w:380,h:112},court:{x:176,y:790,w:340,h:108},trucks:{x:164,y:1212,w:388,h:188},
  coffee:{x:2185,y:786},patio:{x:2140,y:770,w:170,h:52},backPatio:{x:2147,y:1019,w:165,h:55},
  banner:{x:1060,y:340},shelters:[{x:2112,y:1398},{x:174,y:S+528}],
  intramural:{x:640,y:S+26,w:408,h:224},social:{x:668,y:S+318,w:356,h:190},garden:{x:174,y:S+346,w:370,h:150},
  quad:{x:1126,y:S,w:438,h:560},fountain:{x:1345,y:S+318},bonfire:{x:1345,y:S+478},laundry:{x:2140,y:S+290,w:200}
 };
 world.landmarks=[
 {id:'stadium',name:'FOMO FIELD',subtitle:'Football, fans & fireworks',x:156,y:450,w:398,h:294,focus:{x:355,y:597}},
 {id:'court',name:'THE COURTS',subtitle:'Pickup hoops, all day',x:176,y:790,w:340,h:108,focus:{x:346,y:846}},
 {id:'helipad',name:'THE HELIPAD',subtitle:'A proper campus arrival',x:164,y:930,w:354,h:258,focus:{x:338,y:1060}},
 {id:'trophy',name:'NATIONAL CHAMPION',subtitle:'The prize is still under wraps',x:2120,y:360,w:180,h:185,focus:{x:2206,y:500}},
 {id:'leaderboard',name:'THE LEADERBOARD',subtitle:'Ranked by members onboarded',x:627,y:150,w:104,h:104,focus:{x:676,y:246}},
 {id:'park',name:'WILLOW GREEN',subtitle:'Take the scenic route',x:164,y:S+20,w:354,h:300,focus:{x:252,y:S+300}},
 ];
 world.buildings=[
 {x:830,y:152,w:210,h:126,label:'UNIVERSITY LIBRARY',type:'library',color:'#eec486',roof:'#258b9a'},
 {x:1300,y:150,w:190,h:102,label:'STUDENT UNION',type:'union',color:'#f1c79b',roof:'#c45777'},
 {x:1460,y:170,w:95,h:82,label:'HUMANITIES',type:'hall',color:'#e9c08d',roof:'#377f9f'},
 {x:1794,y:150,w:212,h:120,label:'SCIENCE & ENGINEERING',type:'science',color:'#d6dfc7',roof:'#3b6c9c'},
 {x:334,y:202,w:152,h:100,label:'CORNER SLICE',type:'shop',color:'#de8b60',roof:'#a54263'},
 {x:2220,y:180,w:148,h:104,label:'SCHOOL OF THE ARTS',type:'arts',color:'#efc698',roof:'#d5753f'},
 {x:2220,y:704,w:154,h:118,label:'RECREATION CENTER',type:'gym',color:'#e3b580',roof:'#497faf'},
 {x:2218,y:966,w:140,h:102,label:'AFTER HOURS',type:'shop',color:'#d2b698',roof:'#8251aa'},
 {x:2220,y:1212,w:146,h:112,label:'CAMPUS MARKET',type:'shop',color:'#e8af77',roof:'#35826f'},
 {x:1345,y:S+172,w:206,h:110,label:'LECTURE HALL',type:'arts',color:'#d5bcb0',roof:'#ba604f'},
 {x:1728,y:S+172,w:150,h:132,label:'STUDENT RESIDENCES',type:'hall',color:'#c8b696',roof:'#4a64a3'},
 {x:1940,y:S+172,w:141,h:103,label:'BOOKS / RECORDS',type:'shop',color:'#c9ab85',roof:'#7853b3'},
 {x:1728,y:S+440,w:148,h:104,label:'NEEDLE & GROOVE',type:'shop',color:'#deae81',roof:'#695bb0'},
 {x:1940,y:S+440,w:148,h:102,label:'SECOND HAND',type:'shop',color:'#d2bda2',roof:'#2e9293'},
 {x:2228,y:S+172,w:176,h:112,label:'fomo CAMPUS HUB',type:'hub',color:'#eaedff',roof:'#516af6'},
 {x:2180,y:S+470,w:91,h:85,label:'MAPLE COURT',type:'cottage',color:'#bba28b',roof:'#bb5267'},
 {x:2290,y:S+470,w:104,h:88,label:'PORCH LANE',type:'cottage',color:'#d6be98',roof:'#2a8474'},
 ];
 for(const b of world.buildings)world.obstacles.push({x:b.x-b.w/2,y:b.y-35,w:b.w,h:44,type:'building'});
 // Stadium: stands and side walls, with gates at mid-field on both touchlines.
 const st=world.landmarks[0];
 world.obstacles.push({x:st.x,y:st.y,w:st.w,h:60,type:'stadium'},{x:st.x,y:st.y+st.h-60,w:st.w,h:60,type:'stadium'});
 for(const x of [st.x,st.x+st.w-12])world.obstacles.push({x,y:st.y+60,w:12,h:68,type:'stadium'},{x,y:st.y+164,w:12,h:70,type:'stadium'});
 world.obstacles.push({x:2162,y:380,w:110,h:90,type:'trophy'});
 const {fountain,bonfire,trucks}=world.sites;
 world.obstacles.push({x:fountain.x-30,y:fountain.y-22,w:60,h:40,type:'fountain'},{x:bonfire.x-12,y:bonfire.y-6,w:24,h:14,type:'bonfire'});
 world.obstacles.push({x:252,y:S+64,w:122,h:96,type:'pond'});
 world.foodTrucks=[{x:trucks.x+40,y:trucks.y+30,label:'TACOS',color:'#4f8fc0'},{x:trucks.x+170,y:trucks.y+30,label:'BOBA',color:'#d77ca0'},{x:trucks.x+300,y:trucks.y+30,label:'WINGS',color:'#7aa35a'}];
 for(const t of world.foodTrucks)world.obstacles.push({x:t.x-34,y:t.y-24,w:68,h:30,type:'truck'});
 // Parked cars sit in marked stalls of the stadium lot, never on the field sign.
 const lot=world.sites.parking;
 for(let i=0;i<11;i++){if(hash(i,'stall')<.25)continue;const x=lot.x+20+i*32,y=lot.y+30;world.parked.push({x,y,kind:(i*3)%5});world.obstacles.push({x:x-9,y:y-17,w:18,h:34,type:'car'});}
 for(let i=0;i<11;i++){if(hash(i,'stall2')<.4)continue;const x=lot.x+20+i*32,y=lot.y+84;world.parked.push({x,y,kind:(i*7+2)%5});world.obstacles.push({x:x-9,y:y-17,w:18,h:34,type:'car'});}

 // Deterministic detail placement stays stable when counts change. Decorations
 // never land on a road, landmark, building footprint or pool.
 const keepOut=[...world.roads.map(r=>({x:r.x-10,y:r.y-10,w:r.w+20,h:r.h+20})),...world.landmarks,...world.buildings.map(b=>({x:b.x-b.w/2-6,y:b.y-b.h-20,w:b.w+12,h:b.h+30})),
  lot,world.sites.court,trucks,world.sites.intramural,world.sites.social,world.sites.garden,{x:2120,y:360,w:190,h:150},world.sites.patio,world.sites.backPatio,{x:fountain.x-90,y:fountain.y-70,w:180,h:150},{x:bonfire.x-60,y:bonfire.y-40,w:120,h:80}];
 const free=(x,y)=>!keepOut.some(r=>overlaps({x:x-3,y:y-6,w:7,h:8},r));
 const plant=(x,y,kind)=>{if(free(x,y))world.trees.push({x,y,kind:kind||(hash(x,y)>0.76?'pine':'tree'),seed:hash(x,y)});};
 for(let r=0;r<rows;r++)for(const x of [630,1032,1130,1528,1622,2020]){const y=332+r*288;plant(x,y);plant(x,y+202,'tree');}
 for(let y=300;y<world.height-60;y+=85)plant(70,y);
 for(let y=330;y<1400;y+=92){plant(2124,y);plant(2338,y);}
 for(const [x,y] of [[158,776],[551,776],[158,916],[551,916],[158,1200],[551,1200],[551,1406],[158,1406]])plant(x,y);
 for(let x=640;x<1060;x+=70)plant(x,S+296);
 for(let x=1140;x<1560;x+=96){plant(x,S+250);}
 for(const [x,y] of [[1140,S+400],[1550,S+400],[1150,S+540],[1540,S+540],[2124,S+300],[2340,S+300],[2124,S+60],[2340,S+60],[1630,S+300],[2040,S+300]])plant(x,y);
 // Street lamps stand on the corner sidewalks, never in the traffic lanes.
 for(const x of AVENUES)for(const y of world.streets){if(!world.roads.some(r=>!r.vertical&&r.y===y&&x>=r.x&&x+ROAD<=r.x+r.w))continue;world.furniture.push({x:x+ROAD+5,y:y-6,type:'lamp'});}
 for(let r=0;r<rows;r++)for(const x of [626,1130,1622])world.furniture.push({x:x+16,y:300+r*288+160,type:'bench'});
 // Sidewalk walkways for visitors: alongside every avenue and Greek Row street.
 for(const a of AVENUES){for(const side of [-5,ROAD+5])world.walkways.push({x1:a+side,y1:314,x2:a+side,y2:bottom-12,vertical:true});}
 for(let r=0;r<=rows;r++){const y=street(r);for(const side of [-5,ROAD+5])world.walkways.push({x1:626,y1:y+side,x2:2046,y2:y+side,vertical:false});}
 world.walkways=world.walkways.filter(w=>w.y1>=300||w.vertical);
 for(let i=0;i<84;i++){
   const w=world.walkways[i%world.walkways.length],role=i%11===0?'dog':i%7===0?'bike':'visitor',len=Math.hypot(w.x2-w.x1,w.y2-w.y1);
   world.people.push({id:'visitor-'+i,role,walk:w,len,speed:role==='bike'?22+hash(i,'v')*8:5+hash(i,'v')*5,x:w.x1,y:w.y1,seed:hash(i,'visitor'),skin:i%6,shirt:(i*5)%9,hair:(i*3)%5});
 }
 for(const t of world.trees)world.obstacles.push({x:t.x-3,y:t.y-5,w:7,h:8,type:'tree'});
 return world;
}
export function nearInteraction(world,x,y){
 let best=null,dist=64;
 for(const lot of world.lots){const d=Math.hypot(x-lot.door.x,y-lot.door.y);if(d<dist){dist=d;best={type:'chapter',id:lot.id,label:lot.chapter.name};}}
 for(const l of world.landmarks){const d=Math.hypot(x-l.focus.x,y-l.focus.y);if(d<dist){dist=d;best={type:'landmark',id:l.id,label:titleCase(l.name)};}}
 const e=world.empty;if(e){const d=Math.hypot(x-(e.x+88),y-(e.y+220));if(d<dist)best={type:'claim',id:'empty',label:'Claim this lot'};}
 return best;
}
export function canMove(world,x,y){
 if(x<110||y<180||x>world.width-50||y>world.height-50)return false;
 return !world.obstacles.some(o=>x>o.x-3&&x<o.x+o.w+3&&y>o.y-2&&y<o.y+o.h+3);
}
export function memberPose(p,t){
 const l=p.lot,phase=p.seed*Math.PI*2;
 if(!l){
   // Visitors pace back and forth along a sidewalk instead of wrapping.
   const w=p.walk,len=p.len||1,s=(p.seed*len*2+t*p.speed)%(2*len),u=(s<len?s:2*len-s)/len,fwd=s<len;
   const x=w.x1+(w.x2-w.x1)*u,y=w.y1+(w.y2-w.y1)*u;
   return {x,y,frame:Math.floor(t*(p.role==='bike'?8:6)+phase)%4,dir:w.vertical?(fwd?2:0):(fwd?1:3)};
 }
 if(p.role==='swim')return {x:l.x+37+Math.sin(t*.5+phase)*22,y:l.y+44+Math.cos(t*.6+phase)*9,frame:Math.floor(t*4)%4,dir:2};
 if(p.role==='lounge')return {x:l.x+122+(p.index%2)*21,y:l.y+44,frame:0,dir:2};
 if(p.role==='poolchat')return {x:l.x+99+(p.index%2)*12,y:l.y+80,frame:0,dir:2};
 const k=p.index-(l.pool?6:0);
 if(p.role==='pong')return {x:l.x+28+(k%2)*37,y:l.y+232,frame:Math.floor(t*2)%2,dir:k%2?3:1};
 if(p.role==='die')return {x:l.x+115+(k%2)*31,y:l.y+222+Math.floor((k-2)/2)*24,frame:Math.floor(t*2+p.seed)%2,dir:k%2?3:1};
 if(p.role==='walk'){
   const v=(t*(5+p.seed*4)+p.seed*240)%240;
   return {x:l.x+15+(v<120?v:240-v),y:l.y+247+Math.sin(phase)*3,frame:Math.floor(t*6)%4,dir:v<120?1:3};
 }
 return {x:p.x+Math.sin(t*.4+phase)*2,y:p.y+(p.role==='dance'?Math.sin(t*7+phase)*1.5:0),frame:p.role==='dance'?Math.floor(t*5+phase)%4:0,dir:Math.floor(p.seed*4)};
}
export {inside,overlaps};
