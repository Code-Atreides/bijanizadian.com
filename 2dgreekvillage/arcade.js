import {rect,text,textWidth,BRAND,campusSprite,eyesSprite} from './pixel-art.js?v=9';
import {HoopsGame} from './games/hoops.js?v=9';
import {GridironGame} from './games/gridiron.js?v=9';
import {FlightGame} from './games/flight.js?v=9';

// The arcade runs each mini-game on a 320 × 180 console-resolution buffer,
// scaled by a whole number so every game pixel is a crisp square.
export const ARCADE_W=320,ARCADE_H=180;
export const GAMES={hoops:HoopsGame,football:GridironGame,flight:FlightGame};
export const VENUE_GAME={court:'hoops',stadium:'football',helipad:'flight'};
const $=id=>document.getElementById(id);
const BEST_KEY='fomo-village-arcade-v1';
export function loadBest(){try{const v=JSON.parse(localStorage.getItem(BEST_KEY))||{};return Object.fromEntries(Object.keys(GAMES).map(k=>[k,Number.isFinite(v[k])?v[k]:0]));}catch{return {hoops:0,football:0,flight:0};}}
function saveBest(best){try{localStorage.setItem(BEST_KEY,JSON.stringify(best));}catch{}}

export class Arcade{
 constructor({art,audio,reduced,onExit,onResult}){
  Object.assign(this,{art,audio,reduced,onExit,onResult});
  this.active=false;this.best=loadBest();this.keys=new Set();this.pointerDown=false;this.buttonDown=false;this.stick={x:0,y:0};this.edge=false;this.edgeBy=null;this.wasHeld=false;this.time=0;
  // Canvas pointer in game pixels, so games can offer drag-to-aim controls.
  this.pointer={down:false,x:0,y:0,sx:0,sy:0,released:false};
  this.frame=art.canvas(ARCADE_W,ARCADE_H);this.c=this.frame.getContext('2d');this.c.imageSmoothingEnabled=false;
  this.canvas=$('arcade-canvas');
  $('arcade-exit').onclick=()=>this.close();$('arcade-pause').onclick=()=>this.togglePause();
  addEventListener('keydown',e=>this.keydown(e),{capture:true});addEventListener('keyup',e=>{if(this.active)this.keys.delete(e.code);},{capture:true});
  const gamePoint=e=>{const r=this.canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*ARCADE_W,y:(e.clientY-r.top)/r.height*ARCADE_H};};
  this.canvas.addEventListener('pointerdown',e=>{if(!this.active)return;e.preventDefault();this.canvas.setPointerCapture?.(e.pointerId);const p=gamePoint(e);Object.assign(this.pointer,{down:true,x:p.x,y:p.y,sx:p.x,sy:p.y});this.pointerDown=true;this.edge=true;this.edgeBy='pointer';this.audio.unlock();});
  this.canvas.addEventListener('pointermove',e=>{if(!this.pointer.down)return;const p=gamePoint(e);this.pointer.x=p.x;this.pointer.y=p.y;});
  for(const n of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(n,()=>{if(this.pointer.down)this.pointer.released=true;this.pointer.down=false;this.pointerDown=false;});
  const stick=$('arcade-stick');let id=null;
  const move=e=>{if(id!==e.pointerId)return;const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),s=d>34?34/d:1;this.stick={x:dx*s/34,y:dy*s/34};stick.firstElementChild.style.transform=`translate(${dx*s}px,${dy*s}px)`;};
  stick.addEventListener('pointerdown',e=>{id=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);});stick.addEventListener('pointermove',move);
  for(const n of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(n,()=>{id=null;this.stick={x:0,y:0};stick.firstElementChild.style.transform='';});
  const action=$('arcade-action');action.addEventListener('pointerdown',e=>{e.preventDefault();this.buttonDown=true;this.edge=true;this.edgeBy='key';this.audio.unlock();});
  for(const n of ['pointerup','pointercancel','pointerleave'])action.addEventListener(n,()=>{this.buttonDown=false;});
  addEventListener('resize',()=>this.resize());
 }
 open(id,{quest=false}={}){
  const Game=GAMES[id];if(!Game)return;
  this.id=id;this.quest=quest;this.attempt=0;this.active=true;this.paused=false;$('arcade-pause').textContent='Pause';$('arcade-pause').setAttribute('aria-pressed','false');this.screen='title';this.keys.clear();this.pointerDown=false;this.buttonDown=false;this.pointer.down=false;this.pointer.released=false;this.edge=false;this.time=0;
  this.game=new Game({art:this.art,audio:this.audio,reduced:this.reduced,attempt:this.attempt});
  $('arcade').hidden=false;document.body.classList.add('arcade-open');$('arcade-title').textContent=Game.meta.title;
  const coarse=matchMedia('(pointer:coarse)').matches;$('arcade-touch').hidden=!coarse;$('arcade-stick').hidden=!Game.meta.stick;$('arcade-action').textContent=Game.meta.actionLabel||'GO';
  $('arcade-live').textContent=`${Game.meta.title}. ${Game.meta.goal}. ${Game.meta.controls.join('. ')}. Press Space or tap to start.`;
  this.resize();$('arcade-canvas').focus({preventScroll:true});this.draw();
 }
 close(){if(!this.active)return;this.active=false;this.audio.silence();$('arcade').hidden=true;document.body.classList.remove('arcade-open');const r=this.lastResult;this.lastResult=null;this.onExit?.(this.id,r);}
 togglePause(){if(this.screen!=='play')return;this.paused=!this.paused;$('arcade-pause').textContent=this.paused?'Resume':'Pause';$('arcade-pause').setAttribute('aria-pressed',String(this.paused));if(this.paused)this.audio.silence();}
 // Whole-number scaling keeps pixels square on standard screens. On dense
 // (2x+) screens a fractional step is invisible, so phones get a bigger game.
 resize(){if(!this.canvas)return;const dpr=devicePixelRatio||1,coarse=matchMedia('(pointer:coarse)').matches,bar=coarse?(innerHeight>innerWidth?190:60):56,W=(innerWidth-8)*dpr,H=(innerHeight-bar)*dpr,fit=Math.min(W/ARCADE_W,H/ARCADE_H),scale=Math.max(1,dpr>=2?Math.floor(fit*4)/4:Math.floor(fit));
  this.canvas.width=Math.round(ARCADE_W*scale);this.canvas.height=Math.round(ARCADE_H*scale);this.canvas.style.width=ARCADE_W*scale/dpr+'px';this.canvas.style.height=ARCADE_H*scale/dpr+'px';this.scale=scale;if(this.active)this.draw();}
 keydown(e){
  if(!this.active)return;
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(this.screen==='play'&&!this.paused)this.togglePause();else this.close();return;}
  if(e.code==='KeyP'){e.preventDefault();e.stopImmediatePropagation();this.togglePause();return;}
  if(e.target?.matches?.('button')&&['Enter','Space'].includes(e.code))return;
  if(['Space','Enter','KeyZ','KeyX','KeyR','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();if(!e.repeat&&['Space','Enter','KeyZ','KeyX'].includes(e.code)){this.edge=true;this.edgeBy='key';}if(!e.repeat&&e.code==='KeyR')this.alt=true;this.keys.add(e.code);}
  e.stopImmediatePropagation();
 }
 input(){const k=this.keys,ax=(k.has('ArrowRight')||k.has('KeyD')?1:0)-(k.has('ArrowLeft')||k.has('KeyA')?1:0)+this.stick.x,ay=(k.has('ArrowDown')||k.has('KeyS')?1:0)-(k.has('ArrowUp')||k.has('KeyW')?1:0)+this.stick.y;
  const keyHeld=this.buttonDown||k.has('Space')||k.has('Enter')||k.has('KeyZ')||k.has('KeyX'),held=this.pointerDown||keyHeld,pressed=this.edge,by=this.edgeBy,released=this.wasKeyHeld&&!keyHeld,alt=this.alt;
  this.edge=false;this.edgeBy=null;this.alt=false;this.wasKeyHeld=keyHeld;const pointer={...this.pointer};this.pointer.released=false;
  return {x:Math.max(-1,Math.min(1,ax)),y:Math.max(-1,Math.min(1,ay)),held,pressed,pressedBy:by,keyHeld,released,alt,pointer,up:k.has('ArrowUp')||k.has('KeyW'),turbo:k.has('ShiftLeft')||k.has('ShiftRight')};}
 tick(dt){
  if(!this.active)return;this.time+=dt;const input=this.input();
  if(this.screen==='title'){if(input.pressed){this.audio.unlock();this.audio.cue('start');this.screen='play';this.game.start?.();$('arcade-live').textContent='Go!';}}
  else if(this.screen==='play'){if(!this.paused){this.game.update(Math.min(dt,1/30),input);if(this.game.done)this.finish();}}
  else if(this.screen==='result'&&this.time-this.resultAt>.8&&input.pressed){this.attempt++;this.game=new GAMES[this.id]({art:this.art,audio:this.audio,reduced:this.reduced,attempt:this.attempt});this.screen='play';this.game.start?.();}
  this.draw();
 }
 finish(){
  const r=this.game.done;this.screen='result';this.resultAt=this.time;this.audio.silence();this.audio.cue(r.won?'win':'lose');
  const best=Math.max(this.best[this.id]||0,r.score||0),record=(r.score||0)>(this.best[this.id]||0);this.best[this.id]=best;saveBest(this.best);
  this.result={...r,best,record};this.lastResult=this.result.won||!this.lastResult?this.result:this.lastResult;
  $('arcade-live').textContent=`${r.won?'You did it':'Not this time'}. ${r.line||''} Score ${r.score}. Press Space or tap to play again, Escape to return to campus.`;
  this.onResult?.(this.id,this.result,this.quest);
 }
 draw(){
  const c=this.c;c.imageSmoothingEnabled=false;
  this.game.draw(c,this.time,this.screen==='play'&&!this.paused);
  if(this.screen==='title')this.titleCard(c);
  if(this.screen==='play'&&this.paused)this.card(c,'PAUSED',['P OR ESC TO RESUME'],BRAND.light);
  if(this.screen==='result')this.resultCard(c);
  const out=this.canvas.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(this.frame,0,0,this.canvas.width,this.canvas.height);
 }
 panel(c,x,y,w,h){rect(c,x+2,y+3,w,h,'#00000055');rect(c,x,y,w,h,BRAND.ink);rect(c,x+1,y+1,w-2,h-2,'#14123a');rect(c,x+1,y+1,w-2,1,BRAND.light);rect(c,x,y,w,1,BRAND.blue);}
 card(c,title,lines,color=BRAND.pale){const w=Math.max(150,...lines.map(l=>textWidth(l)+20),textWidth(title,2)+20),h=34+lines.length*11,x=(ARCADE_W-w)/2|0,y=(ARCADE_H-h)/2|0;this.panel(c,x,y,w,h);text(c,title,ARCADE_W/2,y+9,color,2,'center');lines.forEach((l,i)=>text(c,l,ARCADE_W/2,y+29+i*11,BRAND.pale,1,'center'));}
 titleCard(c){const m=GAMES[this.id].meta,w=272,h=132,x=24,y=24;rect(c,0,0,ARCADE_W,ARCADE_H,'#0b091f99');this.panel(c,x,y,w,h);
  const s=campusSprite(30,BRAND.white);if(s)c.drawImage(s,x+10,y+8);text(c,m.title,x+48,y+10,BRAND.white,2);text(c,m.subtitle,x+48,y+27,BRAND.light);
  rect(c,x+10,y+40,w-20,1,'#2c2a5c');text(c,'GOAL: '+m.goal,x+10,y+46,BRAND.pale);
  m.controls.forEach((l,i)=>text(c,l,x+10,y+62+i*10,'#c9cdf0'));
  if(this.best[this.id])text(c,'BEST '+this.best[this.id],x+w-10,y+h-36,BRAND.light,1,'right');
  if(Math.floor(this.time*2)%2===0){rect(c,x+w/2-78,y+h-22,156,13,BRAND.blue);text(c,'SPACE / TAP TO START',x+w/2,y+h-19,BRAND.white,1,'center');}
 }
 resultCard(c){const r=this.result,w=230,h=114,x=(ARCADE_W-w)/2|0,y=(ARCADE_H-h)/2|0;rect(c,0,0,ARCADE_W,ARCADE_H,'#0b091f88');this.panel(c,x,y,w,h);
  text(c,r.won?r.title||'YOU DID IT!':r.title||'SO CLOSE.',ARCADE_W/2,y+10,r.won?BRAND.white:BRAND.light,2,'center');
  if(r.line)text(c,r.line,ARCADE_W/2,y+30,BRAND.pale,1,'center');
  for(let i=0;i<3;i++){const on=i<(r.stars||0),sx=ARCADE_W/2-28+i*20;text(c,'★',sx,y+44,on?BRAND.white:'#2c2a5c',2);}
  text(c,'SCORE '+r.score,x+14,y+66,BRAND.pale);text(c,(r.record?'NEW BEST ':'BEST ')+r.best,x+w-14,y+66,r.record?BRAND.white:BRAND.light,1,'right');
  const e=eyesSprite(14,BRAND.pale);if(e)c.drawImage(e,ARCADE_W/2-7,y+78);
  if(this.time-this.resultAt>.8&&Math.floor(this.time*2)%2===0)text(c,'SPACE: AGAIN · ESC: CAMPUS',ARCADE_W/2,y+h-14,BRAND.light,1,'center');
 }
}
