import {houseStandings} from './world-model.js?v=10';

export const STORY_KEY='fomo-village-story-v5';
export const LEGACY_STORY_KEY='fomo-village-story-v4';
export const LANDING={x:1092,y:574};
export const INTRO_END=13.5;
export const clamp01=n=>Math.max(0,Math.min(1,n));
export function introPose(time){
 const t=Math.max(0,time);
 const phase=t<2.4?'lost':t<5.6?'walk':t<6.3?'discover':t<7.5?'jump':t<8.35?'pipe':t<9.1?'warp':t<12.15?'fall':t<INTRO_END?'land':'done';
 const walk=clamp01((t-2.4)/3.2),jump=clamp01((t-6.3)/1.2),sink=clamp01((t-7.65)/.65),fall=clamp01((t-9.1)/3.05);
 return {time:t,phase,walk,jump,sink,airborne:phase==='fall',altitude:phase==='fall'?Math.round(320*(1-fall*fall)):0,landAge:Math.max(0,t-12.15),campus:t>=9.1,done:t>=INTRO_END};
}
// Chapter 1: find the top house, find fomo field. Chapter 2: make the team at
// the courts, win the game, then fly Orangie and Rasmr to New York.
export const STAGES=['new','top-house','campus-field','court','game-winner','vip-flight','complete'];
// The mini-game that completes each game stage, and the venue that hosts it.
export const STAGE_GAME={court:'hoops','game-winner':'football','vip-flight':'flight'};
export const STAGE_VENUE={'campus-field':'stadium',court:'court','game-winner':'stadium','vip-flight':'helipad'};
const GAME_IDS=['hoops','football','flight'];
export function restoredProgress(value,legacy=false){
 let stage=STAGES.includes(value?.stage)?value.stage:'new';
 // Version 4 ended after fomo field; those players continue into chapter 2.
 if(legacy&&stage==='complete')stage='court';
 const wins={};for(const id of GAME_IDS)wins[id]=value?.wins?.[id]===true;
 return {stage,foundHouse:typeof value?.foundHouse==='string'?value.foundHouse:null,wins};
}
export function topHouses(chapters){return houseStandings(chapters.filter(c=>c.joined>30),'members').filter(c=>c.rank===1);}
export function visitQuest(progress,visit,chapters){
 if(progress.stage==='top-house'&&visit.type==='chapter'&&topHouses(chapters).some(c=>c.id===visit.id))return {...progress,stage:'campus-field',foundHouse:visit.id};
 if(progress.stage==='campus-field'&&visit.type==='landmark'&&visit.id==='stadium')return {...progress,stage:'court'};
 return progress;
}
// A win always counts toward that game's badge; it advances the story only
// when it is the current task.
export function gameQuest(progress,gameId,won){
 if(!won||!GAME_IDS.includes(gameId))return progress;
 const wins={...progress.wins,[gameId]:true};
 if(STAGE_GAME[progress.stage]===gameId)return {...progress,wins,stage:STAGES[STAGES.indexOf(progress.stage)+1]};
 return progress.wins?.[gameId]?progress:{...progress,wins};
}
export function questCopy(progress){
 const s=progress.stage;
 if(s==='campus-field')return {number:'02',title:'Find fomo field',detail:'Catch the action at the stadium.',hint:'Head west of Greek Row. In Walk mode, press E in the middle of the field, or pick Stadium on the map.'};
 if(s==='court')return {number:'03',title:'Make the team',detail:'Hit 5 of 10 shots at the courts.',hint:'The courts are right below fomo field. Walk onto the court and press E, or pick Courts on the map. Stop the meter in the blue zone.'};
 if(s==='game-winner')return {number:'04',title:'Win the game',detail:'Score the game-winning touchdown.',hint:'Back to fomo field. You’re the quarterback with 1:30 left. Snap, then drag back and release to throw to the open man, or tap the running back to run it. Move the chains and get in the end zone.'};
 if(s==='vip-flight')return {number:'05',title:'VIP to New York',detail:'Fly Orangie & Rasmr to NYC.',hint:'The helipad is just south of the courts. Hold to climb, let go to descend, grab fomo fuel and ease off for a soft landing.'};
 if(s==='complete')return {number:'✓',title:'Greek Village legend',detail:'All five quests done. Chase high scores.',hint:'You did it all. Replay Court Kings, the Final Drive and the NYC flight for a new best, or bring your chapter to the village.'};
 return {number:'01',title:'Find the top house',detail:'Look for the house ranked #1.',hint:'Check Standings for the current leader by member signups. Click its house in Map mode, or walk to its door and press E. Tied #1 houses both count.'};
}
