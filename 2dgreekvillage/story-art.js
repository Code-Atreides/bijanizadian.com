import {rect,poly,line,text} from './pixel-art.js?v=8';

// Brand kit: campus purple is fomo blue #516AF6, lit with light blue #ACB8F9
// and lavender #EAEDFF, shaded toward ink #0B091F.
const P={ink:'#0B091F',deep:'#3346c2',purple:'#516AF6',light:'#ACB8F9',shine:'#EAEDFF',cream:'#fff2d4',skin:'#e6a77f',skinLight:'#ffd1a3',skinShade:'#b76b68',hair:'#362c44'};

// Original, editable 32 × 44 sprites. The mascot and campus avatar share a cap,
// violet silhouette and cream sneakers so the transformation reads instantly.
export function heroSprite(art,kind='mascot',frame=0,dir=2,air=false){
 return art.cached(`hero:${kind}:${frame}:${dir}:${air}`,32,44,c=>{
  const frat=kind==='frat',side=dir===1||dir===3,back=dir===0,step=frame===1?2:frame===3?-2:0;
  c.save();if(dir===3){c.translate(32,0);c.scale(-1,1);}
  const bodyY=air?21:22,skin=frat?P.skin:P.purple,face=frat?P.skinLight:P.light;
  // Sneakers, socks and shorts / mascot overalls.
  for(const [x,dy] of [[8,step],[19,-step]]){
   rect(c,x,31,7,9+(air?-2:dy),P.ink);rect(c,x+1,32,5,6+(air?-2:dy),frat?'#cc9e76':P.deep);
   rect(c,x+1,36+dy,5,3,P.cream);rect(c,x-2,39+dy,10,3,P.ink);rect(c,x-1,38+dy,8,3,P.cream);rect(c,x,38+dy,5,1,'#c5c5e8');
  }
  rect(c,7,bodyY,19,13,P.ink);rect(c,9,bodyY+1,15,11,P.purple);rect(c,10,bodyY+1,7,3,P.light);rect(c,21,bodyY+4,3,7,P.deep);
  rect(c,8,bodyY+10,17,2,frat?P.cream:P.deep);
  if(frat){rect(c,16,bodyY+2,1,9,P.cream);rect(c,11,bodyY+5,3,4,P.cream);rect(c,11,bodyY+5,5,1,P.cream);rect(c,11,bodyY+7,4,1,P.cream);rect(c,19,bodyY+6,1,1,P.shine);}
  else{rect(c,12,bodyY+5,3,4,P.cream);rect(c,19,bodyY+5,3,4,P.cream);rect(c,12,bodyY+5,1,2,P.ink);rect(c,19,bodyY+5,1,2,P.ink);}
  // Hand poses exaggerate the jump and the surprised sky fall.
  if(air){
   for(const x of [3,25]){rect(c,x,17,5,10,P.ink);rect(c,x+1,18,3,7,frat?P.cream:P.light);rect(c,x+1,15,3,5,skin);rect(c,x,15,4,2,face);}
  }else{
   rect(c,4,bodyY+1,5,10,P.ink);rect(c,5,bodyY+2,3,7,frat?P.cream:P.light);rect(c,5,bodyY+8,4,4,skin);
   rect(c,25,bodyY+2-step,4,9,P.ink);rect(c,25,bodyY+3-step,3,6,frat?P.cream:P.purple);rect(c,25,bodyY+8-step,4,4,face);
  }
  // Squared head silhouette and a five-tone purple baseball cap.
  rect(c,7,7,19,14,P.ink);rect(c,5,11,23,8,P.ink);rect(c,8,9,17,12,skin);rect(c,9,9,12,10,face);rect(c,11,20,12,2,frat?P.skinShade:P.deep);
  if(frat){rect(c,7,9,4,10,P.hair);rect(c,10,18,3,3,P.hair);rect(c,23,10,2,6,P.hair);}
  rect(c,8,3,16,7,P.ink);rect(c,5,6,23,5,P.ink);rect(c,9,2,13,2,P.ink);rect(c,9,4,14,5,P.purple);rect(c,7,7,18,3,P.purple);rect(c,10,4,9,2,P.light);rect(c,21,6,3,3,P.deep);
  rect(c,frat?3:12,9,frat?10:18,3,P.deep);rect(c,frat?3:13,9,frat?9:16,1,P.light);
  if(!back){
   rect(c,15,5,4,3,P.cream);rect(c,17,6,2,1,P.purple);
   if(frat){
    rect(c,side?20:13,12,3,1,P.hair);rect(c,side?20:13,14,2,3,P.ink);
    if(!side){rect(c,21,12,3,1,P.hair);rect(c,21,14,2,3,P.ink);}rect(c,side?25:18,16,3,2,P.skinShade);rect(c,17,19,5,1,P.cream);
   }else{
    for(const x of side?[20]:[12,21]){rect(c,x,12,5,7,P.cream);rect(c,x+3,14,2,4,P.ink);rect(c,x,12,2,2,'#fff');}
   }
  }else{rect(c,9,10,15,9,frat?P.hair:P.purple);rect(c,13,8,8,2,P.deep);rect(c,14,9,6,2,P.cream);}
  c.restore();
 });
}

export function aryaPortrait(art,talk=false){
 return art.cached('arya-cutout:'+talk,64,64,c=>{
  const ink='#201e28',hat='#17171d';
  // Transparent, waist-up character. Outstretched arms echo the reference;
  // there is no rectangular background, portrait border or jacket.
  poly(c,[[22,44],[16,44],[12,40],[8,35],[8,31],[3,31],[1,34],[2,39],[7,44],[13,50],[21,52]],ink);
  poly(c,[[21,46],[15,46],[10,41],[6,36],[6,33],[3,34],[4,38],[9,43],[15,48],[22,49]],P.skinLight);
  rect(c,13,47,9,2,P.skin);rect(c,3,33,3,2,'#ffe1b4');
  const wave=talk?1:0;
  poly(c,[[42,44],[48,44],[53,39-wave],[56,34-wave],[56,30-wave],[61,30-wave],[63,33-wave],[62,38-wave],[57,43],[51,50],[43,52]],ink);
  poly(c,[[42,46],[49,46],[55,39-wave],[59,35-wave],[59,32-wave],[61,33-wave],[60,37-wave],[55,42],[49,48],[42,49]],P.skinLight);
  rect(c,43,47,7,2,P.skin);rect(c,58,32-wave,3,2,'#ffe1b4');
  // Plain white tee: short sleeves, a ribbed collar and cool fold shadows.
  poly(c,[[24,42],[40,42],[47,46],[48,54],[44,55],[44,64],[19,64],[19,55],[16,53],[17,46]],ink);
  poly(c,[[23,45],[28,43],[37,43],[42,46],[45,48],[45,52],[41,53],[41,61],[22,61],[22,53],[19,52],[20,48]],'#fffdf7');
  rect(c,22,54,3,7,'#d5d5df');rect(c,39,52,2,9,'#c5c3d1');rect(c,25,59,14,2,'#ececf1');
  rect(c,23,44,18,3,'#c5c3d1');rect(c,25,43,14,4,ink);rect(c,27,42,10,5,P.skin);rect(c,28,44,8,2,P.skinLight);
  // Dark hair, warm face and simple expressive features.
  rect(c,19,16,28,22,ink);rect(c,22,36,23,5,ink);rect(c,26,40,15,2,ink);
  rect(c,20,23,28,9,P.skin);rect(c,23,19,21,18,P.skin);rect(c,25,20,17,17,P.skinLight);rect(c,26,37,14,2,P.skinShade);
  rect(c,20,20,4,15,'#493225');rect(c,22,30,3,7,'#493225');rect(c,43,20,3,12,'#493225');
  rect(c,26,25,4,1,'#593c34');rect(c,37,25,4,1,'#593c34');rect(c,27,28,3,3,ink);rect(c,38,28,3,3,ink);
  rect(c,33,30,2,3,P.skin);rect(c,29,35,10,talk?4:2,ink);rect(c,30,35,8,1,'#fffdf0');if(talk)rect(c,32,38,5,1,'#dc8382');
  // Black baseball cap, with stepped crown and a brim projecting right.
  poly(c,[[18,19],[18,13],[20,13],[20,9],[24,9],[24,6],[39,6],[39,8],[44,8],[44,12],[47,12],[47,16],[53,16],[53,20],[43,22],[21,22],[21,19]],ink);
  rect(c,22,11,22,7,hat);rect(c,25,8,13,10,hat);rect(c,20,15,26,4,hat);
  rect(c,25,9,12,2,'#3c3b45');rect(c,23,12,3,4,'#2e2c35');rect(c,36,12,1,5,'#30303a');
  rect(c,22,18,29,2,'#35333e');rect(c,28,20,15,1,'#121219');
 });
}

export function drawPipe(c,x,floor){
 const y=floor-51;
 rect(c,x-23,y+9,47,45,P.ink);rect(c,x-20,y+11,41,40,P.deep);rect(c,x-17,y+11,10,40,P.light);rect(c,x-6,y+11,19,40,P.purple);rect(c,x-15,y+11,3,40,P.shine);rect(c,x+16,y+12,4,39,'#2a3aa8');
 rect(c,x-28,y,57,17,P.ink);rect(c,x-26,y+2,53,12,P.purple);rect(c,x-24,y+2,47,3,P.shine);rect(c,x-24,y+5,7,8,P.light);rect(c,x+17,y+5,8,8,P.deep);rect(c,x-26,y+13,53,2,P.deep);
 rect(c,x-20,y-1,41,3,'#1d2050');rect(c,x-17,y-1,35,1,'#3a4bb8');
 for(const xx of [-13,6]){rect(c,x+xx,y+26,9,13,P.cream);rect(c,x+xx+5,y+30,4,7,P.deep);}
}

export function renderIntroScene(c,art,pose,ready=false){
 const W=c.canvas.width,H=c.canvas.height,{phase,time:t}=pose;
 rect(c,0,0,W,H,'#fff');
 // The pipe belongs to the offscreen world. Scrolling reveals it only after
 // the mascot sets off to the right; neither the pipe nor its shadow pops in.
 const pipeWorldX=W+56,cameraX=Math.round((pipeWorldX-Math.round(W*.74))*pose.walk);
 const floor=Math.round(H*.7),pipeX=pipeWorldX-cameraX,startX=Math.round(W*.29)-cameraX,endX=pipeX-61;
 let x=startX+(endX-startX)*pose.walk,y=floor,dir=phase==='lost'?(Math.floor(t*1.1)%2?3:2):1;
 if(phase==='jump'){const arc=Math.min(58,Math.max(22,floor-82));x=endX+(pipeX-endX)*pose.jump;y=floor-51*pose.jump-Math.sin(Math.PI*pose.jump)*arc;}
 if(['pipe','warp'].includes(phase)){x=pipeX;y=floor-51+pose.sink*49;dir=2;}
 const visible=t<8.35;
 // Ground is suggested by only two tiny contact shadows: the world is white.
 rect(c,startX-13,floor+2,29,2,'#eaedff');rect(c,pipeX-32,floor+2,66,3,'#e2e6fb');
 if(!ready)drawPipe(c,pipeX,floor);
 if(visible){
  rect(c,x-12,floor+1,25,2,'#eaedff');
  c.save();if(phase==='pipe'){c.beginPath();c.rect(0,0,W,floor-51);c.clip();}
  const sprite=heroSprite(art,'mascot',phase==='walk'?Math.floor(t*8)%4:0,dir,phase==='jump');
  c.drawImage(sprite,Math.round(x)-16,Math.round(y)-43);c.restore();
 }
 if(phase==='lost'||ready){text(c,'?',x+2,y-58-Math.floor(Math.sin(t*3)),P.purple,2,'center');}
 if(phase==='discover'){text(c,'!',x+4,y-62,P.purple,2,'center');}
 if(phase==='walk'&&Math.floor(t*9)%3===0){rect(c,x-24,floor-1,4,2,'#cbd3fb');rect(c,x-30,floor-4,3,2,'#e2e6fb');}
 if(phase==='warp'){
  const u=(t-8.35)/.75,r=Math.ceil(Math.max(W,H)*u*1.7);
  rect(c,pipeX-r,floor-51-r,r*2,r*2,P.purple);
  if(u>.2)text(c,'NEXT STOP',W/2,H*.42,P.shine,1,'center');
  if(u>.35)text(c,'GREEK VILLAGE',W/2,H*.5,P.cream,W>230?2:1,'center');
 }
}

export function drawLanding(c,art,player,pose,t,view){
 const {x,y}=player,age=pose.landAge;
 if(pose.airborne){
  const altitude=pose.altitude/320*(view?y-view.y+30:320),s=1-pose.altitude/340;
  rect(c,x-3-s*9,y-2,6+s*18,4,'#0b091f55');
  if(pose.altitude<235)for(let i=0;i<5;i++){const xx=x+(i-2)*7,yy=y-altitude-26-(i%3)*9;rect(c,xx,yy-12,1,8+(i%2)*8,P.shine);}
  const sprite=heroSprite(art,'frat',0,2,true);
  c.drawImage(sprite,Math.round(x-10),Math.round(y-27-altitude),21,29);
  if(pose.altitude>230){text(c,'!',x,y-altitude-38,P.shine,1,'center');}
  // A second pipe hangs from the top of the campus view: the transformed kid
  // comes out of its mouth before it retreats, making the portal connection clear.
  if(view&&pose.time<10.3){const py=view.y+12-Math.max(0,pose.time-9.55)*70;rect(c,x-17,py-64,35,64,P.ink);rect(c,x-15,py-64,30,64,P.purple);rect(c,x-12,py-64,5,64,P.light);rect(c,x+9,py-64,6,64,P.deep);rect(c,x-21,py-6,43,11,P.ink);rect(c,x-19,py-4,39,7,P.purple);rect(c,x-18,py-4,36,2,P.shine);rect(c,x-13,py+2,27,2,P.deep);}
 }else if(age<1.3){
  for(let i=0;i<8;i++){const a=i*Math.PI/4,r=5+age*25,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r*.3,s=Math.max(1,5-Math.floor(age*4));rect(c,xx-s,yy-s,s*2,s,'#e7d5bc');rect(c,xx-s+1,yy-s-1,s,1,'#fff4ce');}
  if(age>.3&&age<1.15)for(const i of [-1,1]){const xx=x+i*17,yy=y-35-Math.floor(Math.sin(age*6)*3);rect(c,xx,yy,1,5,'#ffe39b');rect(c,xx-2,yy+2,5,1,'#ffe39b');}
 }
}
