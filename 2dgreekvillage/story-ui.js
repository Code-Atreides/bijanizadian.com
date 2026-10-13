import {introPose,INTRO_END,STORY_KEY,LEGACY_STORY_KEY,LANDING,STAGES,STAGE_GAME,STAGE_VENUE,restoredProgress,visitQuest,gameQuest,questCopy,topHouses} from './story-model.js?v=10';
import {renderIntroScene,aryaPortrait} from './story-art.js?v=10';
import {StoryAudio} from './story-audio.js?v=10';

const $=id=>document.getElementById(id);
const gameSurfaces='#world,.topbar,.location-chip,.modes,.destinations,.world-tools,.minimap,#chapter-panel,#venue-panel,#move-help,#walk-prompt,#joystick,#mobile-interact,#quest-hud';
const GAME_NAMES={hoops:'Court Kings',football:'the Final Drive',flight:'the NYC flight'};
export class StoryDirector{
 constructor({renderer,reduced,onBegin,onLand,onClear,getChapters,onHint,onFinale}){
  Object.assign(this,{renderer,reduced,onBegin,onLand,onClear,getChapters,onHint,onFinale});
  this.audio=new StoryAudio();this.active=false;this.running=false;this.paused=false;this.time=0;this.dialogue=null;this.dialogueTime=0;this.progress=restoredProgress(null);this.seen=false;this.markerRequested=false;
  try{const stored=localStorage.getItem(STORY_KEY),legacy=stored?null:localStorage.getItem(LEGACY_STORY_KEY),value=JSON.parse(stored||legacy);this.progress=restoredProgress(value,Boolean(legacy));this.seen=Boolean(value?.seen);}catch{}
  this.frame=renderer.art.canvas(1,1);this.c=this.frame.getContext('2d');this.c.pixelRaster=true;this.c.imageSmoothingEnabled=false;
  $('intro-start').onclick=()=>this.begin();$('intro-skip').onclick=()=>this.finish();$('intro-pause').onclick=()=>this.togglePause();
  $('intro-sound').onclick=()=>this.toggleSound();$('sound').onclick=()=>this.toggleSound();
  $('arya-next').onclick=()=>this.advance();
  $('quest-hud').onclick=()=>this.showHint();
  addEventListener('keydown',e=>this.keydown(e),{capture:true});
  addEventListener('pointerdown',()=>this.audio.unlock(),{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.audio.silence();});
  this.syncSound();this.updateQuest();this.resize();
 }
 get blocked(){return this.active||Boolean(this.dialogue);}
 save(){try{localStorage.setItem(STORY_KEY,JSON.stringify({...this.progress,seen:this.seen}));}catch{}}
 resize(){const dpr=globalThis.devicePixelRatio||1,cssPixel=innerWidth<640||innerHeight<600?2:4,pixel=Math.max(1,Math.round(cssPixel*dpr)),W=Math.ceil(innerWidth*dpr/pixel),H=Math.ceil(innerHeight*dpr/pixel),canvas=$('intro-canvas');this.frame.width=W;this.frame.height=H;this.c.imageSmoothingEnabled=false;this.c.pixelRaster=true;canvas.width=W*pixel;canvas.height=H*pixel;canvas.style.width=canvas.width/dpr+'px';canvas.style.height=canvas.height/dpr+'px';if(this.active)this.draw();}
 block(){document.body.classList.toggle('story-playing',this.active);document.body.classList.toggle('arya-speaking',Boolean(this.dialogue));document.querySelectorAll(gameSurfaces).forEach(el=>{el.inert=this.blocked;});this.onClear();}
 start(){
  this.closeDialogue();document.querySelectorAll('dialog[open]').forEach(d=>d.close());this.active=true;this.running=false;this.paused=false;this.time=0;this.phase='lost';this.audio.silence();this.audio.lastBeat=-1;
  this.onBegin();this.block();$('intro').hidden=false;$('intro').classList.remove('on-campus');$('intro-start-panel').hidden=false;$('intro-pause').hidden=true;$('intro-caption').textContent='SOMEWHERE, JUST OFF CAMPUS.';$('intro-skip').textContent='Skip to campus ↗';$('intro-start').textContent=this.reduced?'Enter the village →':'Begin adventure →';this.resize();$('intro-start').focus();
 }
 begin(){this.audio.unlock();this.audio.cue('start');if(this.reduced){this.finish();return;}this.running=true;$('intro-start-panel').hidden=true;$('intro-pause').hidden=false;$('intro-pause').textContent='Pause';$('intro').focus();}
 togglePause(){if(!this.active||!this.running)return;this.paused=!this.paused;this.audio.silence();$('intro-pause').textContent=this.paused?'Resume':'Pause';}
 toggleSound(){this.audio.setEnabled(!this.audio.enabled);this.syncSound();}
 syncSound(){for(const id of ['intro-sound','sound']){$(id).setAttribute('aria-pressed',String(this.audio.enabled));$(id).textContent=this.audio.enabled?'♪ On':'♪ Off';$(id).setAttribute('aria-label',this.audio.enabled?'Mute game audio':'Enable game audio');}}
 finish(){
  if(!this.active)return;this.active=false;this.running=false;this.audio.silence();this.renderer.storyFrame=null;$('intro').hidden=true;this.seen=true;this.save();this.onLand(LANDING);this.block();this.welcome();
 }
 welcome(){
  const intro=[{text:'Hey! Welcome to fomo Greek Village. Nice landing. I’m Arya — consider me your campus guide.'},
   {text:'Take a look around. Every house here belongs to a real chapter, and the neighborhood grows as more people join.'}];
  if(this.progress.stage==='new'||this.progress.stage==='top-house')intro.push({text:'If you have time, I need help finding the top house on campus. Find it and I’ll give you the next task.',complete:()=>{this.setStage('top-house');this.audio.cue('quest');}});
  else if(this.progress.stage==='complete')intro.push({text:'Legend status, still intact. The courts, the field and the helipad are open whenever you want a new high score.'});
  else intro.push({text:'Your adventure is right where you left it. Tap the quest card whenever you need a clue.'});
  this.speak(intro);
 }
 setStage(stage){this.progress={...this.progress,stage};this.save();this.updateQuest();}
 speak(pages,after){this.onClear();this.dialogue={pages,index:0,after};$('arya').hidden=false;this.block();this.page();$('arya-next').focus();}
 page(){const d=this.dialogue;if(!d)return;const p=d.pages[d.index];this.dialogueTime=0;this.revealed=this.reduced;$('arya-full-text').textContent=p.text;$('arya-text').textContent=this.reduced?p.text:'';this.portrait(false);this.audio.cue('talk');}
 portrait(talk){const canvas=$('arya-portrait'),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(aryaPortrait(this.renderer.art,talk),0,0,canvas.width,canvas.height);}
 reveal(){if(!this.dialogue)return;this.revealed=true;$('arya-text').textContent=this.dialogue.pages[this.dialogue.index].text;this.portrait(false);}
 advance(){if(!this.dialogue)return;if(!this.revealed){this.reveal();return;}const p=this.dialogue.pages[this.dialogue.index];p.complete?.();if(!this.dialogue)return;if(++this.dialogue.index<this.dialogue.pages.length)this.page();else{const after=this.dialogue.after;this.closeDialogue();after?.();}}
 dismiss(){if(this.progress.stage==='new')this.setStage('top-house');const after=this.dialogue?.after;for(const p of this.dialogue?.pages.slice(this.dialogue.index)||[])p.complete?.();this.closeDialogue();after?.();}
 closeDialogue(){this.dialogue=null;$('arya').hidden=true;this.block();$('world').focus({preventScroll:true});}
 updateQuest(){const q=questCopy(this.progress);$('quest-hud').hidden=this.progress.stage==='new';$('quest-number').textContent=q.number;$('quest-title').textContent=q.title;$('quest-detail').textContent=q.detail;$('quest-hud').classList.toggle('quest-done',this.progress.stage==='complete');this.updateMarker();}
 updateMarker(){
  if(!this.markerRequested){this.renderer.questMarker=null;return;}
  const w=this.renderer.world,stage=this.progress.stage;
  if(stage==='top-house'){const first=topHouses(this.getChapters())[0],lot=w?.lots.find(l=>l.id===first?.id);this.renderer.questMarker=lot?{...lot.door}:null;}
  else if(STAGE_VENUE[stage]){const l=w?.landmarks?.find(l=>l.id===STAGE_VENUE[stage]);this.renderer.questMarker=l?{...l.focus}:null;}
  else this.renderer.questMarker=null;
 }
 showHint(){if(this.blocked)return;const q=questCopy(this.progress);this.speak([{text:q.hint,complete:()=>{this.markerRequested=this.progress.stage!=='complete';this.updateMarker();this.onHint(this.renderer.questMarker);}}]);}
 // The venue a player is standing at for the current quest, if any.
 questGame(venue){const g=STAGE_GAME[this.progress.stage];return g&&STAGE_VENUE[this.progress.stage]===venue?g:null;}
 visit(visit){
  if(this.blocked)return false;
  const next=visitQuest(this.progress,visit,this.getChapters());if(next===this.progress)return false;
  this.progress=next;this.markerRequested=false;this.save();this.updateQuest();this.audio.cue('quest');
  if(next.stage==='campus-field'){
   const c=this.getChapters().find(c=>c.id===visit.id);
   this.speak([{text:`You found it! ${c?.name||'That chapter'} at ${c?.shortSchool||c?.school||'campus'} is ranked #1 with ${c?.joined||0} members. First campus stamp: earned.`},
    {text:'Next task: find fomo field. Head over to the stadium and check out the game. Something is always happening on this campus.'}]);
  }else this.speak([{text:'There you are! A packed house and a game on the field. Second stamp: earned.'},
   {text:'Bad news. Our running back just rolled an ankle, and Coach needs a replacement before the fourth quarter.'},
   {text:'Tryouts are at the courts right next door. Hit 5 of 10 shots and you’re on the roster.'}],()=>this.catchUp());
  return true;
 }
 // Wins earned before their quest still count once the story reaches them.
 catchUp(){
  const game=STAGE_GAME[this.progress.stage];if(!game||!this.progress.wins?.[game])return;
  const from=this.progress.stage;this.progress={...this.progress,stage:STAGES[STAGES.indexOf(from)+1]};this.save();this.updateQuest();
  this.speak([{text:`Wait — you already beat ${GAME_NAMES[game]}? Then we’re skipping ahead.`},...this.storyAfter(from)],()=>this.catchUp());
 }
 storyAfter(stage){
  if(stage==='court')return [{text:'Five buckets. Coach saw the whole thing — you’re in.'},{text:'Fourth quarter, 1:30 left, we’re down three. Coach is putting you in at quarterback. Get back to fomo field and lead the game-winning drive.'}];
  if(stage==='game-winner')return [{text:'TOUCHDOWN! The whole village is losing it.'},{text:'Uh-oh. Orangie and Rasmr just landed at the helipad, and their pilot is stuck in traffic on the turnpike. They’re due on a stream in New York tonight.'},{text:'You fell out of a pipe this morning. A helicopter can’t be harder. Fly them to the Downtown heliport — safely, please.'}];
  if(stage==='vip-flight')return [{text:'They made it! Orangie says thanks for the smooth landing. Mostly smooth.'},{text:'Top house, fomo field, the team, the game-winner and a VIP run to New York. That’s Greek Village legend status.'},{text:'Party night is on me. Bring your chapter — every member who joins makes the neighborhood bigger.',complete:()=>this.onFinale?.()}];
  return [];
 }
 // Called by the arcade when a game ends. Returns true when the story moved.
 gameResult(gameId,result){
  const before=this.progress,next=gameQuest(before,gameId,result?.won);if(next===before)return false;
  this.progress=next;this.save();
  if(next.stage===before.stage){this.updateQuest();return false;}
  this.markerRequested=false;this.updateQuest();this.audio.cue('quest');this.pending=this.storyAfter(before.stage);return true;
 }
 // Story beats are spoken once the player is back on campus.
 flush(){if(!this.pending||this.blocked)return false;const pages=this.pending;this.pending=null;this.speak(pages,()=>this.catchUp());return true;}
 keydown(e){
  if(!this.blocked)return;const isTab=e.key==='Tab';
  if(['Enter','Space'].includes(e.code)&&e.target?.matches('button')){e.stopImmediatePropagation();return;}
  if(isTab){const root=this.active?$('intro'):$('arya'),buttons=[...root.querySelectorAll('button')].filter(b=>!b.hidden&&!b.closest('[hidden]')),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}e.stopImmediatePropagation();return;}
  const action=['Space','Enter','KeyE','Escape','KeyP'].includes(e.code);if(action){e.preventDefault();if(e.repeat){e.stopImmediatePropagation();return;}if(this.active){if(e.code==='Escape')this.finish();else if(e.code==='KeyP')this.togglePause();else if(!this.running)this.begin();}else{if(e.code==='Escape')this.dismiss();else if(e.code!=='KeyP')this.advance();}}
  e.stopImmediatePropagation();
 }
 tick(dt){
  if(this.active){
   if(this.running&&!this.paused)this.time+=dt;
   const pose=introPose(this.time);if(pose.phase!==this.phase){this.phase=pose.phase;this.audio.cue(pose.phase);}
   if(this.running&&!this.paused&&this.time<8.35)this.audio.music(this.time);
   $('intro').classList.toggle('on-campus',pose.campus);$('intro-canvas').hidden=pose.campus;
   $('intro-caption').textContent=pose.campus?'WELCOME TO THE NEIGHBORHOOD.':pose.phase==='walk'?(pose.walk<.25?'LET’S TRY THIS WAY.':'THAT LOOKS PROMISING.'):pose.phase==='discover'?'ONE WAY TO FIND OUT.':'SOMEWHERE, JUST OFF CAMPUS.';
   this.renderer.walk=pose.campus;this.renderer.storyFrame=pose.campus?pose:null;
   if(pose.done){this.finish();return;}
   this.draw();
  }
  if(this.dialogue){
   this.dialogueTime+=dt;const p=this.dialogue.pages[this.dialogue.index],length=Math.floor(this.dialogueTime*43),previous=$('arya-text').textContent.length;
   if(!this.revealed){$('arya-text').textContent=p.text.slice(0,length);if(length>=p.text.length){this.revealed=true;this.portrait(false);}else{if(length!==previous&&length%4===0)this.audio.cue('talk');this.portrait(Math.floor(this.dialogueTime*6)%2===0);}}
  }
 }
 draw(){if(!this.active)return;renderIntroScene(this.c,this.renderer.art,introPose(this.time),!this.running);const canvas=$('intro-canvas'),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(this.frame,0,0,canvas.width,canvas.height);}
}
