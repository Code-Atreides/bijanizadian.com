import {rect,text,line,disc,ring,BRAND,fomo,eyesSprite} from '../pixel-art.js?v=8';
import {heroSprite} from '../story-art.js?v=8';

// Court Kings: ten balls, a timing meter and real projectile physics. The
// meter only sets launch speed; the rim, backboard and floor decide the rest.
export const FLOOR=150,RIM_Y=74,RIM_FRONT=266,RIM_BACK=286,BOARD_X=287,BALL_R=4,GRAVITY=300;
export const SPOTS=[{x:222,pts:2,name:'LAYUP',angle:60},{x:196,pts:2,name:'SHORT',angle:56},{x:166,pts:2,name:'ELBOW',angle:53},{x:132,pts:3,name:'WING THREE',angle:52},{x:98,pts:3,name:'DEEP THREE',angle:50}];
export const BALLS=10,GOAL=5;
const RIM_PTS=[{x:RIM_FRONT,y:RIM_Y},{x:RIM_BACK,y:RIM_Y}];
export function releasePoint(spot){return {x:spot.x+8,y:FLOOR-56};}
// Launch speed that drops the ball through the centre of the rim.
export function idealSpeed(spot){const r=releasePoint(spot),dx=(RIM_FRONT+RIM_BACK)/2-r.x,up=r.y-(RIM_Y-1),a=spot.angle*Math.PI/180;return Math.sqrt(GRAVITY*dx*dx/(2*Math.cos(a)**2*(dx*Math.tan(a)-up)));}
export const SPEED_RANGE=.6;
export function perfectHalf(spot){const dx=(RIM_FRONT+RIM_BACK)/2-releasePoint(spot).x;return Math.min(.22,Math.max(.045,6/(2*dx)/SPEED_RANGE));}
// One physics step for the ball. Returns events for sound and scoring.
export function stepBall(b,dt){
 const ev=[];const py=b.y;
 b.vy+=GRAVITY*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
 for(const p of RIM_PTS){const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),min=BALL_R+1.5;if(d<min&&d>0){const nx=dx/d,ny=dy/d;b.x=p.x+nx*min;b.y=p.y+ny*min;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.5*vn*nx;b.vy-=1.5*vn*ny;b.vx*=.92;ev.push('rim');}}}
 if(b.x+BALL_R>BOARD_X&&b.x<BOARD_X+6&&b.y>44&&b.y<RIM_Y+8&&b.vx>0){b.x=BOARD_X-BALL_R;b.vx=-b.vx*.8;ev.push('board');}
 if(b.y+BALL_R>FLOOR+16){b.y=FLOOR+16-BALL_R;if(b.vy>40)ev.push('bounce');b.vy=-b.vy*.58;b.vx*=.82;}
 const line=RIM_Y+2;if(!b.scored&&py<line&&b.y>=line&&b.vy>0&&b.x>RIM_FRONT+2&&b.x<RIM_BACK-2){b.scored=true;ev.push(b.touched?'score':'swish');}
 if(ev.includes('rim')||ev.includes('board'))b.touched=true;
 return ev;
}
export class HoopsGame{
 static meta={id:'hoops',title:'COURT KINGS',subtitle:'TRYOUTS AT THE COURTS',goal:`MAKE ${GOAL} OF ${BALLS} SHOTS`,controls:['SPACE / TAP: STOP THE POWER METER','HIT THE BLUE ZONE FOR A SWISH','MAKES MOVE YOU BACK. 3S BEYOND THE ARC.'],actionLabel:'SHOOT'};
 constructor({art,audio,reduced}){this.art=art;this.audio=audio;this.reduced=reduced;this.spot=0;this.ball=null;this.left=BALLS;this.made=0;this.points=0;this.streak=0;this.phase='ready';this.clock=0;this.meter=0;this.pop=null;this.cheer=0;this.net=0;this.done=null;}
 start(){this.phase='ready';this.clock=0;}
 get spotInfo(){return SPOTS[this.spot];}
 meterValue(){const rate=(.6+this.spot*.07+Math.min(this.streak,4)*.05)*(this.reduced?.75:1),u=(this.clock*rate)%1;return u<.5?u*2:2-u*2;}
 update(dt,input){
  this.clock+=dt;this.cheer=Math.max(0,this.cheer-dt);this.net=Math.max(0,this.net-dt);if(this.pop)this.pop.t+=dt;
  if(this.phase==='ready'){this.meter=this.meterValue();if(input.pressed){this.lock=this.meter;this.phase='windup';this.wind=0;}}
  else if(this.phase==='windup'){this.wind+=dt;if(this.wind>=.16)this.release();}
  else if(this.phase==='flight'){
   this.flight+=dt;const b=this.ball;for(let i=0;i<6;i++){for(const e of stepBall(b,dt/6))this.event(e);}
   if(b.scored)this.afterScore=(this.afterScore||0)+dt;
   const resting=b.y>=FLOOR+16-BALL_R-.5&&Math.abs(b.vy)<30;
   if((b.scored&&this.afterScore>.9)||b.x>335||b.x<-15||this.flight>3.6||(resting&&this.flight>1.2))this.resolve();
  }else if(this.phase==='between'){this.wait-=dt;if(this.wait<=0)this.next();}
 }
 release(){
  const s=this.spotInfo,r=releasePoint(s),half=perfectHalf(s),off=this.lock-.5,perfect=Math.abs(off)<half*.5;
  const v=idealSpeed(s)*(perfect?1:1+off*SPEED_RANGE),a=s.angle*Math.PI/180;
  this.ball={x:r.x,y:r.y,vx:Math.cos(a)*v,vy:-Math.sin(a)*v,scored:false,touched:false,trail:[]};this.phase='flight';this.flight=0;this.afterScore=0;this.perfect=perfect;this.audio.cue('shoot');
 }
 event(e){if(e==='rim'){this.audio.cue('rim');}else if(e==='board')this.audio.cue('board');else if(e==='bounce')this.audio.cue('bounce');else if(e==='swish'||e==='score'){this.audio.cue('swish');this.net=.5;}}
 resolve(){
  const s=this.spotInfo,b=this.ball;this.left--;
  if(b.scored){this.made++;this.streak++;const bonus=this.streak>=3?1:0;this.points+=s.pts+bonus;this.pop={text:(b.touched?'BUCKET! ':'SWISH! ')+'+'+(s.pts+bonus),t:0,good:true};this.cheer=1.2;this.audio.cue('cheer');this.spot=Math.min(SPOTS.length-1,this.spot+1);}
  else{this.streak=0;this.pop={text:b.touched?'IN AND OUT':'BRICK',t:0,good:false};}
  this.phase='between';this.wait=.7;this.ball=null;
  const need=GOAL-this.made;
  if(this.left===0||need>this.left)this.finishSoon=true;
 }
 next(){
  if(this.finishSoon){const won=this.made>=GOAL,stars=this.made>=9?3:this.made>=7?2:won?1:0;this.done={won,score:this.points*10+this.made*5,stars,title:won?'YOU MADE THE TEAM!':'CUT FROM TRYOUTS',line:`${this.made} OF ${BALLS} MADE · ${this.points} PTS`};return;}
  this.phase='ready';this.clock=0;
 }
 draw(c,t,live){
  // Sky, campus skyline, trees, chain-link fence and the court surface.
  const sky=['#6f9fe0','#7cabe6','#8ab6ea','#9cc2ee','#afcef1','#c3daf3','#d6e6f5'];sky.forEach((col,i)=>rect(c,0,i*14,320,14,col));
  for(let i=0;i<6;i++)for(let x=i%2;x<320;x+=2)rect(c,x,i*14+13,1,1,sky[i+1]);
  for(let i=0;i<4;i++){const x=((i*97+t*4)%380)-40,y=12+i*9;disc(c,x,y,14,'#eef4fb',4);disc(c,x+10,y-2,10,'#ffffff',4);}
  rect(c,0,78,320,22,'#a5b8d0');for(const [x,w,h] of [[10,40,14],[58,26,20],[90,60,10],[160,22,28],[190,50,16],[250,36,22]]){rect(c,x,98-h,w,h,'#8fa6c2');for(let wy=98-h+3;wy<96;wy+=5)for(let wx=x+3;wx<x+w-3;wx+=6)rect(c,wx,wy,2,2,'#c7d6e8');}
  rect(c,166,58,10,12,'#8fa6c2');rect(c,169,52,4,6,'#8fa6c2');
  for(let x=0;x<330;x+=14){disc(c,x,100,12,'#3f8a57',8);disc(c,x+6,97,7,'#57a565',5);}
  rect(c,0,104,320,46,'#4f9561');
  for(let x=-60;x<330;x+=6){line(c,x,104,x+46,150,'#a9b4bd88');line(c,x+46,104,x,150,'#a9b4bd88');}
  for(let x=4;x<320;x+=40){rect(c,x,100,2,50,'#7d8a96');}rect(c,0,100,320,2,'#7d8a96');
  rect(c,0,FLOOR,320,30,'#c9744c');rect(c,0,FLOOR,320,2,'#e8a172');for(let x=0;x<320;x+=9)rect(c,x,FLOOR+3,1,27,'#b9673f');
  rect(c,216,FLOOR+2,104,28,BRAND.blue);rect(c,216,FLOOR+2,104,1,BRAND.pale);rect(c,216,FLOOR+2,1,28,BRAND.pale);
  rect(c,112,FLOOR+2,1,28,'#f2e6d0');text(c,'3PT',116,FLOOR+20,'#f2e6d0');
  SPOTS.forEach((s,i)=>{const on=i===this.spot;rect(c,s.x-3,FLOOR+8,7,1,on?BRAND.white:'#e6b598');rect(c,s.x,FLOOR+5,1,7,on?BRAND.white:'#e6b598');});
  // Bleacher crowd with Arya, cheering on makes.
  rect(c,4,128,74,22,'#7b6f66');rect(c,4,128,74,3,'#a49488');rect(c,4,139,74,2,'#a49488');
  for(let i=0;i<7;i++){const hop=this.cheer>0?Math.round(Math.abs(Math.sin((this.cheer*8)+i))*4):0;c.drawImage(this.art.person({role:'chat',skin:(i*2)%6,shirt:(i*4)%9,hair:i%5},0,2),8+i*10,i%2?110-hop:118-hop);}
  // Hoop: pole, arm, backboard with the fomo mark on campus purple, rim and net.
  rect(c,298,50,4,FLOOR-50,'#3f4656');rect(c,299,50,1,FLOOR-50,'#6b7488');rect(c,BOARD_X+3,60,11,3,'#3f4656');
  rect(c,BOARD_X,42,4,40,'#d8dbe6');rect(c,BOARD_X+1,42,2,40,'#ffffff');rect(c,BOARD_X-1,60,2,14,BRAND.blue);
  rect(c,292,42,8,10,BRAND.blue);fomo(c,292,43,8,BRAND.pale);
  rect(c,RIM_FRONT-1,RIM_Y-1,RIM_BACK-RIM_FRONT+3,3,'#9c2f22');rect(c,RIM_FRONT,RIM_Y-1,RIM_BACK-RIM_FRONT+1,1,'#f06a4c');
  const sw=this.net>0?Math.sin(this.net*30)*2:0;for(let i=0;i<=6;i++){const x=RIM_FRONT+1+i*(RIM_BACK-RIM_FRONT-2)/6;line(c,x,RIM_Y+2,RIM_FRONT+5+i*2.4+sw,RIM_Y+15,'#f4f4f4');}
  for(let k=0;k<3;k++)line(c,RIM_FRONT+2+k,RIM_Y+5+k*3,RIM_BACK-2-k,RIM_Y+5+k*3,'#f4f4f499');
  // Shooter: the frat kid from the opening, now in tryout mode.
  const s=this.spotInfo,jump=this.phase==='windup'?Math.sin(Math.min(1,this.wind/.16)*Math.PI/2)*8:this.phase==='flight'&&this.flight<.3?8*(1-this.flight/.3):0;
  rect(c,s.x-8,FLOOR+11,18,3,'#00000033');
  c.drawImage(heroSprite(this.art,'frat',0,1,jump>2),s.x-16,FLOOR-44+12-Math.round(jump));
  if(this.phase==='ready'||this.phase==='windup'){const dy=this.phase==='ready'?Math.abs(Math.sin(this.clock*7))*16:0,bx=this.phase==='ready'?s.x+12:s.x+8,by=this.phase==='ready'?FLOOR+6-dy:FLOOR-54-jump;this.drawBall(c,bx,by);}
  if(this.ball){const b=this.ball;if(this.streak>=2){for(let i=1;i<5;i++)rect(c,b.x-b.vx*i*.012-1,b.y-b.vy*i*.012-1,3-i*.5,3-i*.5,i%2?BRAND.light:BRAND.pale);}this.drawBall(c,b.x,b.y);
   if(b.x>RIM_FRONT&&b.x<RIM_BACK&&b.y>RIM_Y&&b.y<RIM_Y+16)rect(c,RIM_FRONT-1,RIM_Y-1,RIM_BACK-RIM_FRONT+3,2,'#c43c2a');}
  // HUD
  rect(c,4,4,104,26,BRAND.ink);rect(c,4,29,104,1,BRAND.blue);text(c,`BALLS ${this.left}`,8,7,BRAND.pale);text(c,`MADE ${this.made}/${GOAL}`,8,18,this.made>=GOAL?BRAND.white:BRAND.light);text(c,`${this.points} PTS`,104,7,BRAND.white,1,'right');
  rect(c,214,4,102,15,BRAND.ink);text(c,s.name,265,8,BRAND.pale,1,'center');
  if(this.streak>=3){rect(c,124,4,72,13,BRAND.blue);text(c,'ON FIRE',160,7,BRAND.white,1,'center');}
  if(this.phase==='ready'){
   const half=perfectHalf(s),x=150,y=37,w=100;rect(c,x-2,y-2,w+4,10,BRAND.ink);rect(c,x,y,w,6,'#2c2a5c');rect(c,x+Math.round((.5-half)*w),y,Math.max(2,Math.round(half*2*w)),6,BRAND.blue);rect(c,x+Math.round((.5-half*.5)*w),y,Math.max(1,Math.round(half*w)),6,BRAND.light);
   rect(c,x+Math.round(this.meter*w)-1,y-3,3,12,BRAND.white);rect(c,x-38,y-3,37,12,BRAND.ink);text(c,'POWER',x-35,y-1,BRAND.pale);
  }
  if(this.pop&&this.pop.t<1.1){const y=40-Math.min(10,this.pop.t*20);text(c,this.pop.text,160,y,this.pop.good?BRAND.white:'#f3c7c0',2,'center');}
 }
 drawBall(c,x,y){x=Math.round(x);y=Math.round(y);disc(c,x,y,BALL_R,'#7a3412');disc(c,x,y,BALL_R-1,'#e07b39');rect(c,x-BALL_R+1,y,BALL_R*2-1,1,'#5b2a12');rect(c,x,y-BALL_R+1,1,BALL_R*2-1,'#5b2a12');rect(c,x-2,y-2,1,1,'#ffc79a');}
}
