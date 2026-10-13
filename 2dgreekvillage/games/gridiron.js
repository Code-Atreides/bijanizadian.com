import {rect,text,line,disc,BRAND,fomo} from '../pixel-art.js?v=8';

// The Final Drive: down three, twelve seconds left, four plays from your own
// 35. You carry the ball; blockers engage, defenders pursue and lead you.
export const YD=5,FIELD_W=53.3,START=35,DOWNS=4;
export const SPEED=9.9,JUKE_SPEED=13.5,TACKLE_R=.95;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function rng(seed){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
// Steering toward a point with an acceleration cap gives momentum to everyone.
export function steer(p,tx,ty,speed,dt,accel=22){const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy)||1,want=Math.min(speed,d*6);const vx=dx/d*want,vy=dy/d*want,ax=clamp(vx-p.vx,-accel*dt,accel*dt),ay=clamp(vy-p.vy,-accel*dt,accel*dt);p.vx+=ax;p.vy+=ay;p.x+=p.vx*dt;p.y+=p.vy*dt;}
export function lineup(los,rand=Math.random){
 const mid=FIELD_W/2,o=[],d=[];
 for(let i=0;i<5;i++)o.push({role:'ol',x:los-.6,y:mid+(i-2)*1.6});
 // Eleven a side: five linemen, a tight end, two receivers, the quarterback,
 // a lead-blocking fullback and you at running back.
 o.push({role:'te',x:los-.6,y:mid+4.8},{role:'wr',x:los-.6,y:mid-15},{role:'wr',x:los-.6,y:mid+15},{role:'qb',x:los-3,y:mid},{role:'fb',x:los-3.2,y:mid-1});
 for(let i=0;i<4;i++)d.push({role:'dl',x:los+1,y:mid+(i-1.5)*2,speed:6.9+rand()*.6,react:.15});
 for(let i=0;i<3;i++)d.push({role:'lb',x:los+5.5,y:mid+(i-1)*6,speed:7.9+rand()*.6,react:.35+rand()*.2});
 d.push({role:'cb',x:los+3,y:mid-15,speed:8.6+rand()*.4,react:.5},{role:'cb',x:los+3,y:mid+15,speed:8.6+rand()*.4,react:.5});
 d.push({role:'s',x:los+15,y:mid-8,speed:9+rand()*.3,react:.6},{role:'s',x:los+16,y:mid+8,speed:9+rand()*.3,react:.6});
 for(const p of [...o,...d]){p.vx=0;p.vy=0;p.stun=0;p.engaged=null;}
 return {o,d,carrier:{x:los-5,y:mid,vx:0,vy:0}};
}
export class GridironGame{
 static meta={id:'football',title:'THE FINAL DRIVE',subtitle:'4TH QUARTER · 0:12 · DOWN 3',goal:'SCORE A TOUCHDOWN IN 4 PLAYS',controls:['ARROWS / WASD / STICK: RUN','SPACE / TAP: JUKE (BURST, SLIPS TACKLES)','STAY IN BOUNDS. BLOCKERS HELP, BRIEFLY.'],actionLabel:'JUKE',stick:true};
 constructor({art,audio,reduced,attempt=0}){this.art=art;this.audio=audio;this.reduced=reduced;this.rand=rng(4242+attempt*977);this.los=START;this.down=1;this.clock=12;this.done=null;this.msg=null;this.cam={x:START,y:FIELD_W/2};this.setup();}
 start(){this.setup();}
 setup(){const l=lineup(this.los,this.rand);Object.assign(this,l);this.phase='set';this.t=0;this.juke=0;this.cool=0;this.broken=new Set();this.best=this.los;this.flash=0;this.msg={text:`${this.down}${['ST','ND','RD','TH'][this.down-1]} DOWN`,t:0};
  // Each lineman takes the nearest rusher; receivers will find a defensive back.
  for(const ol of this.o.filter(p=>p.role==='ol'||p.role==='te')){let best=null,bd=1e9;for(const dl of this.d.filter(p=>p.role==='dl'&&!p.engaged)){const dd=Math.abs(dl.y-ol.y);if(dd<bd){bd=dd;best=dl;}}if(best){best.engaged=ol;ol.engaged=best;best.hold=1.1+this.rand()*1.4;}}}
 update(dt,input){
  this.t+=dt;this.flash=Math.max(0,this.flash-dt);if(this.msg)this.msg.t+=dt;
  if(this.phase==='set'){if(this.t>1.1){this.phase='live';this.t=0;this.audio.cue('whistle');this.msg={text:'HUT!',t:0};}this.follow(dt);return;}
  if(this.phase==='dead'){if(this.t>1.6)this.nextPlay();this.follow(dt);return;}
  const c=this.carrier;
  // Carrier: direct control with momentum; juke is a short burst that slips contact.
  this.cool=Math.max(0,this.cool-dt);this.juke=Math.max(0,this.juke-dt);
  if(input.pressed&&this.cool<=0){this.juke=.32;this.cool=1.5;this.audio.cue('juke');}
  let ix=input.x,iy=input.y;const m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m;}
  const top=this.juke>0?JUKE_SPEED:SPEED,accel=this.juke>0?60:30;
  c.vx+=clamp(ix*top-c.vx,-accel*dt,accel*dt);c.vy+=clamp(iy*top-c.vy,-accel*dt,accel*dt);
  if(this.juke>0&&m<.2){c.vx+=clamp(top-c.vx,-accel*dt,accel*dt);}
  c.x+=c.vx*dt;c.y+=c.vy*dt;c.x=Math.max(-9,c.x);
  // Offense: linemen hold their man; receivers release, then block the nearest DB.
  for(const p of this.o){
   if(p.role==='ol'||p.role==='te'){const e=p.engaged;if(e&&e.engaged===p){steer(p,e.x-.9,e.y,4,dt);}else steer(p,p.x+.4,p.y,1.5,dt);}
   else if(p.role==='wr'||p.role==='fb'){const lead=p.role==='fb';if(!p.target){if(this.t>(lead?.2:.9)){let best=null,bd=1e9;for(const q of this.d)if((lead?q.role==='lb':q.role==='cb'||q.role==='s')&&!q.engaged){const dd=Math.hypot(q.x-p.x,q.y-p.y);if(dd<bd){bd=dd;best=q;}}p.target=best;}steer(p,lead?this.carrier.x+2.5:p.x+6,lead?this.carrier.y:p.y,8,dt);}
    else{steer(p,p.target.x-.9,p.target.y,8.3,dt);if(!p.target.engaged&&Math.hypot(p.target.x-p.x,p.target.y-p.y)<1.3){p.target.engaged=p;p.engaged=p.target;p.target.hold=.8+this.rand()*.8;this.audio.cue('block');}}}
   else steer(p,this.los-4,FIELD_W/2,2,dt);
  }
  // Defense: shed blocks when the hold runs out, then pursue the carrier with lead.
  for(const q of this.d){
   if(q.stun>0){q.stun-=dt;q.vx*=.9;q.vy*=.9;q.x+=q.vx*dt;q.y+=q.vy*dt;continue;}
   if(q.engaged){q.hold-=dt;q.vx*=.8;q.vy*=.8;q.x+=q.vx*dt*.3;q.y+=q.vy*dt*.3;if(q.hold<=0){q.engaged.engaged=null;q.engaged=null;q.stun=.25;}continue;}
   if(this.t<q.react){continue;}
   const d=Math.hypot(c.x-q.x,c.y-q.y),lead=clamp(d/q.speed,0,.9)*(q.role==='dl'?.4:1);
   steer(q,c.x+c.vx*lead,c.y+c.vy*lead,q.speed,dt,24);
  }
  this.separate(dt);
  // Contact: a juke slips it; a fast, fresh carrier can sometimes break it.
  for(const q of this.d){if(q.stun>0||q.engaged)continue;const d=Math.hypot(c.x-q.x,c.y-q.y);if(d<TACKLE_R){
   if(this.juke>0){q.stun=.8;q.vx=-q.vx*.3;q.vy=-q.vy*.3;this.popup('SHAKE!');continue;}
   const sp=Math.hypot(c.vx,c.vy);if(!this.broken.has(q)&&sp>7.5&&this.rand()<.22){this.broken.add(q);q.stun=1;this.popup('BROKEN TACKLE!');this.audio.cue('tackle');c.vx*=.75;c.vy*=.75;continue;}
   this.endPlay('tackle');return;}}
  if(c.y<0||c.y>FIELD_W){this.endPlay('out');return;}
  if(c.x>=100){this.touchdown();return;}
  this.best=Math.max(this.best,c.x);this.follow(dt);
 }
 separate(){const all=[...this.o,...this.d];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>0&&d<.8){const k=(.8-d)/2/d;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k;}}}
 follow(dt){const c=this.carrier;this.cam.x+=(c.x+6-this.cam.x)*Math.min(1,dt*5);this.cam.y+=(c.y-this.cam.y)*Math.min(1,dt*4);}
 popup(text){this.msg={text,t:0};}
 endPlay(kind){
  const c=this.carrier,spot=kind==='out'?c.x:c.x;this.phase='dead';this.t=0;this.audio.cue(kind==='tackle'?'tackle':'whistle');this.flash=kind==='tackle'?.25:0;
  this.los=Math.max(1,Math.min(99,Math.round(spot)));this.clock=Math.max(0,this.clock-(kind==='out'?1:4));
  const ydl=this.los>50?`THEIR ${100-this.los}`:this.los===50?'MIDFIELD':`OUR ${this.los}`;
  this.msg={text:(kind==='out'?'OUT OF BOUNDS':'TACKLED')+' · '+ydl,t:0};
  if(this.down>=DOWNS){this.final=true;}
 }
 nextPlay(){
  if(this.final){const gained=this.los-START;this.done={won:false,score:Math.max(0,gained)*10,stars:0,title:'TURNOVER ON DOWNS',line:`GAINED ${Math.max(0,gained)} YARDS · NEEDED ${100-START}`};return;}
  this.down++;this.setup();
 }
 touchdown(){
  this.phase='over';this.audio.cue('td');const stars=this.down===1?3:this.down===2?2:1;
  this.done={won:true,score:1000-(this.down-1)*200+Math.round(this.clock)*10,stars,title:'TOUCHDOWN!',line:`fomo 27 · AWAY 24 · ON ${['1ST','2ND','3RD','4TH'][this.down-1]} DOWN`};
 }
 sx(x){return Math.round(160+(x-this.cam.x)*YD);}
 sy(y){const camY=clamp(this.cam.y,(90-14)/YD,FIELD_W-(90-14)/YD+2);return Math.round(96+(y-camY)*YD);}
 draw(c,t){
  rect(c,0,0,320,180,'#2c6e45');
  // Stands above and below the field, then grass stripes every five yards.
  const top=this.sy(0),bot=this.sy(FIELD_W);
  rect(c,0,0,320,Math.max(0,top),'#3a3f5a');for(let y=top-6;y>-6;y-=5)for(let x=(y%2+2)%2;x<320;x+=3){const k=(x*7+y*13)%5;rect(c,x,y+((Math.floor(t*4+x)%7===0)?-1:0),2,2,[BRAND.blue,'#e4ccb0',BRAND.pale,'#c9505f','#7d8aa6'][k]);}
  rect(c,0,bot,320,Math.max(0,180-bot),'#3a3f5a');for(let y=bot+4;y<186;y+=5)for(let x=(y%2+2)%2;x<320;x+=3){const k=(x*11+y*7)%5;rect(c,x,y+((Math.floor(t*4+x+3)%7===0)?-1:0),2,2,[BRAND.blue,'#e4ccb0',BRAND.pale,'#c9505f','#7d8aa6'][k]);}
  for(let yd=-10;yd<110;yd+=5){const x0=this.sx(yd),x1=this.sx(yd+5);if(x1<0||x0>320)continue;const col=yd<0?'#c9505f':yd>=100?BRAND.blue:(Math.floor(yd/5)%2?'#3f9658':'#378c50');rect(c,x0,top,x1-x0,bot-top,col);}
  rect(c,0,top-2,320,2,'#f1f1ea');rect(c,0,bot,320,2,'#f1f1ea');
  for(let yd=0;yd<=100;yd+=5){const x=this.sx(yd);if(x<-2||x>322)continue;rect(c,x,top,1,bot-top,'#e9efe0');}
  for(let yd=1;yd<100;yd++){const x=this.sx(yd);if(x<0||x>320)continue;for(const yy of [1,FIELD_W/2-3,FIELD_W/2+3,FIELD_W-1])rect(c,x,this.sy(yy),1,2,'#e9efe0');}
  // Yard numbers straddle their line, one digit on each side, as on a real field.
  for(let yd=10;yd<100;yd+=10){const x=this.sx(yd),n=String(yd<=50?yd:100-yd);for(const yy of [this.sy(6),this.sy(FIELD_W-7)]){text(c,n[0],x-7,yy,'#e9efe0');text(c,n[1],x+3,yy,'#e9efe0');}}
  const ez=this.sx(100)+((this.sx(110)-this.sx(100))>>1);if(ez>-30&&ez<350){const word='fomo';for(let i=0;i<4;i++)text(c,word[i],ez-5,this.sy(FIELD_W/2)-26+i*14,BRAND.pale,2);}
  const az=this.sx(-5);if(az>-30&&az<350)text(c,'AWAY',az,this.sy(FIELD_W/2)-3,'#f6e2df',1,'center');
  const gx=this.sx(110);if(gx<330){rect(c,gx-1,this.sy(FIELD_W/2-3),2,this.sy(FIELD_W/2+3)-this.sy(FIELD_W/2-3),'#f2d36a');}
  // Line of scrimmage and the goal line marker.
  rect(c,this.sx(this.los),top,1,bot-top,'#7da6ff');
  // Players: shadows, bodies, helmets; the carrier wears the frat kid's cap.
  const all=[...this.o.map(p=>({p,team:0})),...this.d.map(p=>({p,team:1}))].sort((a,b)=>a.p.y-b.p.y);
  for(const {p,team} of all)this.player(c,p,team,t);
  const k=this.carrier,kx=this.sx(k.x),ky=this.sy(k.y);
  if(this.juke>0){for(let i=1;i<4;i++)rect(c,kx-Math.round(k.vx*i*.25)-2,ky-Math.round(k.vy*i*.25)-4,5,7,i%2?BRAND.light+'99':BRAND.pale+'66');}
  this.player(c,k,0,t,true);
  if(this.phase!=='dead'){rect(c,kx-1,ky-16+Math.round(Math.sin(t*6)),3,2,BRAND.white);rect(c,kx,ky-14+Math.round(Math.sin(t*6)),1,2,BRAND.white);}
  if(this.flash>0)rect(c,0,0,320,180,'#ffffff33');
  // Scoreboard HUD.
  rect(c,0,0,320,15,BRAND.ink);rect(c,0,15,320,1,BRAND.blue);
  text(c,'fomo 21',6,4,BRAND.pale);text(c,'AWAY 24',56,4,'#f3c7c0');text(c,`4TH 0:${String(Math.ceil(this.clock)).padStart(2,'0')}`,108,4,BRAND.white);
  text(c,`DOWN ${this.down}/${DOWNS}`,168,4,BRAND.light);const ball=this.los>50?`THEIR ${100-this.los}`:`OWN ${this.los}`;text(c,ball,314,4,BRAND.pale,1,'right');
  const cw=34;rect(c,4,164,cw+38,12,BRAND.ink);rect(c,7,167,cw,6,'#2c2a5c');rect(c,7,167,Math.round(cw*(1-this.cool/1.5)),6,this.cool<=0?BRAND.light:'#4a4a8f');text(c,'JUKE',46,166,this.cool<=0?BRAND.pale:'#6c6aa0');
  if(this.msg&&this.msg.t<1.4){const big=this.msg.text.length<14,w=Math.min(316,(this.msg.text.length*6-1)*(big?2:1)+16),h=big?20:13;rect(c,160-w/2,20,w,h,BRAND.ink);rect(c,160-w/2,20+h-1,w,1,BRAND.blue);text(c,this.msg.text,160,23,BRAND.white,big?2:1,'center');}
 }
 player(c,p,team,t,carrier=false){
  const x=this.sx(p.x),y=this.sy(p.y);if(x<-10||x>330||y<-10||y>190)return;
  const run=Math.hypot(p.vx,p.vy)>1,step=run?Math.floor(t*10+p.y)%2:0,col=team?'#e8e2d6':BRAND.blue,trim=team?'#c9505f':BRAND.pale;
  rect(c,x-3,y+3,7,2,'#00000044');
  rect(c,x-2,y-1+step,2,4,'#2a2c3a');rect(c,x+1,y-1-step+1,2,4,'#2a2c3a');
  rect(c,x-3,y-6,7,6,col);rect(c,x-3,y-6,7,1,trim);rect(c,x-4,y-5,1,3,col);rect(c,x+4,y-5,1,3,col);
  rect(c,x-2,y-10,5,4,team?'#c9505f':carrier?'#16161c':'#3d4fb8');rect(c,x-2,y-10,5,1,team?'#e8848f':carrier?'#3a3a48':BRAND.light);
  if(carrier){rect(c,x+2,y-5,3,2,'#7a3b22');rect(c,x+3,y-5,1,2,'#f3e4d0');}
  if(p.stun>0&&!carrier)text(c,'*',x+3,y-15,'#ffffffaa');
 }
}
