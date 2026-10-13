import {PixelArt,C,BRAND,rect,poly,line,text,fomo,houseBanner,disc} from './pixel-art.js?v=9';
import {memberPose,hash,clamp,letters,ROAD} from './world-model.js?v=9';
import {helipadState} from './shared/village-helipad.js?v=183';
import {footballState,footballPlayer,footballBall} from './shared/village-football.js?v=183';
import {pixelViewport,pixelView,worldPoint as viewWorldPoint,screenPoint as viewScreenPoint,fitZoom as viewFitZoom} from './pixel-view.js?v=9';
import {helipadFanPose} from './shared/village-helipad-fans.js?v=183';
import {heroSprite,drawLanding} from './story-art.js?v=9';

// Traffic drives on the right. Each loop is a closed lane circuit around a
// block; cars queue behind each other, yield at merges and stop for the player.
const LANE_NEAR=11,LANE_FAR=33;
function loopCorners(L,R,T,B,clockwise){
 return clockwise?[[L+LANE_FAR,T+LANE_FAR],[R+LANE_NEAR,T+LANE_FAR],[R+LANE_NEAR,B+LANE_NEAR],[L+LANE_FAR,B+LANE_NEAR]]
  :[[R+LANE_FAR,T+LANE_NEAR],[L+LANE_NEAR,T+LANE_NEAR],[L+LANE_NEAR,B+LANE_FAR],[R+LANE_FAR,B+LANE_FAR]];
}
export function trafficLoops(world){
 const st=world.streets,last=st[world.rows],r1=st[1],r3=st[Math.min(3,world.rows-1)];
 return [
  {corners:loopCorners(572,2356,st[0],last,true),cars:5,speed:46},
  {corners:loopCorners(1072,1564,r1,r3,false),cars:2,speed:38},
  {corners:loopCorners(572,2056,last,world.bottom,true),cars:3,speed:44},
  {corners:loopCorners(1564,2056,r1,r3,false),cars:2,speed:40},
  {corners:loopCorners(572,1072,r1,r3,false),cars:2,speed:36},
 ].map(loop=>{const seg=[];let len=0;for(let i=0;i<4;i++){const a=loop.corners[i],b=loop.corners[(i+1)%4],l=Math.hypot(b[0]-a[0],b[1]-a[1]);seg.push({a,b,l,start:len,dx:Math.sign(b[0]-a[0]),dy:Math.sign(b[1]-a[1])});len+=l;}return {...loop,seg,len};});
}
export function loopPoint(loop,s){
 s=((s%loop.len)+loop.len)%loop.len;
 for(const g of loop.seg)if(s<=g.start+g.l){const u=s-g.start;return {x:g.a[0]+g.dx*u,y:g.a[1]+g.dy*u,hx:g.dx,hy:g.dy,dir:g.dx>0?0:g.dy>0?1:g.dx<0?2:3};}
 const g=loop.seg[0];return {x:g.a[0],y:g.a[1],hx:g.dx,hy:g.dy,dir:0};
}
export function stepTraffic(cars,loops,dt,obstacles=[]){
 const pos=cars.map(c=>({...loopPoint(loops[c.loop],c.s),car:c}));
 for(const p of pos){
   const c=p.car;let blocked=false;
   for(const o of pos){if(o===p)continue;const dx=o.x-p.x,dy=o.y-p.y,along=dx*p.hx+dy*p.hy,lat=Math.abs(-dx*p.hy+dy*p.hx);
     if(along>0&&along<36&&lat<12&&(o.dir===p.dir||(o.car.id<c.id&&c.wait<3))){blocked=true;break;}}
   for(const o of obstacles){const dx=o.x-p.x,dy=o.y-p.y,along=dx*p.hx+dy*p.hy,lat=Math.abs(-dx*p.hy+dy*p.hx);if(along>-4&&along<40&&lat<14){blocked=true;c.honk=(c.honk||0)+dt;}}
   const target=blocked?0:c.speed;c.v+=clamp(target-c.v,-160*dt,45*dt);c.wait=c.v<1?c.wait+dt:0;
 }
 for(const c of cars)c.s=(c.s+c.v*dt)%loops[c.loop].len;
}
export class VillageRenderer{
 constructor(canvas,options={}){this.canvas=canvas;this.output=canvas.getContext('2d',{alpha:false});this.art=new PixelArt(options.factory);this.frame=this.art.canvas(1,1);this.c=this.frame.getContext('2d',{alpha:false});this.c.pixelRaster=true;this.camera={x:930,y:430,zoom:1};this.selected='sigma-chi-sdsu';this.night=false;this.time=0;this.arrivals=[];this.celebrations=new Map();this.hover=null;this.blimpHit=null;this.labels=true;this.player={x:934,y:542,dir:2,moving:false};this.walk=false;this.renderStats={};this.cars=[];this.resize(canvas.width,canvas.height,1);}
 setWorld(world){this.world=world;this.ground=this.art.ground(world);this.staticObjects=[];
   for(const l of world.lots){const s=this.art.house(l);this.staticObjects.push({x:l.house.x-14-l.house.w/2,y:l.house.y-s.height+24,depth:l.house.y+10,sprite:s,type:'house',lot:l});}
   for(const b of world.buildings){const s=this.art.building(b);this.staticObjects.push({x:b.x-b.w/2-12,y:b.y-s.height+12,depth:b.y+8,sprite:s});}
   for(const t of world.trees){const s=this.art.tree(t.kind,t.seed);this.staticObjects.push({x:t.x-24,y:t.y-57,depth:t.y,sprite:s});}
   for(const t of world.foodTrucks){const s=this.art.truck(t);this.staticObjects.push({x:t.x-38,y:t.y-40,depth:t.y+6,sprite:s});}
   this.staticObjects.sort((a,b)=>a.depth-b.depth);
   // Keep car progress when a live update rebuilds the same street plan.
   const loops=trafficLoops(world),same=this.loops&&this.loops.length===loops.length&&this.loops.every((l,i)=>l.len===loops[i].len);this.loops=loops;
   if(!same){this.cars=[];let id=0;loops.forEach((l,li)=>{for(let i=0;i<l.cars;i++)this.cars.push({id:id++,loop:li,s:(i+.5)*l.len/l.cars,v:l.speed,speed:l.speed*(.9+hash(li,i,'spd')*.2),kind:(id*2+li)%6,wait:0});});}
 }
 // Cars yield to the player and to anyone on a zebra crossing.
 update(dt,walking){if(!this.loops)return;const obs=walking?[{x:this.player.x,y:this.player.y}]:[],roads=this.world.roads;
   for(const p of this.world.people){if(!p.walk)continue;const q=memberPose(p,this.time+dt);if(roads.some(r=>q.x>=r.x&&q.x<=r.x+r.w&&q.y>=r.y&&q.y<=r.y+r.h))obs.push(q);}
   stepTraffic(this.cars,this.loops,dt,obs);}
 resize(w,h,dpr=1){
   this.viewport=pixelViewport(w,h,dpr);const v=this.viewport;
   this.canvas.width=v.width;this.canvas.height=v.height;
   if(this.canvas.style){this.canvas.style.width=v.cssWidth+'px';this.canvas.style.height=v.cssHeight+'px';}
   this.frame.width=v.columns;this.frame.height=v.rows;
   this.c.imageSmoothingEnabled=false;this.c.pixelRaster=true;this.output.imageSmoothingEnabled=false;
 }
 view(){return pixelView(this.viewport,this.camera);}
 worldPoint(x,y){return viewWorldPoint(this.view(),x,y);}
 screenPoint(x,y){return viewScreenPoint(this.view(),x,y);}
 worldDelta(x,y){const v=this.view();return {x:x*v.worldPerPixel,y:y*v.worldPerPixel};}
 fitZoom(w,h){return viewFitZoom(this.viewport,w,h);}
 nextZoom(direction){const s=this.view().step;let step;if(s>1)step=Math.max(1,Math.min(96,s-direction));else{const n=Math.round(1/s)+direction;step=n<1?2:1/Math.min(4,n);}return this.viewport.pixel/this.viewport.dpr/this.viewport.baseScale/step;}
 hit(x,y){if(!this.world)return null;
   if(this.blimpHit&&x>this.blimpHit.x&&x<this.blimpHit.x+104&&y>this.blimpHit.y&&y<this.blimpHit.y+46)return {type:'blimp',id:'discord'};
   const l=[...this.world.lots].reverse().find(l=>x>l.x&&x<l.x+l.w&&y>l.y&&y<l.y+l.h);if(l)return {type:'chapter',id:l.id};
   const e=this.world.empty;if(x>e.x&&x<e.x+e.w&&y>e.y&&y<e.y+e.h)return {type:'claim',id:'empty'};
   const lm=this.world.landmarks.find(a=>x>a.x&&x<a.x+a.w&&y>a.y&&y<a.y+a.h);if(lm)return {type:'landmark',id:lm.id};return null;
 }
 landmark(id){return this.world.landmarks.find(l=>l.id===id);}
 render(t=this.time){if(!this.world)return;this.time=t;const c=this.c,W=this.frame.width,H=this.frame.height,view=this.view(),z=view.zoom;
   const vx=view.x,vy=view.y,vw=view.width,vh=view.height;
   const seen=(x,y,w=60,h=60)=>x+w>vx&&x<vx+vw&&y+h>vy&&y<vy+vh;
   c.imageSmoothingEnabled=false;rect(c,0,0,W,H,C.grass);c.save();c.scale(z,z);c.translate(-vx,-vy);
   c.drawImage(this.ground,0,0);
   for(const lot of this.world.lots){if(!seen(lot.x,lot.y,lot.w,lot.h))continue;
     if(lot.id===this.selected||this.hover?.id===lot.id){
       const col=lot.id===this.selected?BRAND.light:'#c9f4d0',x=lot.x-3,y=lot.y+7,w=lot.w+6,h=lot.h-10;
       for(const [px,py,dx,dy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){
         rect(c,px+(dx<0?-12:0),py,13,3,BRAND.ink);rect(c,px,py+(dy<0?-12:0),3,13,BRAND.ink);
         rect(c,px+(dx<0?-11:1),py+1,12,1,col);rect(c,px+1,py+(dy<0?-11:1),1,12,col);
       }
     }
     if(lot.pool)for(let n=0;n<9;n++){const px=lot.x+27+(n*17+Math.floor(t*3))%66,py=lot.y+34+(n*7)%25;rect(c,px,py,3+(n%3),1,n%2?'#a3f5df':'#63e9db');if(n<2&&Math.sin(t*1.7+n*3)>.6){rect(c,px+2,py-2,1,5,'#e5fff0');rect(c,px,py,5,1,'#e5fff0');}}
     const ballCycle=(t+hash(lot.id)*3)%(3.8+hash(lot.id)*2.1),flight=clamp((ballCycle-1.15)/.85,0,1);
     if(ballCycle>=1.15&&ballCycle<2){rect(c,lot.x+31+flight*33,lot.y+228-Math.sin(flight*Math.PI)*19,2,2,'#fff5cf');}
     const dieCycle=(t+hash(lot.id,'die')*4)%(4.6+hash(lot.id,'die')*1.9),du=clamp((dieCycle-1)/1.2,0,1);
     if(dieCycle>1&&dieCycle<2.2){rect(c,lot.x+119+du*24,lot.y+230-Math.sin(du*Math.PI)*29,3,3,'#fcf0d5');rect(c,lot.x+120+du*24,lot.y+231-Math.sin(du*Math.PI)*29,1,1,'#5a5364');}
   }
   this.fountain(c,t,seen);
   const nodes=this.staticObjects.filter(o=>seen(o.x,o.y,o.sprite.width,o.sprite.height)).map(o=>({...o}));
   let drawn=0;
   for(const p of this.world.people){if(p.lot&&!seen(p.lot.x,p.lot.y,176,260))continue;const pose=memberPose(p,t);if(!seen(pose.x-9,pose.y-25,18,30))continue;
     if(this.arrivals.some(a=>a.id===p.id&&t-a.start<10))continue;
     const sprite=this.art.person(p,pose.frame,pose.dir),scale=p.lot?.67:.72;nodes.push({x:pose.x-9*scale,y:pose.y-22*scale,depth:pose.y,sprite,person:p,pose,scale});drawn++;
   }
   for(const car of this.cars){const p=loopPoint(this.loops[car.loop],car.s);if(seen(p.x-20,p.y-20,40,40))nodes.push({x:p.x-20,y:p.y-20,depth:p.y+8,sprite:this.art.car(car.kind,p.dir)});}
   if(this.walk&&!this.storyFrame?.airborne)nodes.push({x:this.player.x-10,y:this.player.y-27,depth:this.player.y,sprite:heroSprite(this.art,'frat',this.player.moving?Math.floor(t*8)%4:0,this.player.dir),scale:.65,avatar:true});
   nodes.sort((a,b)=>a.depth-b.depth);
   for(const n of nodes){if(n.avatar){rect(c,n.x+3,n.y+27,15,3,'#0b091f44');}
     if(n.type==='house'&&this.walk&&this.player.y<n.lot.house.y&&this.player.y>n.lot.y+75&&Math.abs(this.player.x-n.lot.house.x)<n.lot.house.w*.5){c.globalAlpha=.35;c.drawImage(n.sprite,Math.round(n.x),Math.round(n.y));c.globalAlpha=1;}else c.drawImage(n.sprite,Math.round(n.x),Math.round(n.y),Math.round(n.sprite.width*(n.scale||1)),Math.round(n.sprite.height*(n.scale||1)));
     if(n.type==='house'&&view.step>1&&view.step<=3){
       // Re-letter the cloth at the display grid rather than shrinking glyphs.
       const l=n.lot,banner=houseBanner(l.house),bw=banner.width,left=banner.x;
       c.save();c.setTransform(1,0,0,1,0,0);
       const x=Math.round((left+20-vx)/view.step),y=Math.round((banner.y+2-vy)/view.step),width=Math.floor((bw-21)/view.step);
       rect(c,x,y,width,Math.max(5,Math.round(12/view.step)),BRAND.navy);
       tinyText(c,letters(l.chapter),x+Math.floor(width/2),y,BRAND.pale);c.restore();
     }
     if(n.person?.role==='bike'){const vert=n.person.walk.vertical,bx=n.x+6,by=n.y+16;if(vert){rect(c,bx-1,by-6,3,5,'#3f4b59');rect(c,bx-1,by+5,3,5,'#3f4b59');line(c,bx,by-2,bx,by+5,'#cfb384');}else{for(const xx of [bx-6,bx+6]){rect(c,xx-2,by,5,3,'#3f4b59');}line(c,bx-4,by+1,bx+4,by+1,'#cfb384');}}
     if(n.person?.role==='dog'){const d=n.pose.dir,ox=d===1?-10:d===3?14:7,oy=d===0?12:d===2?-2:12;rect(c,n.x+ox,n.y+oy+4,8,4,'#c99c6d');rect(c,n.x+ox+(d===3?-2:6),n.y+oy+1,4,4,'#c99c6d');rect(c,n.x+ox+(d===3?-2:8),n.y+oy+2,1,1,'#3b2c24');line(c,n.x+7,n.y+10,n.x+ox+3,n.y+oy+4,'#5d5955');}
   }
   this.stadiumLife(c,t,seen);this.courtLife(c,t,seen);this.helipadLife(c,t,seen,view);this.campusLife(c,t,seen);
   this.board(c,t,seen);
   const sb=this.world.sites.banner;if(seen(sb.x,sb.y,76,72))c.drawImage(this.art.streetBanner(),sb.x,sb.y);
   if(!this.night)this.cloudShadows(c,t,vx,vy,vw,vh);
   if(this.night){rect(c,vx,vy,vw+2,vh+2,'#10143f99');this.nightLights(c,t,seen);}
   this.blimp(c,t,seen);this.money(c,t,seen);this.parachutes(c,t,seen);
   if(this.storyFrame)drawLanding(c,this.art,this.player,this.storyFrame,t,view);
   if(this.questMarker){const p=this.questMarker,hop=Math.floor(Math.sin(t*4)*2);rect(c,p.x-8,p.y-37+hop,17,18,BRAND.ink);rect(c,p.x-7,p.y-36+hop,15,16,BRAND.blue);rect(c,p.x-7,p.y-36+hop,15,2,BRAND.light);text(c,'!',p.x-2,p.y-32+hop,BRAND.white);poly(c,[[p.x-4,p.y-20+hop],[p.x+1,p.y-15+hop],[p.x+6,p.y-20+hop]],BRAND.blue);}
   c.restore();
   // Draw labels after the world, at one native font pixel per display cell.
   // This keeps Greek letters readable while the scenery uses a coarser grid.
   if(this.labels&&view.step<=4)for(const l of this.world.lots){
     if(!seen(l.x,l.y,176,248))continue;
     const selected=l.id===this.selected,hovered=this.hover?.id===l.id;
     if(!selected&&!hovered&&view.step>2)continue;
     const sx=Math.round((l.x+88-vx)/view.step),sy=Math.round((l.y+91-vy)/view.step),label='#'+l.rank+' '+letters(l.chapter),width=label.length*4+4;
     rect(c,sx-Math.floor(width/2)-1,sy-2,width+2,9,BRAND.ink);rect(c,sx-Math.floor(width/2),sy-3,width,8,selected?BRAND.blue:'#2a2f52');rect(c,sx-Math.floor(width/2),sy-3,width,1,selected?BRAND.light:'#5a6390');
     tinyText(c,label,sx,sy-1,BRAND.pale);
   }
   if(this.walk&&!this.storyFrame)tinyText(c,'YOU',Math.round((this.player.x-vx)/view.step),Math.round((this.player.y-vy-32)/view.step)-5,BRAND.pale);
   this.output.imageSmoothingEnabled=false;
   this.output.drawImage(this.frame,0,0,this.viewport.width,this.viewport.height);
   this.renderStats={visiblePeople:drawn,worldPeople:this.world.people.length,visibleNodes:nodes.length,pixelSize:this.viewport.pixel/this.viewport.dpr,worldGrid:view.step,cars:this.cars.length};
 }
 fountain(c,t,seen){const f=this.world.sites.fountain;if(!seen(f.x-40,f.y-50,80,80))return;
   for(let i=0;i<12;i++){const a=i/12*Math.PI*2+t*.4,r=8+((t*14+i*5)%16);rect(c,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r*.7,2,1,'#a9f2e4');}
   for(let i=0;i<10;i++){const u=((t*1.6+i/10)%1),a=i/10*Math.PI*2,x=f.x+Math.cos(a)*u*18,y=f.y-4-Math.sin(u*Math.PI)*16+Math.sin(a)*u*8;rect(c,x,y,2,2,i%2?'#e6fffa':'#9ff0e4');}
   rect(c,f.x-1,f.y-22,3,18,'#d8fff6');
 }
 stadiumLife(c,t,seen){const l=this.landmark('stadium');if(!seen(l.x-30,l.y-45,l.w+60,l.h+60))return;
   const s=footballState(t),cx=l.x+l.w/2,cy=l.y+l.h/2;
   for(let i=0;i<22;i++){const p=footballPlayer(i,t),x=cx+p.z*3.3,y=cy+p.x*3.1;rect(c,x-3,y-3,7,2,p.team?'#c43f4c':BRAND.blue);rect(c,x-2,y-1,5,3,p.team?'#c43f4c':BRAND.blue);rect(c,x-2,y-7,5,4,p.team?'#c43f4c':'#f2f4fa');rect(c,x-1,y-7,3,1,p.team?'#f4ead2':BRAND.blue);rect(c,x+2,y-5,1,2,'#a3a9b8');rect(c,x-2,y+2,2,3,'#f2f4fa');rect(c,x+1,y+2,2,3,'#f2f4fa');}
   const b=footballBall(t);rect(c,cx+b.z*3.3,cy+b.x*3.1-b.y*2,3,2,'#734b46');
   rect(c,l.x+l.w/2-75,l.y+l.h-9,150,15,BRAND.ink);text(c,`fomo ${s.home} - ${s.away} AWAY`,cx,l.y+l.h-5,BRAND.pale,1,'center');
   if(s.phase==='TOUCHDOWN'){rect(c,cx-44,cy-7,88,17,BRAND.ink);rect(c,cx-43,cy-6,86,15,BRAND.blue);text(c,'TOUCHDOWN!',cx,cy-2,BRAND.white,1,'center');}
   for(let i=0;i<50;i++){const yy=i%2?l.y+30:l.y+l.h-32;rect(c,l.x+24+i*7,yy+(Math.floor(t*3+i)%2)*2,2,2,'#e2c3ae');}
 }
 courtLife(c,t,seen){const s=this.world.sites.court;if(!seen(s.x-20,s.y-30,s.w+40,s.h+60))return;
   const cx=s.x+s.w/2,cy=s.y+s.h/2;
   for(let i=0;i<6;i++){const team=i%2,x=cx+(team?60:-60)*.4+Math.sin(t*.7+i*2.1)*90,y=cy+Math.cos(t*.9+i*1.7)*30;c.drawImage(this.art.person({role:'player',skin:i%6,color:team?'#e9e6dc':BRAND.blue,hair:i%5},Math.floor(t*7+i)%4,Math.sin(t*.7+i*2.1)>0?1:3),Math.round(x)-9,Math.round(y)-20);}
   const shot=(t%5.2)/5.2,side=Math.floor(t/5.2)%2,hx=side?s.x+s.w-19:s.x+19,sx=cx+(side?40:-40);
   const bx=sx+(hx-sx)*shot,by=cy-Math.sin(shot*Math.PI)*34+(shot>.92?(shot-.92)*80:0);rect(c,bx-2,by-2,4,4,'#d8742f');rect(c,bx-1,by-2,1,4,'#5b2d18');
 }
 helipadLife(c,t,seen,view){const l=this.landmark('helipad');if(!seen(l.x-150,l.y-500,l.w+300,l.h+800))return;
   const s=helipadState(t*1.15),cx=l.x+174,cy=l.y+118;
   rect(c,l.x-40,cy+1,205*s.carpetProgress,12,'#b13864');if(s.carpetProgress>0)rect(c,l.x-40,cy+2,205*s.carpetProgress,1,'#f9879a');
   // The Maybach arrives up the west drive from the south and leaves north.
   const carx=cx+s.carX*5.5,cary=cy+(s.carZ>0?s.carZ*8.1:s.carZ*16.9);
   if(cary>290&&cary<1410){c.drawImage(this.art.maybach(3),Math.round(carx)-28,Math.round(cary)-28);if(s.doors>.4){rect(c,carx+9,cary-8,8,2,'#c4c7cf');rect(c,carx+9,cary+4,8,2,'#c4c7cf');}}
   for(let i=0;i<48;i++){
     const fan=helipadFanPose(i,t*1.15),px=cx+fan.x*4.4,py=cy+fan.z*2.4-fan.hop*8;
     c.drawImage(this.art.person({role:'fan',skin:i%6,hair:i%5,shirt:i%9},fan.moving?Math.floor(fan.phase)%4:0,2),Math.round(px)-7,Math.round(py)-17,14,19);
     if(fan.phoneRaise>.4)rect(c,px+5,py-9-fan.phoneRaise*7,2,4,'#41495b');
     if(fan.wave>.4)rect(c,px-7,py-13,2,6,'#e3b791');
     if(fan.flash){rect(c,px+5,py-15,4,4,'#fff1d0');}
   }
   if(s.driver.visible){const x=cx+s.driver.x*5.5,y=cy+s.driver.z*2.5;c.drawImage(this.art.person({role:'chef',skin:2,hair:3,color:'#22232c'},s.driver.walking?Math.floor(t*6)%4:0,1),Math.round(x)-9,Math.round(y)-22);}
   s.guests.forEach((p,i)=>{if(!p.visible)return;const x=cx+p.x*5.5,y=cy+p.z*2.5,who=i?'orangie':'rasmr';c.drawImage(this.art.vip(who,p.walking?Math.floor(t*6)%4:0,p.walking?1:2),Math.round(x)-10,Math.round(y)-25);
     if(view.step<=1){const name=who.toUpperCase(),w=name.length*6+3;rect(c,x-w/2,y-36,w,10,BRAND.ink);text(c,name,x,y-34,BRAND.pale,1,'center');}});
   const h=s.helicopter,x=cx+h.x*4,y=cy+h.z*2-h.y*2;
   c.globalAlpha=.2+(1-h.y/36)*.2;rect(c,x-29,cy+h.z*2-6,60,17,'#30384c');c.globalAlpha=1;
   this.helicopter(c,x,y,t,s.rotor,s.cabin);
   if(view.step<=1)text(c,s.phase,cx,l.y+l.h+8,'#3f4458',1,'center');
 }
 helicopter(c,x,y,t,rotor,cabin){
   c.save();c.translate(Math.round(x),Math.round(y));
   rect(c,-20,11,47,3,'#40445a');rect(c,-19,13,45,2,'#c5c5be');rect(c,-16,4,3,10,'#727b83');rect(c,18,4,3,10,'#727b83');
   rect(c,-46,-5,27,6,'#2c3566');poly(c,[[-50,-11],[-36,-5],[-37,1],[-50,8]],BRAND.blue);rect(c,-44,-14,3,22,'#3a3f52');
   rect(c,-22,-16,48,30,BRAND.ink);rect(c,-20,-15,44,28,'#2c3566');rect(c,-20,-15,44,4,'#3d4a8a');rect(c,-20,1,44,4,BRAND.blue);
   rect(c,10,-13,14,20,'#9fd3e6');rect(c,11,-12,5,7,'#e3f6fb');rect(c,22,-10,3,14,'#6aa8c1');
   fomo(c,-14,-12,17,BRAND.pale);
   if(cabin>.4)rect(c,-8,2,12,11,'#151a33');
   c.save();c.translate(2,-1);c.rotate(t*(.4+rotor*30));rect(c,-50,-1,100,2,'#3e4859');rect(c,-1,-40,2,80,'#647187');rect(c,-3,-3,6,6,'#c2b7a8');c.restore();
   c.restore();
 }
 board(c,t,seen){const l=this.landmark('leaderboard');if(!seen(l.x,l.y-40,140,200))return;
   const x=l.x+17,y=l.y-22;
   rect(c,x+4,y+7,67,112,'#2d3a4a55');rect(c,x,y,65,113,'#b9b4c2');rect(c,x+2,y+2,61,108,'#e4e1ea');rect(c,x+4,y+4,57,104,BRAND.ink);rect(c,x+23,y+5,20,3,'#000');
   text(c,'GREEK',x+32,y+15,BRAND.pale,1,'center');text(c,'WARS',x+32,y+25,BRAND.light,1,'center');
   const rows=this.world.visible.slice(0,10),offset=Math.floor(t/3.2)%Math.max(1,rows.length-4);
   rows.slice(offset,offset+5).forEach((r,i)=>{const yy=y+39+i*12;rect(c,x+7,yy-2,51,11,i%2?'#14123a':'#1d1a52');text(c,String(r.rank),x+9,yy,BRAND.light);text(c,letters(r),x+23,yy,BRAND.pale);text(c,String(r.joined),x+55,yy,BRAND.white,1,'right');});
   text(c,'MEMBERS',x+32,y+101,BRAND.muted,1,'center');
   // Population sign includes the complete roster, including pre-house chapters.
   const p=this.world.sites.population,total=this.world.chapters.reduce((a,b)=>a+b.joined,0);rect(c,p.x,p.y,147,22,BRAND.navy);rect(c,p.x,p.y,147,1,BRAND.light);text(c,`${total} MEMBERS`,p.x+7,p.y+4,BRAND.pale);text(c,`${this.world.chapters.length} CHAPTERS`,p.x+7,p.y+13,BRAND.light);
 }
 campusLife(c,t,seen){const S=this.world.sites;
   const pt=S.patio;for(let i=0;i<12;i++){const x=pt.x+30+(i%3)*49+(i%2?10:-10),y=pt.y+18+Math.floor(i/3)*9;if(seen(x,y,25,25))c.drawImage(this.art.person({role:'chat',skin:i%6,shirt:i%9,hair:i%5}),x-9,y-22);}
   for(const tr of this.world.foodTrucks){if(!seen(tr.x-60,tr.y-20,120,90))continue;c.drawImage(this.art.person({role:'chef',skin:(tr.x>>3)%6,hair:2,color:'#f4f1e8'},0,2),tr.x-24,tr.y-38,14,19);for(let i=0;i<3;i++){const qx=tr.x-14+i*10,qy=tr.y+16+(i%2);c.drawImage(this.art.person({role:'walk',skin:(i+tr.x)%6,shirt:(i*4+tr.y)%9,hair:i%5},0,0),qx-9,qy-22);}}
   const I=S.intramural;if(seen(I.x,I.y,I.w,I.h)){for(let i=0;i<8;i++){const x=I.x+I.w/2+Math.sin(t*.5+i*1.3)*140,y=I.y+I.h/2+Math.cos(t*.6+i*.9)*70;c.drawImage(this.art.person({role:'player',skin:i%6,color:i%2?'#e0b25a':'#35b7b1',hair:i%5},Math.floor(t*6+i)%4,2),Math.round(x)-9,Math.round(y)-22);}rect(c,I.x+I.w/2+Math.sin(t*.8)*150,I.y+I.h/2+Math.cos(t*1.1)*60,3,3,'#f4f4f0');}
   const G=S.garden;if(seen(G.x,G.y,G.w,G.h))for(let i=0;i<3;i++){const x=G.x+40+i*120+Math.sin(t*.3+i)*20,y=G.y+46+i*30;c.drawImage(this.art.person({role:'walk',skin:i+1,shirt:7,hair:i},Math.floor(t*2+i)%2,2),x-9,y-22);}
   // The quad: students crossing the paths and a few reading on the benches.
   const F=S.fountain,B=S.bonfire;if(seen(F.x-200,F.y-180,400,420)){
     for(let i=0;i<6;i++){const u=((t*(.035+i*.006)+i*.37)%2),v=u<1?u:2-u,horiz=i%2,x=horiz?F.x-190+v*380:F.x+(i%3-1)*4,y=horiz?F.y+(i%3-1)*4:F.y-150+v*300;if(Math.hypot(x-F.x,y-F.y)<60)continue;c.drawImage(this.art.person({role:'walk',skin:(i*5)%6,shirt:(i*2+1)%9,hair:i%5},Math.floor(t*6+i)%4,horiz?(u<1?1:3):(u<1?2:0)),Math.round(x)-9,Math.round(y)-22);}
     for(const [dx,dy,k] of [[-44,-40,0],[44,-40,1],[-44,28,2],[44,28,3]]){c.drawImage(this.art.person({role:'chat',skin:(k+3)%6,shirt:(k*4+2)%9,hair:(k+1)%5},0,2),B.x+dx-9,B.y+dy-24);}}
   const sc=S.social;if(seen(sc.x,sc.y,sc.w,sc.h)){rect(c,sc.x+70+Math.sin(t)*85,sc.y+80-Math.abs(Math.sin(t*2))*14,6,2,'#efd7a2');for(let i=0;i<5;i++){const x=sc.x+40+i*64,y=sc.y+60+(i%2)*60;c.drawImage(this.art.person({role:'chat',skin:(i+2)%6,shirt:(i*3)%9,hair:i%5}),x-9,y-22);}}
 }
 cloudShadows(c,t,vx,vy,vw,vh){
   for(let i=0;i<7;i++){const w=this.world.width+700,x=((hash(i,'cx')*w+t*(5+i%3))%w)-350,y=hash(i,'cy')*(this.world.height-200)+60;
     if(x+300<vx||x>vx+vw||y+160<vy||y>vy+vh)continue;
     const s=this.art.cached('cloud'+i,300,160,g=>{for(let k=0;k<5;k++)disc(g,60+hash(i,k,'a')*180,60+hash(i,k,'b')*40,40+hash(i,k,'r')*36,'#1e2a52',22+hash(i,k,'q')*16);});
     c.globalAlpha=.09;c.drawImage(s,Math.round(x),Math.round(y));c.globalAlpha=1;}
 }
 nightLights(c,t,seen){
   for(const lamp of this.world.furniture.filter(x=>x.type==='lamp')){if(!seen(lamp.x-20,lamp.y-50,55,80))continue;
     poly(c,[[lamp.x-2,lamp.y-28],[lamp.x+3,lamp.y-28],[lamp.x+23,lamp.y+12],[lamp.x-20,lamp.y+12]],'#ffc78119');
     rect(c,lamp.x-13,lamp.y-2,29,11,'#ffd28516');rect(c,lamp.x,lamp.y-28,2,30,'#737080');rect(c,lamp.x-3,lamp.y-31,8,7,'#efb967');rect(c,lamp.x-2,lamp.y-30,5,4,'#fff2b3');
   }
   for(const car of this.cars){const p=loopPoint(this.loops[car.loop],car.s);if(!seen(p.x-30,p.y-30,60,60))continue;const fx=p.x+p.hx*16,fy=p.y+p.hy*16;poly(c,p.hx?[[fx,fy-5],[fx+p.hx*26,fy-9],[fx+p.hx*26,fy+9],[fx,fy+5]]:[[fx-5,fy],[fx-9,fy+p.hy*26],[fx+9,fy+p.hy*26],[fx+5,fy]],'#fff2b322');}
   for(const l of this.world.lots){if(!seen(l.x,l.y,176,248))continue;
     const w=l.house.w,wallH=Math.round(l.house.h*.47),windows=Math.max(4,Math.floor(w/23)),wh=Math.min(12,(wallH-10)/2),left=l.house.x-w/2;
     for(let f=0;f<2;f++)for(let i=0;i<windows;i++){
       if(f===1&&Math.abs(i-(windows-1)/2)<.6)continue;
       const xx=left+8+i*(w-25)/(windows-1),yy=l.house.y-wallH+9+f*(wallH-10)/2;
       rect(c,xx+1,yy+1,7,wh-2,hash(l.id,f,i)>.7?'#ce8ebc':'#f5be6e');rect(c,xx+2,yy+2,2,wh-4,'#ffe4a1');rect(c,xx+4,yy+1,1,wh-2,'#a27376');rect(c,xx+1,yy+Math.floor(wh/2),7,1,'#a27376');
     }
     if(l.pool){rect(c,l.x+18,l.y+27,84,40,'#39d6d061');rect(c,l.x+21,l.y+62,79,2,'#7af4de');for(const xx of [24,95])rect(c,l.x+xx,l.y+33,2,27,'#a6f9ed99');}
     for(let i=0;i<11;i++){const xx=l.x+20+i*13,yy=l.y+213+Math.sin(i/10*Math.PI)*6;rect(c,xx-2,yy-2,6,7,i%3===0?'#f86daa20':'#ffc77d24');rect(c,xx,yy,2,3,i%3===0?'#ff9bbb':'#ffdfa1');}
     rect(c,l.x+72,l.y+221,5,2,Math.floor(t*3)%2?BRAND.light:'#76c9ff');
     rect(c,l.house.x-8,l.house.y+11,18,6,'#ffc28138');
   }
   const s=this.landmark('stadium');if(seen(s.x,s.y-80,400,380))for(let j=0;j<3;j++){
     const cycle=(t+j*1.8)%5;if(cycle>2)continue;const x=s.x+70+j*126,y=s.y-28-j%2*22;
     for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=cycle*26;rect(c,x+Math.cos(a)*r,y+Math.sin(a)*r+cycle*8,2,2,[BRAND.pale,BRAND.light,'#ff82c3'][j]);}
   }
   const b=this.world.sites.bonfire;if(seen(b.x-40,b.y-40,80,80)){const x=b.x,y=b.y;disc(c,x,y,34,'#ffb86918',16);rect(c,x-16,y-2,35,15,'#ffb86922');poly(c,[[x-8,y+1],[x-5,y-10],[x,y-21-Math.sin(t*10)*3],[x+4,y-11],[x+9,y+1]],'#ee8b57');poly(c,[[x-4,y],[x-1,y-8],[x+1,y-14-Math.sin(t*13)*2],[x+4,y-6],[x+5,y]],'#ffd36b');rect(c,x-2,y-6,5,7,'#fff1b5');
     for(let i=0;i<4;i++){const u=(t*.7+i/4)%1;rect(c,x+Math.sin(t*3+i)*6,y-20-u*40,1,1,'#ffcf8a');}}
   const fo=this.world.sites.fountain;if(seen(fo.x-40,fo.y-40,80,80)){disc(c,fo.x,fo.y,25,'#5ff0e033',18);}
 }
 blimp(c,t,seen){const x=180+(t%110)/110*(this.world.width-350),y=150+Math.sin(t/17)*24;this.blimpHit={x,y};if(!seen(x,y,110,110))return;
   c.globalAlpha=.16;rect(c,x+18,y+86,88,19,'#46596a');c.globalAlpha=1;
   poly(c,[[x,y+16],[x+14,y+6],[x+72,y+6],[x+97,y+17],[x+103,y+28],[x+83,y+37],[x+15,y+35],[x,y+26]],BRAND.blue);rect(c,x+12,y+10,65,6,'#7d91f8');rect(c,x+20,y+32,58,4,'#3446b8');poly(c,[[x+84,y+8],[x+101,y],[x+102,y+22]],'#7d91f8');poly(c,[[x+83,y+30],[x+99,y+43],[x+99,y+22]],'#3446b8');rect(c,x+32,y+38,25,6,BRAND.ink);rect(c,x+37,y+39,5,3,'#bfc5c5');
   // Separated fomo / Discord lockup: mark, divider, partner name.
   fomo(c,x+13,y+11,24,BRAND.white);rect(c,x+39,y+14,1,16,BRAND.pale);text(c,'DISCORD',x+43,y+18,BRAND.white);
 }
 money(c,t,seen){for(const lot of this.world.lots){const start=this.celebrations.get(lot.id);const opening=t<8,goal=start!==undefined&&t-start<20;if(!opening&&!goal)continue;if(!seen(lot.x,lot.y-100,176,360))continue;
   const age=goal?t-start:t;for(let i=0;i<18;i++){const px=lot.x+10+hash(lot.id,i,'money')*156+Math.sin(age+i)*6,py=lot.y-45+(age*35+i*18)%270;rect(c,px,py,5,3,i%2?'#d1dfac':'#b2c58d');rect(c,px+2,py+1,1,1,'#759170');}}
 }
 parachutes(c,t,seen){this.arrivals=this.arrivals.filter(a=>t-a.start<12);for(const a of this.arrivals){const age=t-a.start;if(age<0)continue;const lot=this.world.lots.find(l=>l.id===a.chapter);if(!lot)continue;
   const x=lot.x+22+(a.index%8)*18,y=lot.y+223-Math.max(0,1-age/9)*220;if(!seen(x-24,y-45,50,70))continue;
   if(age<9.65){const width=age<9?33:33*(1-(age-9)/.65);poly(c,[[x-width/2,y-25],[x-width/3,y-36],[x,y-40],[x+width/3,y-36],[x+width/2,y-25]],BRAND.light);rect(c,x-2,y-38,4,13,BRAND.pale);line(c,x-width/2,y-25,x-4,y-8,'#ede0c1');line(c,x+width/2,y-25,x+4,y-8,'#ede0c1');}
   c.drawImage(this.art.person({role:'walk',skin:a.index%6,shirt:a.index%9,hair:a.index%5},0,2),Math.round(x)-9,Math.round(y)-22);
 }}
 drawMinimap(canvas){if(!this.world)return;const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,s=Math.min(W/this.world.width,H/this.world.height),ox=(W-this.world.width*s)/2,oy=(H-this.world.height*s)/2;
   rect(c,0,0,W,H,BRAND.ink);c.save();c.translate(ox,oy);c.scale(s,s);rect(c,0,0,this.world.width,this.world.height,'#2f6b55');for(const r of this.world.roads)rect(c,r.x,r.y,r.w,r.h,'#5a5f80');for(const l of this.world.lots)rect(c,l.x,l.y,176,220,l.id===this.selected?BRAND.pale:['#55a4c4','#638880','#e39562','#4fb8a5','#a274bc'][l.size.style]);for(const l of this.world.landmarks)rect(c,l.x,l.y,l.w,l.h,l.id==='stadium'||l.id==='park'?'#87b66c':BRAND.light);rect(c,this.world.empty.x,this.world.empty.y,176,220,BRAND.blue);c.restore();
   const view=this.view(),vw=view.width*s,vh=view.height*s;c.strokeStyle=BRAND.pale;c.lineWidth=1;c.strokeRect(ox+view.x*s,oy+view.y*s,vw,vh);if(this.walk)rect(c,ox+this.player.x*s-1,oy+this.player.y*s-1,3,3,BRAND.white);
 }
}

const TINY={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['110','001','010','100','111'],'3':['110','001','010','001','110'],'4':['101','101','111','001','001'],'5':['111','100','110','001','110'],'6':['011','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','110'],'#':['101','111','101','111','101'],
 'Α':['010','101','111','101','101'],'Β':['110','101','110','101','110'],'Γ':['111','100','100','100','100'],'Δ':['010','010','101','101','111'],'Ε':['111','100','110','100','111'],'Ζ':['111','001','010','100','111'],'Η':['101','101','111','101','101'],'Θ':['111','101','111','101','111'],'Ι':['111','010','010','010','111'],'Κ':['101','101','110','101','101'],'Λ':['010','101','101','101','101'],'Μ':['101','111','111','101','101'],'Ν':['101','111','111','111','101'],'Ξ':['111','000','111','000','111'],'Ο':['111','101','101','101','111'],'Π':['111','101','101','101','101'],'Ρ':['110','101','110','100','100'],'Σ':['111','100','010','100','111'],'Τ':['111','010','010','010','010'],'Υ':['101','101','010','010','010'],'Φ':['010','111','111','111','010'],'Χ':['101','101','010','101','101'],'Ψ':['101','101','111','010','010'],'Ω':['111','101','101','010','111'],
 'Y':['101','101','010','010','010'],'O':['111','101','101','101','111'],'U':['101','101','101','101','111']
};
function tinyText(c,label,x,y,color){x=Math.round(x-(label.length*4-1)/2);for(const ch of label){const glyph=TINY[ch];if(glyph)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[row][col]==='1')rect(c,x+col,y+row,1,1,color);x+=4;}}
