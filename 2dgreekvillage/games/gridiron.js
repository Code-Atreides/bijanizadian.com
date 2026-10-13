import {rect,text,ring,BRAND} from '../pixel-art.js?v=9';

// The Final Drive, played the Retro Bowl way: a sideline camera, you are the
// quarterback. Snap, read the routes, drag back and release to throw (the
// pull sets distance and loft), or hand off to the back. After the catch you
// steer the runner and juke tacklers. Real downs, a running game clock.
export const PX=7,PY=2.2,FIELD_TOP=40,FIELD_W=53.3,START=25,CLOCK=90,DOWNS=4,SCORE={home:21,away:24};
const MID=FIELD_W/2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function rng(seed){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
// Routes are waypoints relative to the receiver's alignment; s points inside.
export const ROUTES={
 go:s=>[[16,0],[45,s]],seam:s=>[[22,0],[45,0]],slant:s=>[[4,0],[18,10*s]],out:s=>[[9,0],[10,-14*s]],
 curl:s=>[[11,0],[9,s*1.5]],post:s=>[[10,0],[32,9*s]],corner:s=>[[10,0],[26,-11*s]],drag:s=>[[3,0],[7,24*s]],
 flat:s=>[[2,-5*s],[7,-15*s]],wheel:s=>[[2,-6*s],[24,-9*s]],
};
// Each play: routes for the outside receivers, the slot, the tight end and the back.
export const PLAYS=[
 {name:'SLANTS',wr1:'slant',wr2:'slant',slot:'seam',te:'out',rb:'flat'},
 {name:'FOUR VERTICALS',wr1:'go',wr2:'go',slot:'seam',te:'seam',rb:'flat'},
 {name:'FLOOD',wr1:'go',wr2:'out',slot:'corner',te:'drag',rb:'flat'},
 {name:'MESH',wr1:'post',wr2:'curl',slot:'drag',te:'drag',rb:'wheel'},
 {name:'SMASH',wr1:'curl',wr2:'corner',slot:'out',te:'post',rb:'flat'},
];
export const SPEED={wr:8.7,slot:8.5,te:7.6,rb:8.3,qb:6.8,ol:4,dl:6.2,lb:7.2,cb:8.3,nb:8.1,s:8.4};
// With the ball in hand runners lose a step, and pursuit closes at full speed.
export const RUN_SPEED={wr:7.5,slot:7.4,te:6.9,rb:7.7};
export const PURSUIT={dl:6.6,lb:7.6,cb:8.1,nb:8,s:8.3};
// Eleven on eleven: five linemen, QB, back, two receivers, slot and tight end
// against four rushers, two corners, a nickel, two linebackers and two safeties.
export function formation(los,play){
 const o=[],d=[];
 for(const dy of [-3,-1.5,0,1.5,3])o.push({role:'ol',x:los-.5,y:MID+dy,num:[72,65,55,66,78][o.length]});
 o.push({role:'qb',x:los-5,y:MID,num:1});
 o.push({role:'rb',x:los-5,y:MID+2.2,num:22,route:play.rb,s:-1});
 o.push({role:'wr',x:los-.8,y:MID-19,num:11,route:play.wr1,s:1},{role:'wr',x:los-.8,y:MID+19,num:84,route:play.wr2,s:-1});
 o.push({role:'slot',x:los-1.2,y:MID-10,num:7,route:play.slot,s:1},{role:'te',x:los-.8,y:MID+4.6,num:88,route:play.te,s:-1});
 for(const dy of [-4.5,-1.5,1.5,4.5])d.push({role:'dl',x:los+1,y:MID+dy});
 const [wr1,wr2,slot,te]=o.slice(7);
 d.push({role:'cb',x:los+6,y:wr1.y,mark:wr1},{role:'cb',x:los+6,y:wr2.y,mark:wr2},{role:'nb',x:los+5,y:slot.y,mark:slot});
 d.push({role:'lb',x:los+5,y:te.y,mark:te},{role:'lb',x:los+5,y:MID-3,zone:true});
 d.push({role:'s',x:los+15,y:MID-11},{role:'s',x:los+15,y:MID+11});
 for(const p of [...o,...d]){p.vx=0;p.vy=0;p.stun=0;p.hist=[];p.wp=0;p.ox=p.x;p.oy=p.y;}
 d.forEach((p,i)=>p.num=[90,97,93,99,24,21,31,54,50,32,29][i]);
 return {o,d};
}
// Ball flight: farther throws hang longer and arc higher.
export const flightTime=d=>.42+d/23;
export const arcHeight=d=>1.2+d*.16;
function seek(p,tx,ty,speed,dt,accel=26){const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy)||1,want=Math.min(speed,d*7),vx=dx/d*want,vy=dy/d*want;p.vx+=clamp(vx-p.vx,-accel*dt,accel*dt);p.vy+=clamp(vy-p.vy,-accel*dt,accel*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;}

export class GridironGame{
 static meta={id:'football',title:'THE FINAL DRIVE',subtitle:'DOWN 3 · 1:30 LEFT · OWN 25',goal:'SCORE A TOUCHDOWN BEFORE TIME RUNS OUT',
  controls:['TAP / SPACE: SNAP. DRAG BACK + RELEASE: THROW','OR HOLD SPACE, AIM WITH ARROWS, RELEASE','R OR TAP THE RB: RUN IT. STEER: ARROWS / DRAG','SPACE / SWIPE AFTER THE CATCH: JUKE'],actionLabel:'THROW',stick:false};
 constructor({art,audio,reduced,attempt=0}){this.art=art;this.audio=audio;this.reduced=reduced;this.rand=rng(7331+attempt*613);this.los=START;this.down=1;this.togo=START+10;this.clock=CLOCK;this.done=null;this.msg=null;this.camX=START+12;this.t=0;this.plays=0;this.setup();}
 start(){}
 setup(){
  this.play=PLAYS[Math.floor(this.rand()*PLAYS.length)];const f=formation(this.los,this.play);Object.assign(this,f);
  this.qb=this.o.find(p=>p.role==='qb');this.rb=this.o.find(p=>p.role==='rb');this.carrier=null;this.ball=null;this.aim=null;this.phase='pre';this.t=0;this.juke=0;this.cool=0;this.broken=new Set();this.flash=0;
  const ol=this.o.filter(p=>p.role==='ol');this.d.filter(p=>p.role==='dl').forEach((dl,i)=>{dl.blocker=ol[[0,1,3,4][i]];dl.hold=2.7+this.rand()*1.1;});
  const dn=['1ST','2ND','3RD','4TH'][this.down-1],dist=this.togo>=100?'GOAL':String(Math.max(1,Math.round(this.togo-this.los)));
  this.msg={text:`${dn} & ${dist} · ${this.play.name}`,t:0,hold:true};
 }
 get receivers(){return this.o.filter(p=>['wr','slot','te','rb'].includes(p.role));}
 sx(x){return Math.round(160+(x-this.camX)*PX);}
 sy(y){return Math.round(FIELD_TOP+y*PY);}
 fieldPoint(px,py){return {x:this.camX+(px-160)/PX,y:(py-FIELD_TOP)/PY};}
 update(dt,input){
  this.t+=dt;this.flash=Math.max(0,this.flash-dt);if(this.msg)this.msg.t+=dt;this.cool=Math.max(0,this.cool-dt);this.juke=Math.max(0,this.juke-dt);
  if(this.phase==='pre'){this.cam(dt,this.los+12);if(input.pressed){this.phase='live';this.t=0;this.msg={text:'HUT!',t:0};this.audio.cue('whistle');}return;}
  if(this.phase==='dead'){this.cam(dt,this.camTarget??this.los+12);if(this.t>1.7)this.next();return;}
  if(this.phase==='over')return;
  this.clock=Math.max(0,this.clock-dt);
  if(this.phase==='live')this.qbPhase(dt,input);
  else if(this.phase==='air')this.airPhase(dt);
  else if(this.phase==='run')this.runPhase(dt,input);
  if(this.phase==='live'||this.phase==='air'||this.phase==='run')this.defense(dt);
  this.separate();
  for(const p of [...this.o,...this.d]){p.hist.push([p.x,p.y]);if(p.hist.length>24)p.hist.shift();if(p.stun>0)p.stun-=dt;}
  if(this.phase==='live'){for(const q of this.d)if(q.free&&q.stun<=0&&Math.hypot(q.x-this.qb.x,q.y-this.qb.y)<.95){this.endPlay('sack',this.qb.x);return;}}
  if(this.phase==='run')this.tackles();
 }
 cam(dt,target){this.camX+=(clamp(target,-10+22.8,110-22.8)-this.camX)*Math.min(1,dt*4);}
 qbPhase(dt,input){
  const qb=this.qb,ptr=input.pointer||{};
  // Receivers run their routes; linemen hold; the quarterback drops back.
  for(const p of this.receivers)this.runRoute(p,dt);
  for(const p of this.o.filter(p=>p.role==='ol'))seek(p,p.ox-.6,p.oy,2,dt);
  const tapRB=input.pressedBy==='pointer'&&Math.hypot(ptr.sx-this.sx(this.rb.x),ptr.sy-(this.sy(this.rb.y)-8))<11;
  if((input.alt||tapRB)&&this.t<2.4&&!this.aim){this.handoff();return;}
  // Aim: drag back from anywhere (slingshot), or hold the throw key and steer.
  if(input.pressedBy==='pointer')this.aim={mode:'drag'};
  if(input.pressedBy==='key'&&!this.aim){const r=this.bestTarget();this.aim={mode:'key',tx:r.x,ty:r.y};}
  if(this.aim?.mode==='drag'){const dx=ptr.sx-ptr.x,dy=ptr.sy-ptr.y,len=Math.hypot(dx,dy);
   this.aim.tx=qb.x+dx*2.4/PX;this.aim.ty=clamp(qb.y+dy*2.4/PY*.45,-2,FIELD_W+2);this.aim.ok=len>5&&this.aim.tx>qb.x-1;
   if(!ptr.down){if(this.aim.ok)this.throwTo(this.aim.tx,this.aim.ty);else this.aim=null;return;}}
  else if(this.aim?.mode==='key'){this.aim.tx+=input.x*16*dt;this.aim.ty=clamp(this.aim.ty+input.y*16*dt,-2,FIELD_W+2);this.aim.ok=true;if(!input.keyHeld){this.throwTo(this.aim.tx,this.aim.ty);return;}}
  if(this.t<.7)seek(qb,this.los-7.5,qb.oy,4.5,dt);
  else if(this.aim?.mode!=='key'){const ix=input.x,iy=input.y;if(Math.abs(ix)+Math.abs(iy)>.1){qb.vx=ix*SPEED.qb;qb.vy=iy*SPEED.qb;qb.x+=qb.vx*dt;qb.y+=qb.vy*dt;}else{qb.vx*=.8;qb.vy*=.8;}}
  if(qb.x>this.los+.5){this.aim=null;this.carrier=qb;this.phase='run';this.msg={text:'QB SCRAMBLE!',t:0};return;}
  if(qb.y<0||qb.y>FIELD_W){this.endPlay('out',qb.x);return;}
  this.cam(dt,this.los+12);
 }
 runRoute(p,dt){const pts=ROUTES[p.route]?.(p.s)||[[30,0]],wp=pts[Math.min(p.wp,pts.length-1)],tx=p.ox+wp[0],ty=p.oy+wp[1];seek(p,tx,clamp(ty,1,FIELD_W-1),SPEED[p.role]||8,dt,30);if(Math.hypot(tx-p.x,ty-p.y)<.8&&p.wp<pts.length-1)p.wp++;}
 // The most open receiver's lead point: where he will be when the ball arrives.
 // Where a receiver will be after t seconds, following his actual route.
 predict(r,t){const g={...r,hist:[]};for(let k=0;k<t*30;k++)this.runRoute(g,1/30);return g;}
 bestTarget(){let best=null,score=-1e9;for(const r of this.receivers){let p=r;for(let k=0;k<3;k++)p=this.predict(r,flightTime(Math.hypot(p.x-this.qb.x,p.y-this.qb.y)));
   const sep=Math.min(...this.d.map(q=>Math.hypot(q.x-p.x,q.y-p.y))),s=Math.min(sep,6)*2+(p.x-this.los)*.12;if(s>score){score=s;best={x:p.x,y:clamp(p.y,1,FIELD_W-1)};}}return best;}
 handoff(){this.carrier=this.rb;this.phase='run';this.audio.cue('juke');this.msg={text:'HANDOFF',t:0};}
 throwTo(tx,ty){const qb=this.qb,d=Math.hypot(tx-qb.x,ty-qb.y);this.ball={x0:qb.x,y0:qb.y,tx,ty,d,T:flightTime(d),h:arcHeight(d),u:0};this.aim=null;this.phase='air';this.throwAt=this.t;this.audio.cue('shoot');
  // Players near the landing spot go for the ball.
  for(const p of [...this.receivers,...this.d]){const t=this.ball.T,px=p.x+p.vx*t*.6,py=p.y+p.vy*t*.6;p.track=Math.hypot(px-tx,py-ty)<(this.d.includes(p)?6:8);}}
 airPhase(dt){
  const b=this.ball;b.u=Math.min(1,b.u+dt/b.T);
  for(const p of this.receivers){if(p.track)seek(p,b.tx,b.ty,(SPEED[p.role]||8)*1.05,dt,40);else this.runRoute(p,dt);}
  for(const p of this.o.filter(p=>p.role==='ol'||p.role==='qb')){p.vx*=.8;p.vy*=.8;}
  this.cam(dt,b.x0+(b.tx-b.x0)*b.u+5);
  if(b.u>=1)this.resolveCatch();
 }
 resolveCatch(){
  const b=this.ball,inb=b.ty>0&&b.ty<FIELD_W&&b.tx<110;
  const near=(list,r)=>list.map(p=>({p,d:Math.hypot(p.x-b.tx,p.y-b.ty)})).filter(e=>e.d<r).sort((a,c)=>a.d-c.d)[0];
  const off=near(this.receivers,1.7),def=near(this.d,1.15);
  if(inb&&off&&(!def||off.d<=def.d+.4)){
   const contested=def&&def.d<1;if(this.rand()<(contested?.7:.96)){this.carrier=off.p;off.p.x=b.tx;off.p.y=b.ty;this.ball=null;this.phase='run';this.audio.cue('block');this.msg={text:contested?'TOUGH CATCH!':'CAUGHT!',t:0};return;}
   this.endPlay('incomplete',this.los,'DROPPED');return;}
  if(inb&&def&&this.rand()<.42){this.endPlay('int',b.tx);return;}
  this.endPlay('incomplete',this.los,def?'BROKEN UP':'INCOMPLETE');
 }
 runPhase(dt,input){
  const c=this.carrier,base=c===this.qb?SPEED.qb:RUN_SPEED[c.role]||7.6,ptr=input.pointer||{};
  // Swipe or press to juke: a quick sidestep that slips contact.
  let swipe=0;if(ptr.down&&c.lastPy!==undefined){const v=(ptr.y-c.lastPy)/Math.max(dt,1e-3);if(Math.abs(v)>220)swipe=Math.sign(v);}c.lastPy=ptr.down?ptr.y:undefined;
  if((input.pressedBy==='key'||swipe)&&this.cool<=0){const near=this.d.reduce((a,q)=>Math.hypot(q.x-c.x,q.y-c.y)<Math.hypot(a.x-c.x,a.y-c.y)?q:a,this.d[0]);this.jukeDir=swipe||(input.y?Math.sign(input.y):near.y>c.y?-1:1);this.juke=.32;this.cool=1.4;this.audio.cue('juke');}
  let vy=input.y*7;if(ptr.down&&!swipe){vy=clamp((this.fieldPoint(ptr.x,ptr.y).y-c.y)*3,-7,7);}
  if(this.juke>0)vy=this.jukeDir*10;
  const vx=this.juke>0?base*.8:base;c.vx=vx;c.vy=vy;c.x+=vx*dt;c.y+=vy*dt;
  // Linemen and the tight end block the nearest defender in front of the runner.
  for(const p of this.o){if(p===c)continue;if(!['ol','te','rb'].includes(p.role)){seek(p,c.x+2,p.y+(c.y-p.y)*.3,5,dt);continue;}let tgt=null,td=5;for(const q of this.d){if(q.blockedBy&&q.blockedBy!==p)continue;const d=Math.hypot(q.x-p.x,q.y-p.y);if(q.x>c.x-2&&d<td){td=d;tgt=q;}}
   if(tgt){seek(p,tgt.x-.6,tgt.y,(SPEED[p.role]||6)*.95,dt);if(td<1&&!tgt.blockedBy&&!tgt.shed){tgt.blockedBy=p;tgt.blockTime=.6+this.rand()*.6;}}else seek(p,c.x+3,p.y,4,dt);}
  this.cam(dt,c.x+7);
  if(c.x>=100){this.touchdown();return;}
  if(c.y<0||c.y>FIELD_W)this.endPlay('out',c.x);
 }
 defense(dt){
  const c=this.carrier,qb=this.qb;
  for(const q of this.d){
   if(q.stun>0){q.vx*=.9;q.vy*=.9;continue;}
   if(q.blockedBy){q.blockTime-=dt;q.vx*=.7;q.vy*=.7;if(q.blockTime<=0){q.blockedBy=null;q.shed=true;}continue;}
   const sp=SPEED[q.role]||7.5;
   if(this.phase==='run'){const ps=PURSUIT[q.role]||sp,d=Math.hypot(c.x-q.x,c.y-q.y),lead=clamp(d/ps,0,.8);seek(q,c.x+c.vx*lead,c.y+c.vy*lead,ps,dt,30);continue;}
   if(this.phase==='air'&&q.track){const b=this.ball;seek(q,b.tx,b.ty,sp*.95,dt,36);continue;}
   if(q.role==='dl'){q.hold-=dt;if(q.hold>0)seek(q,q.blocker.x+.7,q.blocker.y,1.5,dt);else{q.free=true;seek(q,qb.x,qb.y,sp,dt);}continue;}
   // Man coverage trails the receiver's position from a beat earlier, with a cushion.
   if(q.mark){const m=q.mark,h=m.hist[Math.max(0,m.hist.length-7)]||[m.x,m.y];seek(q,h[0]+1.2,h[1],sp,dt);continue;}
   if(q.zone){if(qb.x>this.los-2.5){seek(q,qb.x,qb.y,sp,dt);continue;}const r=this.receivers.find(r=>Math.abs(r.x-(this.los+6))<6&&Math.abs(r.y-q.y)<9);seek(q,r?r.x+1:this.los+5,r?r.y:MID,sp*.85,dt);continue;}
   if(q.role==='s'){const deep=this.receivers.filter(r=>Math.sign(r.y-MID)===Math.sign(q.oy-MID)||Math.abs(r.y-MID)<4).sort((a,b)=>b.x-a.x)[0];seek(q,Math.max(this.los+12,deep?deep.x+4:q.ox),deep?(deep.y+q.oy)/2:q.oy,sp*.9,dt);}
  }
 }
 tackles(){const c=this.carrier;for(const q of this.d){if(q.stun>0||q.blockedBy)continue;if(Math.hypot(q.x-c.x,q.y-c.y)<1){
   if(this.juke>0){q.stun=.45;this.msg={text:'JUKED!',t:0};continue;}
   if(!this.broken.has(q)&&this.rand()<.13){this.broken.add(q);q.stun=1;this.msg={text:'BROKEN TACKLE!',t:0};this.audio.cue('tackle');continue;}
   this.endPlay('tackle',c.x);return;}}}
 separate(){const all=[...this.o,...this.d];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j];if(a===this.carrier||b===this.carrier)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>0&&d<.7){const k=(.7-d)/2/d;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k;}}}
 endPlay(kind,spot,label){
  this.phase='dead';this.t=0;this.aim=null;this.camTarget=this.carrier?this.carrier.x+4:this.los+12;
  if(this.carrier&&kind==='tackle')this.carrier.downed=true;if(kind==='sack')this.qb.downed=true;
  this.audio.cue(kind==='tackle'||kind==='sack'?'tackle':'whistle');this.flash=kind==='tackle'||kind==='sack'?.2:0;
  if(kind==='int'){this.final={won:false,title:'INTERCEPTED',line:'THE DEFENSE JUMPED THE ROUTE'};this.msg={text:'INTERCEPTED!',t:0};return;}
  const prev=this.los;if(kind!=='incomplete')this.los=clamp(Math.round(spot),1,99);
  // Hurry-up runoff: the clock keeps running after an in-bounds stop.
  if(kind==='tackle'||kind==='sack')this.clock=Math.max(0,this.clock-6);
  const gain=this.los-prev,ydl=this.los>50?`THEIR ${100-this.los}`:this.los===50?'MIDFIELD':`OWN ${this.los}`;
  let head=label||(kind==='sack'?'SACKED':kind==='out'?'OUT OF BOUNDS':`${gain>=0?'+':''}${gain} YDS`);
  if(kind!=='incomplete'&&this.los>=this.togo){this.down=1;this.togo=Math.min(100,this.los+10);head+=' · 1ST DOWN';}
  else this.down++;
  this.msg={text:head,sub:ydl,t:0};
  if(this.down>DOWNS)this.final={won:false,title:'TURNOVER ON DOWNS',line:`STOPPED AT THE ${ydl}`};
  else if(this.clock<=0)this.final={won:false,title:'TIME EXPIRED',line:`fomo 21 · AWAY 24 · ${ydl}`};
 }
 next(){if(this.final){this.phase='over';this.done={...this.final,score:Math.max(0,this.los-START)*10,stars:0};return;}this.plays++;this.setup();}
 touchdown(){
  this.phase='over';this.audio.cue('td');const left=Math.round(this.clock),stars=left>=30?3:left>=10?2:1;
  this.done={won:true,score:1000+left*10+Math.max(0,8-this.plays)*50,stars,title:'TOUCHDOWN!',line:`fomo 27 · AWAY 24 · ${left}S LEFT`};
 }
 // ----- drawing -----
 draw(c,t){
  const top=this.sy(0),bot=this.sy(FIELD_W),cheer=this.msg&&/TOUCH|1ST DOWN|CAUGHT|TOUGH/.test(this.msg.text)&&this.msg.t<1.2;
  rect(c,0,0,320,180,'#23263f');
  // Stands above and below the field; the crowd bounces on big plays.
  for(const [y0,y1] of [[17,top-4],[bot+4,180]])for(let y=y0;y<y1;y+=4){rect(c,0,y+3,320,1,'#191b2e');for(let x=((y>>2)%2)*2;x<320;x+=4){const k=(x*7+y*13)%6,hop=cheer&&(x+y+Math.floor(t*10))%3===0?-1:0;rect(c,x,y+hop,2,2,[BRAND.blue,'#e4ccb0',BRAND.pale,'#c9505f','#7d8aa6','#f0c46a'][k]);}}
  rect(c,0,top-3,320,3,'#d8dce6');rect(c,0,bot,320,3,'#d8dce6');
  for(let yd=-10;yd<110;yd+=5){const x0=this.sx(yd),x1=this.sx(yd+5);if(x1<0||x0>320)continue;rect(c,x0,top,x1-x0,bot-top,yd<0?'#b8464f':yd>=100?BRAND.blue:Math.floor(yd/5)%2?'#3f9a5b':'#388f52');}
  for(let yd=0;yd<=100;yd+=5){const x=this.sx(yd);if(x>-2&&x<322)rect(c,x,top,1,bot-top,'#eef3e6');}
  for(let yd=1;yd<100;yd++){const x=this.sx(yd);if(x<0||x>320)continue;for(const yy of [1,MID-3,MID+3,FIELD_W-1.5])rect(c,x,this.sy(yy),1,2,'#eef3e6');}
  // Yard numbers straddle their line, one digit on each side.
  for(let yd=10;yd<100;yd+=10){const x=this.sx(yd),n=String(yd<=50?yd:100-yd);for(const yy of [this.sy(5),this.sy(FIELD_W-8)]){text(c,n[0],x-7,yy,'#eef3e6');text(c,n[1],x+3,yy,'#eef3e6');}}
  const ez=this.sx(105);if(ez>-40&&ez<360)text(c,'fomo',ez,this.sy(MID)-7,BRAND.pale,2,'center');
  const az=this.sx(-5);if(az>-40&&az<360)text(c,'AWAY',az,this.sy(MID)-3,'#f6e2df',1,'center');
  for(const gx of [this.sx(110),this.sx(-10)])if(gx>-10&&gx<330){rect(c,gx-1,this.sy(MID)-30,2,30,'#f2d36a');rect(c,gx-6,this.sy(MID)-30,12,2,'#f2d36a');rect(c,gx-6,this.sy(MID)-42,2,12,'#f2d36a');rect(c,gx+4,this.sy(MID)-42,2,12,'#f2d36a');}
  // Line of scrimmage (blue) and the line to gain (yellow).
  if(this.phase!=='over'){rect(c,this.sx(this.los),top,1,bot-top,'#7da6ff');if(this.togo<100)rect(c,this.sx(this.togo),top,1,bot-top,'#f2d36a');}
  if(this.phase==='pre'||(this.phase==='live'&&this.t<1.2))for(const r of this.receivers)this.routeLine(c,r);
  const all=[...this.o.map(p=>[p,0]),...this.d.map(p=>[p,1])].sort((a,b)=>a[0].y-b[0].y);
  for(const [p,team] of all)this.drawPlayer(c,p,team,t);
  if(this.aim&&this.aim.ok)this.aimArc(c,t);
  if(this.ball)this.drawBall(c);
  if(this.flash>0)rect(c,0,0,320,180,'#ffffff30');
  this.hud(c,t);
 }
 routeLine(c,r){const pts=ROUTES[r.route]?.(r.s)||[];let x=r.ox,y=r.oy;for(const [dx,dy] of pts){const nx=r.ox+dx,ny=clamp(r.oy+dy,1,FIELD_W-1),steps=Math.max(4,Math.round(Math.hypot((nx-x)*PX,(ny-y)*PY)/4));for(let i=0;i<steps;i+=2){const u=i/steps;rect(c,this.sx(x+(nx-x)*u),this.sy(y+(ny-y)*u),1,1,'#eaedffaa');}x=nx;y=ny;}rect(c,this.sx(x)-1,this.sy(y)-1,3,3,'#eaedffaa');}
 aimArc(c,t){const qb=this.qb,{tx,ty}=this.aim,h=arcHeight(Math.hypot(tx-qb.x,ty-qb.y));for(let i=1;i<14;i++){if((i+Math.floor(t*8))%2)continue;const u=i/14,x=qb.x+(tx-qb.x)*u,y=qb.y+(ty-qb.y)*u,z=h*4*u*(1-u);rect(c,this.sx(x),this.sy(y)-12-Math.round(z*3),2,2,BRAND.white);}
  const px=this.sx(tx),py=this.sy(ty);ring(c,px,py,5,BRAND.white,3);rect(c,px,py,1,1,BRAND.white);}
 drawBall(c){const b=this.ball,u=b.u,x=b.x0+(b.tx-b.x0)*u,y=b.y0+(b.ty-b.y0)*u,z=b.h*4*u*(1-u),px=this.sx(x),py=this.sy(y);rect(c,px-1,py,4,1,'#00000055');const by=py-12-Math.round(z*3);rect(c,px-1,by,4,2,'#7a3b22');rect(c,px,by,2,1,'#a8572f');rect(c,px+1,by,1,1,'#f3e4d0');}
 drawPlayer(c,p,team,t){
  const x=this.sx(p.x),y=this.sy(p.y);if(x<-12||x>332)return;
  const moving=Math.hypot(p.vx,p.vy)>.8,pose=p.downed&&this.phase!=='live'?'down':p===this.qb&&this.phase==='air'&&this.t-this.throwAt<.3?'throw':moving?'run':'stand';
  const s=footballSprite(this.art,team,pose,Math.floor(t*10+p.num)%4,p.num);if(!s)return;
  const face=team===0?(p.vx<-1.5?-1:1):(p.vx>1.5?1:-1);
  if(face>0)c.drawImage(s,x-8,y-19);else{c.save();c.translate(x+8,y-19);c.scale(-1,1);c.drawImage(s,0,0);c.restore();}
  if(p===this.carrier||(p===this.qb&&(this.phase==='live'||this.phase==='pre'))){const bx=x+(face>0?3:-6);rect(c,bx,y-11,3,2,'#7a3b22');rect(c,bx+1,y-11,1,1,'#f3e4d0');}
  if(p===this.carrier&&this.phase==='run'){const bob=Math.round(Math.sin(t*8));rect(c,x-1,y-26+bob,3,2,BRAND.white);rect(c,x,y-24+bob,1,1,BRAND.white);}
  if(p.stun>0&&team===1)text(c,'+',x-2,y-28,'#ffffffaa');
  if((this.phase==='pre'||this.phase==='live'&&this.t<2.4&&!this.aim)&&p===this.rb){rect(c,x+5,y-29,9,10,BRAND.ink);text(c,'R',x+7,y-28,BRAND.white);}
 }
 hud(c,t){
  rect(c,0,0,320,15,BRAND.ink);rect(c,0,15,320,1,BRAND.blue);
  text(c,`fomo ${SCORE.home}`,5,4,BRAND.pale);text(c,`AWAY ${SCORE.away}`,58,4,'#f3c7c0');
  const m=Math.floor(this.clock/60),s=String(Math.floor(this.clock%60)).padStart(2,'0');text(c,`4TH ${m}:${s}`,112,4,this.clock<15&&Math.floor(t*3)%2?'#ff9aa8':BRAND.white);
  const dn=['1ST','2ND','3RD','4TH'][Math.min(3,this.down-1)],dist=this.togo>=100?'GOAL':String(Math.max(1,Math.round(this.togo-this.los)));text(c,`${dn} & ${dist}`,170,4,BRAND.light);
  text(c,this.los>50?`THEIR ${100-this.los}`:`OWN ${this.los}`,315,4,BRAND.pale,1,'right');
  if(this.phase==='pre'&&Math.floor(t*2)%2===0){rect(c,96,163,128,13,BRAND.blue);text(c,'TAP / SPACE TO SNAP',160,166,BRAND.white,1,'center');}
  if(this.phase==='live'&&!this.aim&&this.t>.7&&this.t<3.4){rect(c,52,163,216,13,'#0b091fcc');text(c,'DRAG BACK & RELEASE TO THROW',160,166,BRAND.pale,1,'center');}
  if(this.phase==='run'){const cw=30;rect(c,4,164,cw+40,12,BRAND.ink);rect(c,7,167,cw,6,'#2c2a5c');rect(c,7,167,Math.round(cw*(1-this.cool/1.4)),6,this.cool<=0?BRAND.light:'#4a4a8f');text(c,'JUKE',42,166,this.cool<=0?BRAND.pale:'#6c6aa0');}
  if(this.msg&&(this.msg.hold&&this.phase==='pre'||this.msg.t<1.6)){const big=this.msg.text.length<14,w=Math.min(316,(this.msg.text.length*6-1)*(big?2:1)+16),h=(big?20:13)+(this.msg.sub?10:0);rect(c,160-w/2,19,w,h,BRAND.ink);rect(c,160-w/2,19+h-1,w,1,BRAND.blue);text(c,this.msg.text,160,22,BRAND.white,big?2:1,'center');if(this.msg.sub)text(c,this.msg.sub,160,22+(big?15:9),BRAND.light,1,'center');}
 }
}
// Side-view football player, facing right: helmet with stripe and facemask,
// shoulder pads, numbered jersey, pants, team socks and cleats.
const DIGITS={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','001','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};
export function footballSprite(art,team,pose,frame,num){
 if(!art)return null;
 return art.cached(`fbp:${team}:${pose}:${pose==='run'?frame:0}:${num}`,16,21,c=>{
  const home=team===0,jersey=home?BRAND.blue:'#c43f4c',dark=home?'#3446c4':'#8f2f3b',trim=home?BRAND.white:'#f4ead2',helm=home?'#f2f4fa':'#c43f4c',helmD=home?'#c3c9dc':'#8f2f3b',stripe=home?BRAND.blue:'#f4ead2',pants=home?'#f2f4fa':'#efe6d2',pantsD=home?'#c9cedd':'#cbbfa6',skin=['#e7b08a','#b07a55','#7d5038','#f1c8a6'][num%4],ink='#14151f',mask='#a3a9b8';
  if(pose==='down'){rect(c,0,18,16,2,'#00000044');rect(c,1,15,5,3,pants);rect(c,0,16,2,2,jersey);rect(c,5,14,6,4,jersey);rect(c,5,14,6,1,trim);rect(c,11,13,5,5,helm);rect(c,11,13,5,1,stripe);rect(c,15,15,1,2,mask);return;}
  rect(c,3,19,11,2,'#00000044');
  const run=pose==='run',f=frame%4,stride=run?[2,0,-2,0][f]:0,lift=run&&(f===1||f===3)?1:0;
  rect(c,6-stride,13,3,4,pantsD);rect(c,6-stride,16,3,2,jersey);rect(c,5-stride,18,4,1,ink);
  rect(c,8+stride,13-lift,3,4,pants);rect(c,8+stride,16-lift,3,2,jersey);rect(c,8+stride,18-lift,4,1,ink);
  rect(c,6,12,5,2,pants);rect(c,6,12,5,1,'#30323f');
  rect(c,3,6,10,3,jersey);rect(c,3,6,10,1,trim);rect(c,5,8,7,4,jersey);rect(c,5,11,7,1,dark);
  const d=DIGITS[num%10];for(let r=0;r<5;r++)for(let k=0;k<3;k++)if(d[r][k]==='1')rect(c,6+k,7+r,1,1,trim);
  rect(c,2,8,2,4,dark);rect(c,2,11,2,1,skin);
  if(pose==='throw'){rect(c,11,2,2,5,jersey);rect(c,11,1,2,2,skin);}else{rect(c,12,8,2,4,jersey);rect(c,12,11,2,1,skin);}
  rect(c,5,0,6,1,helm);rect(c,4,1,8,5,helm);rect(c,4,4,3,2,helmD);rect(c,6,0,4,1,stripe);rect(c,5,1,5,1,stripe);
  rect(c,7,3,1,1,ink);rect(c,11,2,1,3,skin);rect(c,12,2,2,1,mask);rect(c,12,4,2,1,mask);rect(c,13,2,1,3,mask);rect(c,10,5,3,1,mask);
  if(home)rect(c,8,2,2,1,BRAND.blue);
 });
}
