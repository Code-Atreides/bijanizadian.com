import {rect,text,line,disc,poly,BRAND,fomo,textWidth} from '../pixel-art.js?v=10';

// Flight to New York: carry Orangie and Rasmr from campus to the Downtown
// heliport. Hold to climb, release to descend. Weather, wildlife and the
// skyline stand in the way; fuel cans keep you flying; land softly to win.
export const DISTANCE=6200,HELI_X=74,CEILING=27,MAX_HEARTS=3,SAFE_LANDING=62;
export const BIOMES=[{at:0,name:'CAMPUS'},{at:1100,name:'COUNTRYSIDE'},{at:2500,name:'THE TURNPIKE'},{at:3900,name:'THE HUDSON'},{at:4900,name:'MANHATTAN'}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
function rng(seed){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export const biomeAt=d=>[...BIOMES].reverse().find(b=>d>=b.at);
export function groundAt(d){return d>=3900&&d<4900?166:156;}
const hexToRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lerpCol=(a,b,t)=>'#'+hexToRgb(a).map((v,i)=>Math.round(mix(v,hexToRgb(b)[i],t)).toString(16).padStart(2,'0')).join('');
// Sky palettes move from a bright campus afternoon to a fomo-blue city dusk.
const SKIES=[[0,['#6aa2e6','#86b6ec','#a6caf0','#c9dff5']],[2500,['#6c94da','#90b0e6','#c2c9e6','#f0d9c8']],[3900,['#4b5fc0','#7b7fd0','#c9a3c6','#f2c3a8']],[5200,[BRAND.navy,'#2d3590',BRAND.blue,BRAND.light]]];
function skyAt(d){let i=0;while(i<SKIES.length-1&&d>=SKIES[i+1][0])i++;const a=SKIES[i],b=SKIES[Math.min(i+1,SKIES.length-1)],t=b===a?0:clamp((d-a[0])/(b[0]-a[0]),0,1);return a[1].map((c,k)=>lerpCol(c,b[1][k],t));}
// Obstacles are generated once per attempt, spaced so there is always a path.
export function course(seed){
 const r=rng(seed),list=[];let x=420;
 while(x<DISTANCE-260){
  const b=biomeAt(x).name,g=groundAt(x),roll=r();let o;
  if(b==='CAMPUS')o=roll<.4?{type:'tower',w:22,h:60+r()*36}:roll<.75?{type:'birds',y:40+r()*80,n:3+Math.floor(r()*3)}:{type:'blimp',y:44+r()*50};
  else if(b==='COUNTRYSIDE')o=roll<.3?{type:'radio',w:6,h:70+r()*30}:roll<.6?{type:'birds',y:30+r()*90,n:4+Math.floor(r()*4)}:roll<.8?{type:'balloon',y:50+r()*70}:{type:'water',w:30,h:58+r()*24};
  else if(b==='THE TURNPIKE')o=roll<.35?{type:'billboard',w:46,h:60+r()*30}:roll<.7?{type:'drone',y:40+r()*90}:{type:'pylon',w:16,h:70+r()*30};
  else if(b==='THE HUDSON')o=roll<.4?{type:'gulls',y:40+r()*90,n:4+Math.floor(r()*3)}:roll<.7?{type:'storm',y:22+r()*20}:{type:'news',y:50+r()*70};
  else o=roll<.6?{type:'tower',w:30+r()*20,h:58+r()*42,city:true}:roll<.8?{type:'storm',y:22+r()*16}:{type:'crane',w:8,h:80+r()*20};
  o.x=x;o.seed=r();o.g=g;list.push(o);
  if(r()<.28)list.push({type:'fuel',x:x+90+r()*50,y:36+r()*90,g});
  x+=170+r()*120;
 }
 return list;
}
// Hit boxes in course coordinates (x is distance travelled, y is screen y).
export function hitboxes(o,t,d=0){
 // Moving hazards drift toward you only once they are on screen, so the
 // generated spacing between obstacles is preserved.
 const rel=Math.max(0,420-(o.x-d));
 if(o.type==='crane')return [{x:o.x,y:o.g-o.h,w:o.w,h:o.h},{x:o.x-40,y:o.g-o.h,w:70,h:4}];
 if(o.type==='tower'||o.type==='radio'||o.type==='billboard'||o.type==='pylon'||o.type==='water'){const w=o.w,h=o.h;return [{x:o.x,y:o.g-h,w,h}];}
 if(o.type==='birds'||o.type==='gulls'){const out=[];for(let i=0;i<o.n;i++){const bx=o.x+Math.abs(i-(o.n>>1))*9-rel*.35,by=o.y+(i-(o.n>>1))*6+Math.sin(t*3+i)*3;out.push({x:bx,y:by,w:7,h:4});}return out;}
 if(o.type==='blimp')return [{x:o.x,y:o.y,w:56,h:20}];
 if(o.type==='balloon')return [{x:o.x,y:o.y+Math.sin(t*.8+o.seed*6)*14,w:22,h:28}];
 if(o.type==='drone')return [{x:o.x,y:o.y+Math.sin(t*1.6+o.seed*6)*18,w:14,h:6}];
 if(o.type==='news')return [{x:o.x-rel*.45,y:o.y+Math.sin(t*1.2+o.seed*4)*18,w:30,h:12}];
 if(o.type==='storm'){const out=[{x:o.x,y:o.y-6,w:60,h:22}];if(stormStrike(o,t)>0)out.push({x:o.x+26,y:o.y+16,w:8,h:o.g-o.y-16});return out;}
 if(o.type==='fuel')return [{x:o.x,y:o.y,w:9,h:11}];
 return [];
}
// Lightning: a visible 0.9 s warning flicker, then a 0.35 s strike column.
export function stormStrike(o,t){const p=(t+o.seed*4)%3.2;return p>2.2&&p<2.55?1:p>1.3&&p<=2.2?-1:0;}
export const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export class FlightGame{
 static meta={id:'flight',title:'FLIGHT TO NEW YORK',subtitle:'ORANGIE & RASMR · TONIGHT · NYC',goal:'LAND THEM SAFELY DOWNTOWN',controls:['HOLD SPACE / TAP & HOLD: CLIMB','RELEASE: DESCEND. GRAB fomo FUEL.','DODGE BIRDS, DRONES & LIGHTNING. LAND SOFTLY.'],actionLabel:'LIFT'};
 constructor({art,audio,reduced,attempt=0}){this.art=art;this.audio=audio;this.reduced=reduced;this.items=course(901+attempt*131);this.d=0;this.t=0;this.y=96;this.vy=0;this.hearts=MAX_HEARTS;this.fuel=100;this.inv=0;this.speed=62;this.phase='fly';this.said=new Set();this.line=null;this.done=null;this.shake=0;this.got=0;this.landX=0;}
 start(){}
 say(s){this.line={text:s,t:0};}
 update(dt,input){
  this.t+=dt;this.inv=Math.max(0,this.inv-dt);this.shake=Math.max(0,this.shake-dt);if(this.line)this.line.t+=dt;
  if(this.phase==='crash'){this.vy+=260*dt;this.y+=this.vy*dt;if(this.y>200&&!this.done)this.done={won:false,score:Math.round(this.d/10),stars:0,title:this.fuel<=0?'OUT OF FUEL':'GROUNDED',line:`${Math.round((DISTANCE-this.d)/70)} MILES SHORT OF NYC`};return;}
  // Vertical flight model: lift while held, gravity otherwise, with damping.
  const lift=input.held&&this.fuel>0;this.vy+=(lift?-340:240)*dt;this.vy*=1-1.2*dt;this.vy=clamp(this.vy,-120,150);this.y+=this.vy*dt;
  if(this.y<CEILING){this.y=CEILING;this.vy=Math.max(0,this.vy);}
  if(this.phase==='fly'){
   this.speed=Math.min(88,62+this.d/220);this.d+=this.speed*dt;this.fuel=Math.max(0,this.fuel-dt*(lift?1.45:1.05));
   if(this.fuel<=0&&!this.said.has('fuel')){this.said.add('fuel');this.say('RASMR: WE ARE LOSING ALTITUDE!');}
   for(const [at,s] of [[120,'RASMR: WE GO LIVE IN AN HOUR.'],[1150,'ORANGIE: CHAT SAYS SEND IT.'],[2550,'RASMR: LOOK AT THAT TRAFFIC. GOOD CALL.'],[3950,'ORANGIE: IS THAT THE STATUE OF LIBERTY?'],[4950,'RASMR: SKYSCRAPERS. EASY. EASY.']])if(this.d>at&&!this.said.has(at)){this.said.add(at);this.say(s);}
   if(this.d>=DISTANCE){this.phase='land';this.landX=HELI_X;this.say('ORANGIE: STICK THE LANDING!');}
   for(const o of this.items){if(o.x>this.d+460||o.x<this.d-180||o.gone)continue;
    for(const h of hitboxes(o,this.t,this.d)){const box={...h,x:h.x-this.d+HELI_X};if(!overlap({x:HELI_X-14,y:this.y-6,w:28,h:12},box))continue;
     if(o.type==='fuel'){o.gone=true;this.fuel=Math.min(100,this.fuel+32);this.got++;this.audio.cue('fuel');this.say('RASMR: FUEL. NICE.');break;}
     if(this.inv<=0)this.hit();break;}
   }
   if(this.y>groundAt(this.d)-8){this.y=groundAt(this.d)-8;this.vy=-90;if(this.inv<=0)this.hit();}
   if(this.fuel<=0&&this.y>=groundAt(this.d)-9){this.crash();}
  }else if(this.phase==='land'){
   // Glide over the pad automatically; the player controls the descent.
   const padX=210,pad=this.padY();this.landX+=(padX-this.landX)*Math.min(1,dt*1.2);
   if(this.y>pad-8){
    if(Math.abs(this.landX-padX)<10&&this.vy<SAFE_LANDING){this.y=pad-8;this.phase='landed';this.audio.cue('land');const stars=this.hearts;
     this.done={won:true,score:Math.round(DISTANCE/10)+this.hearts*400+Math.round(this.fuel)*4+this.got*50,stars,title:'TOUCHDOWN, NYC!',line:`${this.hearts} OF ${MAX_HEARTS} HULL · ${this.got} FUEL CANS`};}
    else{this.y=pad-9;this.vy=-80;this.say('RASMR: OOF. TRY THAT AGAIN.');if(this.inv<=0)this.hit();}
   }
  }
 }
 padY(){return 140;}
 hit(){this.hearts--;this.inv=1.6;this.shake=.4;this.audio.cue('hit');const lines=['ORANGIE: MY GLASSES!','RASMR: BRO.','ORANGIE: THAT WAS CLOSE.','RASMR: WE ARE FINE. WE ARE FINE.'];this.say(lines[(this.hearts+lines.length)%lines.length]);if(this.hearts<=0)this.crash();}
 crash(){if(this.phase==='crash')return;this.phase='crash';this.vy=-40;this.audio.cue('crash');}
 draw(c,t){
  const d=this.d,sky=skyAt(d),sh=this.shake>0?Math.round(Math.sin(t*80)*2):0;
  c.save();c.translate(0,sh);
  sky.forEach((col,i)=>{rect(c,0,i*40-2,320,46,col);if(i<sky.length-1)for(let x=i%2;x<320;x+=2)rect(c,x,i*40+42,1,2,sky[i+1]);});
  const city=clamp((d-3500)/1400,0,1),dusk=clamp((d-4700)/900,0,1);
  if(dusk>0)for(let i=0;i<30;i++){const x=(i*53)%320,y=(i*29)%70+4;if((i+Math.floor(t*2))%7)rect(c,x,y,1,1,`rgba(234,237,255,${dusk*.8})`);}
  // Distant hills give way to the Manhattan skyline as the trip progresses.
  const far=-d*.12;
  for(let x=-40;x<360;x+=60){const k=Math.floor((x-far)/60),h=18+((k*37)%13);disc(c,Math.round(((x+far)%420+420)%420-40),118,44,lerpCol('#7aa0b8','#4d5a9a',city),h);}
  if(city>0){for(let i=0;i<26;i++){const bx=Math.round(((i*23+far*.5)%600+600)%600-140),h=20+((i*53)%60)+(i===12?40:0);rect(c,bx,124-h,16,h+10,lerpCol('#8a94c8','#2a2f78',dusk));if(i===12){rect(c,bx+6,124-h-14,4,14,lerpCol('#8a94c8','#2a2f78',dusk));rect(c,bx+7,124-h-22,2,8,lerpCol('#8a94c8','#2a2f78',dusk));}if(dusk>.3)for(let wy=124-h+4;wy<124;wy+=5)for(let wx=bx+3;wx<bx+14;wx+=5)if((wx*7+wy*3+i)%4===0)rect(c,wx,wy,2,2,'#ffe7a8');}}
  if(d>3500&&d<5600){const lx=Math.round(250-(d-3900)*.18);if(lx>-30&&lx<340){rect(c,lx,104,12,22,'#6aa58f');rect(c,lx+3,92,6,12,'#79b49e');rect(c,lx+5,84,2,8,'#79b49e');rect(c,lx+9,86,2,8,'#79b49e');rect(c,lx+9,82,3,3,'#f7e7a0');rect(c,lx-4,124,20,4,'#5d8f7c');}}
  for(let i=0;i<5;i++){const x=Math.round(((i*90-d*.25)%420+420)%420-60),y=24+((i*31)%40);disc(c,x,y,14,'#ffffffaa',4);disc(c,x+10,y-3,9,'#ffffffcc',4);}
  // Mid layer: campus, farmland, the jammed turnpike, river and streets.
  this.midground(c,d,t);
  // Course objects.
  for(const o of this.items){if(o.gone)continue;const sx=Math.round(o.x-d+HELI_X);if(sx<-200||sx>520)continue;this.object(c,o,sx,t);}
  if(this.phase!=='fly'||d>DISTANCE-400)this.heliport(c,d);
  // Landing read-out sits under the helicopter so it never hides the aircraft.
  if(this.phase==='land'){const v=Math.max(0,Math.round(this.vy));rect(c,0,16-sh,320,22,'#0b091fcc');text(c,`DESCENT ${v}`,6,20,v<SAFE_LANDING?BRAND.light:'#ff9aa8');text(c,`SAFE BELOW ${SAFE_LANDING}`,6,29,'#9899a3');text(c,'TAP / HOLD TO SLOW YOUR DESCENT',314,24,BRAND.white,1,'right');}
  // Helicopter with both passengers at the window.
  const hx=this.phase==='fly'||this.phase==='crash'?HELI_X:Math.round(this.landX);
  if(!(this.inv>0&&Math.floor(t*12)%2))this.heli(c,hx,Math.round(this.y),t);
  c.restore();
  // HUD: hearts, fuel, distance and the passengers' running commentary.
  rect(c,0,0,320,15,BRAND.ink);rect(c,0,15,320,1,BRAND.blue);
  for(let i=0;i<MAX_HEARTS;i++)text(c,'♥',6+i*9,4,i<this.hearts?'#ff7a96':'#3b3a6a');
  text(c,'FUEL',38,4,this.fuel<25&&Math.floor(t*4)%2?'#ff9aa8':BRAND.pale);rect(c,64,5,52,6,BRAND.ink);rect(c,65,6,Math.round(50*this.fuel/100),4,this.fuel<25?'#ff7a96':BRAND.light);
  const left=Math.max(0,Math.round((DISTANCE-d)/70));text(c,this.phase==='fly'?`NYC ${left} MI`:'DOWNTOWN',314,4,BRAND.white,1,'right');
  const pw=110,px=134;rect(c,px,6,pw,4,'#2c2a5c');rect(c,px,6,Math.round(pw*Math.min(1,d/DISTANCE)),4,BRAND.blue);rect(c,px+Math.round(pw*Math.min(1,d/DISTANCE))-1,5,3,6,BRAND.white);
  if(this.phase==='fly')text(c,biomeAt(d).name,px+pw/2,18,BRAND.pale,1,'center');
  if(this.line&&this.line.t<3.2){const w=textWidth(this.line.text)+12;rect(c,160-w/2,160,w,14,'#0b091fdd');rect(c,160-w/2,160,w,1,BRAND.light);text(c,this.line.text,160,164,BRAND.white,1,'center');}
 }
 midground(c,d,t){
  const g=groundAt(d),mid=-d*.5;
  if(d<1300){for(let i=0;i<8;i++){const x=Math.round(((i*70+mid)%560+560)%560-60);rect(c,x,130,40,26,['#efc88b','#cb705c','#f1d6a2','#e8b58c'][i%4]);poly(c,[[x-4,130],[x+20,116],[x+44,130]],['#347fb9','#325f68','#ca6849','#278f96'][i%4]);rect(c,x+6,140,6,6,'#274461');rect(c,x+26,140,6,6,'#274461');}}
  else if(d<2600){for(let i=0;i<10;i++){const x=Math.round(((i*64+mid)%640+640)%640-60);rect(c,x,142,60,14,i%2?'#9bbf64':'#c8b45a');for(let k=0;k<6;k++)rect(c,x+k*10,144,6,1,'#7f9d4c');}if(((d/400)|0)%3===0){const bx=Math.round(((mid*1.2)%400+400)%400);rect(c,bx,124,26,20,'#b8483f');poly(c,[[bx-3,124],[bx+13,112],[bx+29,124]],'#7a2f2a');}}
  else if(d<3900){rect(c,0,140,320,16,'#55586e');for(let x=((mid*2)%24+24)%24;x<320;x+=24)rect(c,x,147,10,1,'#e8c36b');for(let i=0;i<20;i++){const x=Math.round(((i*19+mid*.1)%380+380)%380-30);rect(c,x,141+(i%2)*7,14,6,['#c9505f','#e9e6dc','#2f3b55',BRAND.blue,'#6fa79a'][i%5]);rect(c,x+9,142+(i%2)*7,3,4,'#1b2640');if((i+Math.floor(t*2))%6===0)rect(c,x,142+(i%2)*7,2,2,'#ff5a5a');}}
  else if(d<4900){rect(c,0,146,320,34,'#2f6f9a');for(let i=0;i<40;i++){const x=Math.round(((i*37+mid)%340+340)%340-10),y=150+(i*7)%26;rect(c,x,y,6,1,'#5fa3c9');}const fx=Math.round(((mid*.7)%500+500)%500-60);rect(c,fx,142,40,6,'#e9e6dc');rect(c,fx+8,136,22,6,'#f3c7c0');rect(c,fx+4,148,32,2,'#1d4e6e');}
  else{for(let i=0;i<14;i++){const x=Math.round(((i*28+mid)%420+420)%420-40),h=26+((i*29)%30);rect(c,x,g-h,24,h,'#3a3f74');for(let wy=g-h+4;wy<g-2;wy+=5)for(let wx=x+3;wx<x+22;wx+=5)if((wx+wy+i)%3)rect(c,wx,wy,2,2,'#ffe7a8');}}
  rect(c,0,g,320,180-g,d>=3900&&d<4900?'#2f6f9a':d>=4900?'#2c2c44':'#4e9a5e');
  if(d<3900&&!(d>=2500))for(let x=((mid*2)%8+8)%8;x<320;x+=8)rect(c,x,g,3,1,'#6fbf73');
 }
 object(c,o,sx,t){
  const g=o.g;
  if(o.type==='tower'){const top=g-o.h;if(o.city){rect(c,sx,top,o.w,o.h,'#2a2f6a');rect(c,sx,top,o.w,2,'#5b63b8');for(let wy=top+5;wy<g-4;wy+=6)for(let wx=sx+3;wx<sx+o.w-3;wx+=6)if((wx+wy)%4)rect(c,wx,wy,3,3,'#ffe7a8');rect(c,sx+o.w/2-1,top-10,2,10,'#8d91b8');if(Math.floor(t*2)%2)rect(c,sx+o.w/2-1,top-11,2,2,'#ff5a5a');}
   else{rect(c,sx,top+16,o.w,o.h-16,'#c7ac89');rect(c,sx+3,top+20,o.w-6,o.h-22,'#d8bc94');poly(c,[[sx-2,top+16],[sx+o.w/2,top],[sx+o.w+2,top+16]],'#4b6987');rect(c,sx+o.w/2-3,top+24,6,8,'#504f5b');}}
  else if(o.type==='radio'){const top=g-o.h;for(let y=top;y<g;y+=6){line(c,sx,y,sx+o.w,y+6,'#c9505f');line(c,sx+o.w,y,sx,y+6,'#e9e6dc');}rect(c,sx,top,1,o.h,'#8a8a99');rect(c,sx+o.w,top,1,o.h,'#8a8a99');if(Math.floor(t*2)%2)rect(c,sx+2,top-3,3,3,'#ff5a5a');}
  else if(o.type==='water'){const top=g-o.h;rect(c,sx+4,top+24,3,o.h-24,'#8f99a3');rect(c,sx+o.w-7,top+24,3,o.h-24,'#8f99a3');rect(c,sx,top,o.w,26,'#9fb3bf');rect(c,sx,top,o.w,3,'#c9d6dd');poly(c,[[sx-2,top],[sx+o.w/2,top-8],[sx+o.w+2,top]],'#7d8f9a');}
  else if(o.type==='billboard'){const top=g-o.h;rect(c,sx+o.w/2-2,top+28,4,o.h-28,'#6b7080');rect(c,sx,top,o.w,30,BRAND.ink);rect(c,sx+2,top+2,o.w-4,26,BRAND.blue);fomo(c,sx+4,top+3,16,BRAND.pale);text(c,'CAMPUS',sx+o.w-4,top+18,BRAND.white,1,'right');}
  else if(o.type==='pylon'){const top=g-o.h;poly(c,[[sx,g],[sx+o.w/2-2,top],[sx+o.w/2+2,top],[sx+o.w,g]],'#8b93a3');rect(c,sx-6,top+14,o.w+12,2,'#8b93a3');rect(c,sx-4,top+30,o.w+8,2,'#8b93a3');}
  else if(o.type==='crane'){const top=g-o.h;for(let y=top;y<g;y+=5){line(c,sx,y,sx+o.w,y+5,'#e0b25a');}rect(c,sx,top,1,o.h,'#e0b25a');rect(c,sx+o.w,top,1,o.h,'#e0b25a');rect(c,sx-40,top,70,3,'#e0b25a');line(c,sx-30,top+3,sx-30,top+30,'#9aa0b0');rect(c,sx-33,top+30,7,5,'#6b7080');}
  else for(const h of hitboxes(o,this.t,this.d)){const x=Math.round(h.x-this.d+HELI_X),y=Math.round(h.y);
   if(o.type==='birds'||o.type==='gulls'){const flap=Math.floor(t*8+h.x)%2,col=o.type==='gulls'?'#f4f4f0':'#3d3d4a';rect(c,x+2,y+1,3,2,col);rect(c,x,y+(flap?0:2),2,1,col);rect(c,x+5,y+(flap?0:2),2,1,col);}
   else if(o.type==='blimp'){poly(c,[[x,y+8],[x+8,y+2],[x+44,y+2],[x+56,y+10],[x+44,y+18],[x+8,y+18]],BRAND.blue);rect(c,x+8,y+4,34,3,'#7d91f8');fomo(c,x+6,y+3,14,BRAND.white);text(c,'DISCORD',x+22,y+7,BRAND.white);}
   else if(o.type==='balloon'){disc(c,x+11,y+10,11,'#e57787',10);rect(c,x+5,y+2,3,16,'#f6c55f');rect(c,x+14,y+2,3,16,'#f6c55f');line(c,x+4,y+18,x+8,y+24,'#7d6b5a');line(c,x+18,y+18,x+14,y+24,'#7d6b5a');rect(c,x+7,y+23,8,5,'#a5784f');}
   else if(o.type==='drone'){rect(c,x+4,y+2,6,3,'#2a2c3a');rect(c,x,y,5,1,'#9aa0b0');rect(c,x+9,y,5,1,'#9aa0b0');if(Math.floor(t*6)%2)rect(c,x+6,y+5,2,1,'#ff5a5a');}
   else if(o.type==='news'){rect(c,x+4,y+3,18,7,'#e9e6dc');rect(c,x+16,y+4,6,4,'#87bcd0');rect(c,x+22,y+5,8,2,'#e9e6dc');rect(c,x,y,26,1,'#3e4859');text(c,'7',x+7,y+3,'#c9505f');}
   else if(o.type==='storm'){if(h.w===60){disc(c,x+30,y+10,30,'#4a4d66',10);disc(c,x+18,y+6,16,'#5a5d78',8);disc(c,x+42,y+7,14,'#5a5d78',7);const s=stormStrike(o,this.t);if(s<0&&Math.floor(t*10)%2)rect(c,x+28,y+20,4,3,'#ffffff');}else{for(let yy=y;yy<y+h.h;yy+=6){const off=((yy*7)%5)-2;rect(c,x+3+off,yy,3,6,'#fff6c9');}rect(c,0,0,320,180,'#ffffff18');}}
   else if(o.type==='fuel'){rect(c,x,y,9,11,BRAND.ink);rect(c,x+1,y+1,7,9,BRAND.blue);rect(c,x+2,y-2,3,2,BRAND.ink);fomo(c,x+1,y+2,7,BRAND.pale);if(Math.floor(t*4)%2)rect(c,x-1,y-1,1,1,BRAND.white);}
  }
 }
 heliport(c,d){
  const x=Math.round(this.phase==='fly'?DISTANCE-d+HELI_X+106:180),pad=this.padY();
  rect(c,x-20,pad,104,180-pad,'#55586e');for(let k=0;k<6;k++)rect(c,x-16+k*18,pad+6,2,180-pad,'#3e4158');
  rect(c,x,pad-3,60,4,'#e9e6dc');rect(c,x+2,pad-2,56,2,'#3e4158');
  rect(c,x+70,pad-34,2,34,'#8b93a3');rect(c,x+62,pad-48,58,16,BRAND.ink);rect(c,x+62,pad-48,58,1,BRAND.light);text(c,'DOWNTOWN',x+91,pad-44,BRAND.pale,1,'center');
  rect(c,x-14,pad-30,1,30,'#8b93a3');rect(c,x-13,pad-30,8+Math.round(Math.sin(this.t*4)*2),4,'#ff7a5c');
  for(let i=0;i<4;i++)rect(c,x+6+i*16,pad-5,2,2,Math.floor(this.t*3+i)%2?'#7af4de':'#2f6f9a');
 }
 heli(c,x,y,t){
  const tilt=clamp(this.vy/40,-2,2);c.save();c.translate(x,y);
  rect(c,-12,8,26,1,'#2a2c3a');rect(c,-9,6,2,3,'#2a2c3a');rect(c,8,6,2,3,'#2a2c3a');
  rect(c,-30,-2+Math.round(tilt/2),20,4,'#2c3566');rect(c,-33,-7+Math.round(tilt/2),4,9,BRAND.blue);
  const tr=Math.floor(t*30)%2;rect(c,-35,-4+Math.round(tilt/2)+(tr?-3:0),1,tr?7:4,'#9aa0b0');
  rect(c,-13,-7,28,15,BRAND.ink);rect(c,-12,-6,26,13,'#2c3566');rect(c,-12,-6,26,3,'#3d4a8a');rect(c,-12,3,26,3,BRAND.blue);
  rect(c,4,-5,10,7,'#9fd3e6');rect(c,5,-4,3,2,'#e3f6fb');
  // Window: Rasmr (dark hair) and Orangie (curls, glasses).
  rect(c,-8,-5,11,7,'#c8e6f0');rect(c,-7,-3,3,4,'#d2a27c');rect(c,-7,-4,3,1,'#211b1f');rect(c,-2,-3,3,4,'#f0c6a6');rect(c,-3,-5,5,2,'#a8743f');rect(c,-2,-2,3,1,'#141418');
  fomo(c,-11,-1,8,BRAND.pale);
  rect(c,-1,-10,3,3,'#3e4859');const blade=Math.floor(t*24)%3;rect(c,blade===0?-26:blade===1?-18:-8,-11,blade===0?54:blade===1?38:18,1,'#d4d8e4');
  c.restore();
 }
}
