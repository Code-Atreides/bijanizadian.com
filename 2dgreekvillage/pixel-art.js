import {hash,letters,ROAD} from './world-model.js?v=10';
import {BRAND,EYES_PATHS,WORDMARK_PATHS,CAMPUS_MARK} from './brand.js?v=10';
export {BRAND};

// Deliberate value steps: cool ink, warm stone, jewel roofs and sunlit foliage.
// fomo surfaces use the brand kit: campus purple #516AF6 with lavender marks.
export const C={grass:'#52a55b',grass2:'#438a52',grass3:'#82bd63',ink:'#252b49',road:'#474a66',roadDark:'#3d4059',lane:'#e8c36b',pave:'#cfb68f',paveLight:'#f4dca8',border:'#69756a',purple:BRAND.blue,blue:BRAND.blue,cream:'#fff0cd',water:'#29cbd0',waterDark:'#13799c',zebra:'#efe6cf'};
const HOUSE_PALETTES=[
 {wall:'#efc88b',side:'#b98166',roof:'#347fb9',roofLight:'#67b7d3',roofDark:'#294273',trim:'#fff0c7'},
 {wall:'#cb705c',side:'#944b57',roof:'#325f68',roofLight:'#568e83',roofDark:'#29364f',trim:'#ffe2a8'},
 {wall:'#f1d6a2',side:'#be936f',roof:'#ca6849',roofLight:'#f39a55',roofDark:'#873e51',trim:'#fff4d0'},
 {wall:'#e8b58c',side:'#b47772',roof:'#278f96',roofLight:'#67c3b3',roofDark:'#284c6c',trim:'#fff0d1'},
 {wall:'#d8bdcd',side:'#947d9c',roof:'#764d9f',roofLight:'#ab75ba',roofDark:'#43305f',trim:'#ffe6b5'}
];
const CAR_COLORS=[BRAND.blue,'#e9e6dc','#c9505f','#2f3b55','#6fa79a','#e0b25a'];
// Keep the stitched banner on the roof as the house grows. The renderer uses
// the same anchor when lettering is redrawn at a coarser display scale.
export function houseBanner(house){
 const width=Math.min(house.w-19,68),roofH=house.h-Math.round(house.h*.47);
 return {x:house.x-width/2,y:house.y-house.h+Math.round(roofH*.27),width,height:17};
}
export function rect(c,x,y,w,h,col){
 c.fillStyle=col;
 if(!c.pixelRaster){c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));return;}
 const m=c.getTransform();
 if(Math.abs(m.b)<1e-9&&Math.abs(m.c)<1e-9){
   const x0=Math.round(m.a*x+m.e),y0=Math.round(m.d*y+m.f),x1=Math.round(m.a*(x+w)+m.e),y1=Math.round(m.d*(y+h)+m.f);
   c.save();c.setTransform(1,0,0,1,0,0);c.fillRect(x0,y0,x1-x0,y1-y0);c.restore();
 }else poly(c,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],col);
}
// Canvas path antialiasing adds blended edge pixels. Rasterize diagonals and
// rotated shapes directly on the final world grid instead.
export function poly(c,points,col){
 const m=c.getTransform(),p=points.map(([x,y])=>[Math.round(m.a*x+m.c*y+m.e),Math.round(m.b*x+m.d*y+m.f)]);
 c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=col;
 const min=Math.max(0,Math.min(...p.map(v=>v[1]))),max=Math.min(c.canvas.height,Math.max(...p.map(v=>v[1])));
 for(let y=min;y<max;y++){
   const scan=y+.5,hits=[];
   for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))hits.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
   hits.sort((a,b)=>a-b);
   for(let i=0;i+1<hits.length;i+=2){const x=Math.ceil(hits[i]-.5),end=Math.ceil(hits[i+1]-.5);c.fillRect(x,y,end-x,1);}
 }
 c.restore();
}
export function line(c,x,y,x2,y2,col,w=1){
 const m=c.getTransform();let ax=Math.round(m.a*x+m.c*y+m.e),ay=Math.round(m.b*x+m.d*y+m.f);const bx=Math.round(m.a*x2+m.c*y2+m.e),by=Math.round(m.b*x2+m.d*y2+m.f),width=Math.max(1,Math.round(w*Math.hypot(m.a,m.b)));
 const dx=Math.abs(bx-ax),dy=-Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;let error=dx+dy;
 c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=col;
 for(;;){c.fillRect(ax-Math.floor(width/2),ay-Math.floor(width/2),width,width);if(ax===bx&&ay===by)break;const e=error*2;if(e>=dy){error+=dy;ax+=sx;}if(e<=dx){error+=dx;ay+=sy;}}
 c.restore();
}
// Pixel ring: midpoint circle, so arcs stay crisp instead of antialiased.
export function ring(c,cx,cy,r,col,ry=r){for(let a=0;a<360;a+=Math.max(1,90/r)){const t=a*Math.PI/180;rect(c,Math.round(cx+Math.cos(t)*r),Math.round(cy+Math.sin(t)*ry),1,1,col);}}
export function disc(c,cx,cy,r,col,ry=r){for(let y=-ry;y<=ry;y++){const w=Math.round(r*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry))));rect(c,cx-w,cy+y,w*2+1,1,col);}}
export const FONT={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],0:['01110','10011','10101','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],2:['01110','10001','00001','00010','00100','01000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['00010','00110','01010','10010','11111','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110'],6:['01110','10000','10000','11110','10001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],8:['01110','10001','10001','01110','10001','10001','01110'],9:['01110','10001','10001','01111','00001','00001','01110'],'?':['01110','10001','00001','00010','00100','00000','00100'],'!':['00100','00100','00100','00100','00100','00000','00100'],'#':['01010','11111','01010','01010','11111','01010','00000'],'+':['00000','00100','00100','11111','00100','00100','00000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'.':['00000','00000','00000','00000','00000','00110','00110'],',':['00000','00000','00000','00000','00110','00100','01000'],':':['00000','00110','00110','00000','00110','00110','00000'],"'":['00100','00100','01000','00000','00000','00000','00000'],'/':['00001','00010','00010','00100','01000','01000','10000'],'$':['00100','01111','10100','01110','00101','11110','00100'],'&':['01100','10010','10100','01000','10101','10010','01101'],'%':['11001','11010','00010','00100','01000','01011','10011'],'×':['00000','10001','01010','00100','01010','10001','00000'],'→':['00000','00100','00010','11111','00010','00100','00000'],'←':['00000','00100','01000','11111','01000','00100','00000'],'↑':['00100','01110','10101','00100','00100','00100','00000'],'↓':['00000','00100','00100','00100','10101','01110','00100'],'♥':['00000','01010','11111','11111','01110','00100','00000'],'★':['00100','00100','11111','01110','01110','11011','00000'],'·':['00000','00000','00000','00100','00000','00000','00000'],'(':['00010','00100','01000','01000','01000','00100','00010'],')':['01000','00100','00010','00010','00010','00100','01000'],'Σ':['11111','10000','01000','00100','01000','10000','11111'],'Χ':['10001','10001','01010','00100','01010','10001','10001'],'Θ':['01110','10001','10001','11111','10001','10001','01110'],'Φ':['00100','01110','10101','10101','10101','01110','00100'],'Ψ':['10101','10101','10101','01110','00100','00100','00100'],'Δ':['00100','01010','01010','10001','10001','10001','11111'],'Λ':['00100','01010','01010','10001','10001','10001','10001'],'Π':['11111','10001','10001','10001','10001','10001','10001'],'Ω':['01110','10001','10001','10001','01010','01010','11011'],'Γ':['11111','10000','10000','10000','10000','10000','10000'],'Ξ':['11111','00000','00000','01110','00000','00000','11111'],
 // Lowercase is reserved for the brand name: "fomo" is never set in capitals.
 f:['00110','01000','01000','11110','01000','01000','01000'],o:['00000','00000','01110','10001','10001','10001','01110'],m:['00000','00000','11010','10101','10101','10101','10101']};
for(const [a,b] of Object.entries({'Α':'A','Β':'B','Ε':'E','Ζ':'Z','Η':'H','Ι':'I','Κ':'K','Μ':'M','Ν':'N','Ο':'O','Ρ':'P','Τ':'T','Υ':'Y'}))FONT[a]=FONT[b];
export const pixelCase=s=>String(s).toUpperCase().replace(/FOMO/g,'fomo');
export function textWidth(s,scale=1){return ([...pixelCase(s)].length*6-1)*scale;}
export function text(c,s,x,y,col=C.cream,scale=1,align='left'){
 s=[...pixelCase(s)];if(align==='center')x-=(s.length*6-1)*scale/2;
 if(align==='right')x-=(s.length*6-1)*scale;
 for(const ch of s){const g=FONT[ch];if(g)for(let iy=0;iy<7;iy++)for(let ix=0;ix<5;ix++)if(g[iy][ix]==='1')rect(c,x+ix*scale,y+iy*scale,scale,scale,col);x+=6*scale;}
}
// Brand marks are rasterized once per size and colour, then thresholded so
// every pixel is either fully inked or transparent: no blurred edge pixels,
// no recolouring, no distortion. Colours are restricted to approved pairings.
const MARKS=new Map();
function makeCanvas(w,h){if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);return null;}
function markSprite(kind,w,h,color,paint){
 const key=kind+w+'x'+h+color;if(MARKS.has(key))return MARKS.get(key);
 const cv=makeCanvas(w,h);if(!cv||typeof Path2D==='undefined'){MARKS.set(key,null);return null;}
 const g=cv.getContext('2d');g.fillStyle='#000';paint(g);
 const img=g.getImageData(0,0,w,h),d=img.data,r=parseInt(color.slice(1,3),16),gr=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
 for(let i=0;i<d.length;i+=4){const on=d[i+3]>=120;d[i]=r;d[i+1]=gr;d[i+2]=b;d[i+3]=on?255:0;}
 g.putImageData(img,0,0);MARKS.set(key,cv);return cv;
}
const approved=col=>[BRAND.pale,BRAND.white,BRAND.blue,BRAND.ink].includes(col)?col:BRAND.pale;
export function eyesSprite(size,color=BRAND.pale){size=Math.max(4,Math.round(size));return markSprite('eyes',size,size,approved(color),g=>{g.scale(size/100,size/100);for(const p of EYES_PATHS)g.fill(new Path2D(p));});}
export function wordmarkSprite(width,color=BRAND.pale){width=Math.max(12,Math.round(width));const h=Math.max(4,Math.round(width*24/75));return markSprite('word',width,h,approved(color),g=>{g.scale(width/75,h/24);for(const p of WORDMARK_PATHS)g.fill(new Path2D(p));});}
export function campusSprite(width,color=BRAND.pale){width=Math.max(16,Math.round(width));const h=Math.round(width*CAMPUS_MARK.height/CAMPUS_MARK.width);return markSprite('campus',width,h,approved(color),g=>{const s=width/CAMPUS_MARK.width,[k,tx,ty]=CAMPUS_MARK.transform;g.scale(s,s);g.translate(tx,ty);g.scale(k,k);g.fill(new Path2D(CAMPUS_MARK.path),'evenodd');});}
// Draws the eyes inside a size × size box (the symbol's original 100-unit box).
export function fomo(c,x,y,size,color=BRAND.pale){const s=eyesSprite(size,color);if(s)c.drawImage(s,Math.round(x),Math.round(y));}
export function shade(hex,k){const s=hex.replace('#','');return '#'+[0,2,4].map(i=>Math.min(255,Math.max(0,parseInt(s.slice(i,i+2),16)+k)).toString(16).padStart(2,'0')).join('');}
export class PixelArt{
 constructor(factory){this.factory=factory||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});this.cache=new Map();}
 canvas(w,h){return this.factory(Math.ceil(w),Math.ceil(h));}
 cached(key,w,h,fn){if(!this.cache.has(key)){const cv=this.canvas(w,h),c=cv.getContext('2d');c.imageSmoothingEnabled=false;fn(c,w,h);this.cache.set(key,cv);}return this.cache.get(key);}
 tree(kind,seed=0){return this.cached('tree'+kind+Math.floor(seed*8),48,64,c=>{
   poly(c,[[18,49],[38,47],[47,54],[41,61],[20,60],[9,55]],'#243a4d55');
   rect(c,20,36,7,23,'#443642');rect(c,21,37,3,20,'#ba8050');rect(c,20,53,2,4,'#edb473');
   if(kind==='pine'){
     for(let j=0;j<3;j++){const y=3+j*12,w=12+j*5;
       poly(c,[[23,y],[23-w,y+24],[23+w,y+24]],'#204655');
       poly(c,[[22,y+2],[25,y+20],[24-w,y+20]],j===0?'#8abc60':'#4a995c');
       poly(c,[[25,y+5],[24+w,y+22],[25,y+22]],'#2b725a');
       rect(c,19-w/3,y+18,w,2,'#63ac61');
     }
   }else{
     const warm=seed>.78,dark=warm?'#465645':'#24564f',mid=warm?'#81964f':'#34865a',light=warm?'#b6bd67':'#68b663',sun=warm?'#e4d078':'#a0d574';
     poly(c,[[16,5],[29,5],[29,8],[36,8],[36,13],[41,13],[41,20],[45,20],[45,34],[41,34],[41,42],[34,42],[34,47],[15,47],[15,43],[7,43],[7,37],[3,37],[3,22],[7,22],[7,14],[12,14],[12,8],[16,8]],dark);
     rect(c,8,20,29,19,mid);rect(c,13,11,22,29,mid);rect(c,17,7,11,33,mid);rect(c,35,22,7,12,mid);
     poly(c,[[15,10],[28,10],[28,14],[33,14],[33,23],[27,23],[27,27],[10,27],[10,18],[15,18]],light);
     rect(c,16,10,11,4,sun);rect(c,12,17,8,3,sun);rect(c,8,27,10,7,light);rect(c,7,28,5,3,sun);
     rect(c,18,31,9,6,light);rect(c,21,31,6,2,sun);rect(c,32,25,7,6,light);rect(c,27,40,7,3,mid);
     rect(c,10,39,5,2,mid);rect(c,32,35,5,2,mid);rect(c,30,15,3,3,light);
     if(seed>.93){for(const [x,y] of [[19,19],[29,30],[10,30]]){rect(c,x,y,3,3,'#e98768');rect(c,x,y,2,1,'#ffcf8b');}}
   }
 });}
 house(lot){const w=lot.house.w,h=lot.house.h,b=lot.identity,style=lot.size.style;
 return this.cached('house:'+lot.id+':'+w+':'+h,w+38,h+59,(c,W,H)=>{
   const x=14,y=H-24,wallH=Math.round(h*.47),roofH=h-wallH,p=HOUSE_PALETTES[style];
   const top=y-wallH-roofH,ink=C.ink;
   // The right-hand cast shadow and violet side wall establish a consistent sun.
   poly(c,[[x+w-12,top+18],[x+w+23,top+38],[x+w+23,y+17],[x+19,y+20],[x+2,y+6]],'#26365055');
   rect(c,x-4,y+1,w+11,12,ink);rect(c,x-3,y+1,w+8,5,'#a18e89');rect(c,x-3,y+1,w+7,2,'#ffe0a7');
   rect(c,x-1,y-wallH,w+2,wallH+2,ink);rect(c,x+1,y-wallH+2,w-11,wallH-3,p.wall);rect(c,x+w-10,y-wallH+2,10,wallH-3,p.side);
   rect(c,x+2,y-wallH+3,w-13,3,shade(p.side,-6));rect(c,x+w-12,y-wallH,2,wallH,shade(p.wall,16));
   if(style===1){for(let yy=y-wallH+6;yy<y-2;yy+=5)for(let xx=x+4+(Math.floor(yy/5)%2)*5;xx<x+w-13;xx+=10){rect(c,xx,yy,7,1,'#ea9475');rect(c,xx+7,yy+1,1,3,'#a45655');}}
   else for(let yy=y-wallH+9;yy<y-3;yy+=10)rect(c,x+2,yy,w-14,1,shade(p.wall,-12));
   for(const xx of [x+2,x+w-17])for(let yy=y-wallH+8;yy<y;yy+=8)rect(c,xx,yy,5,4,p.trim);
   const windows=Math.max(4,Math.floor(w/23)),floors=2,wh=Math.min(12,(wallH-10)/floors);
   for(let f=0;f<floors;f++)for(let i=0;i<windows;i++){
     if(f===floors-1&&Math.abs(i-(windows-1)/2)<.6)continue;
     const xx=x+8+i*(w-25)/(windows-1),yy=y-wallH+9+f*(wallH-10)/floors;
     rect(c,xx-2,yy-2,13,wh+5,shade(p.side,-18));rect(c,xx-1,yy-1,11,wh+2,p.trim);rect(c,xx+1,yy+1,7,wh-2,'#274461');
     rect(c,xx+1,yy+1,6,3,'#56a6ba');rect(c,xx+1,yy+4,2,wh-5,'#93d5cb');rect(c,xx+4,yy,1,wh,p.trim);rect(c,xx,yy+Math.floor(wh/2),9,1,p.trim);
     rect(c,xx-2,yy+wh+1,13,2,'#fff4cc');rect(c,xx-4,yy,2,wh,p.roofDark);rect(c,xx+11,yy,2,wh,p.roofDark);
     if(style===2){rect(c,xx,yy-2,9,2,p.trim);rect(c,xx+1,yy-3,7,1,p.trim);}
   }
   // Five roof silhouettes, with broad lit/shaded planes rather than a gray wash.
   poly(c,[[x-7,y-wallH-3],[x+10,top+3],[x+w-17,top+3],[x+w+6,y-wallH-3]],ink);
   poly(c,[[x-4,y-wallH-6],[x+13,top+6],[x+w-19,top+6],[x+w+2,y-wallH-6]],p.roof);
   poly(c,[[x+13,top+6],[x+23,top+7],[x+8,y-wallH-6],[x-4,y-wallH-6]],p.roofLight);
   poly(c,[[x+w-29,top+6],[x+w-19,top+6],[x+w+2,y-wallH-6],[x+w-13,y-wallH-6]],p.roofDark);
   for(let yy=top+12;yy<y-wallH-6;yy+=5){const inset=(y-wallH-yy)/roofH*16;
     rect(c,x+inset+2,yy,w-inset*2-15,1,shade(p.roof,15));
     for(let xx=x+inset+5;xx<x+w-inset-15;xx+=11)rect(c,xx+(Math.floor(yy/5)%2)*4,yy-3,1,2,shade(p.roof,-14));
   }
   rect(c,x+11,top+2,w-27,3,p.roofDark);rect(c,x+12,top+2,w-29,1,p.roofLight);
   rect(c,x-7,y-wallH-4,w+14,4,ink);rect(c,x-6,y-wallH-4,w+12,2,p.trim);rect(c,x-4,y-wallH,w+7,2,p.side);
   // Chimney with a sun-facing cap and an inset flue.
   rect(c,x+17,top-3,9,19,'#944f50');rect(c,x+17,top-3,5,17,'#d77e59');rect(c,x+15,top-5,13,4,p.trim);rect(c,x+18,top-4,7,2,ink);
   const dormer=(dx,yy,wide=17)=>{
     rect(c,x+dx-wide/2+3,yy+1,wide,16,p.roofDark);
     poly(c,[[x+dx-wide/2-3,yy],[x+dx,yy-12],[x+dx+wide/2+3,yy]],ink);
     poly(c,[[x+dx-wide/2,yy-1],[x+dx,yy-9],[x+dx+wide/2,yy-1]],p.trim);
     rect(c,x+dx-wide/2+1,yy,wide-2,13,p.wall);rect(c,x+dx-4,yy+2,8,10,ink);rect(c,x+dx-3,yy+3,6,7,'#5ab5c3');rect(c,x+dx,yy+3,1,8,p.trim);rect(c,x+dx-5,yy+12,10,2,p.trim);
   };
   if(style===0){dormer(w*.28,top+roofH*.56);dormer(w*.73,top+roofH*.56);}
   if(style===1){for(const dx of [w*.24,w*.5,w*.76])dormer(dx,top+roofH*.55,13);}
   if(style===2){rect(c,x+w-31,top+roofH*.6,18,11,p.wall);rect(c,x+w-28,top+roofH*.6+2,12,7,p.roofDark);rect(c,x+w-33,top+roofH*.6-2,23,3,p.trim);}
   if(style===3){dormer(w*.32,top+roofH*.48,25);dormer(w*.76,top+roofH*.64,15);}
   if(style===4){dormer(w*.5,top+roofH*.48,29);rect(c,x+8,y-wallH-7,5,10,p.trim);rect(c,x+w-9,y-wallH-7,5,10,p.trim);}
   // Roof cloth: fomo eyes on campus purple, a divider, then the chapter's own
   // letters on navy. The chapter colours trim the cloth but never sit behind
   // the fomo mark (partner marks stay separate).
   const banner=houseBanner({x:x+w/2,y,w,h}),bx=banner.x,by=banner.y,bw=banner.width;
   rect(c,bx+1,by+2,bw+2,17,'#0b091f55');
   rect(c,bx-1,by,bw+2,17,BRAND.ink);rect(c,bx,by,bw,15,BRAND.navy);rect(c,bx,by,19,15,BRAND.blue);
   rect(c,bx+20,by,bw-20,2,b.primary);rect(c,bx+20,by+13,bw-20,2,b.secondary);
   fomo(c,bx+3,by+1,13);text(c,letters(lot.chapter),bx+25,by+4,BRAND.pale);rect(c,bx+19,by,1,15,BRAND.ink);
   for(const xx of [bx-1,bx+bw-1]){rect(c,xx,by-1,2,3,ink);rect(c,xx,by-1,1,1,'#fff0cd');}
   const pw=Math.min(w-12,style===1?83:67),px=x+w/2-pw/2,py=y-wallH*.79;
   rect(c,px-10,y+11,pw+20,4,ink);rect(c,px-9,y+11,pw+18,2,'#b69f90');rect(c,px-6,y+7,pw+12,4,'#ddbe93');rect(c,px-6,y+7,pw+12,1,'#fff1c7');rect(c,px-3,y+3,pw+6,4,p.trim);
   rect(c,x+w/2-8,y-24,16,25,ink);rect(c,x+w/2-5,y-22,10,22,'#7a496b');rect(c,x+w/2-4,y-21,3,18,'#b96b77');rect(c,x+w/2+3,y-13,2,2,'#ffcf72');
   const count=style===1?6:4;
   for(let i=0;i<count;i++){const cx=px+3+i*(pw-6)/(count-1);rect(c,cx-2,py+7,6,y-py-4,'#827586');rect(c,cx-2,py+7,3,y-py-5,p.trim);rect(c,cx-4,py+4,9,3,'#fff5d6');rect(c,cx-4,y-2,9,4,'#f3d49f');rect(c,cx-4,y-2,9,1,'#fff5d6');}
   rect(c,px-5,py+4,pw+10,3,ink);rect(c,px-5,py,pw+10,5,p.trim);rect(c,px-5,py,pw+10,1,'#fff9de');
   if(style===1){for(let n=0;n<9;n++){rect(c,px+n*pw/8,py-6,2,6,p.trim);}rect(c,px-4,py-8,pw+8,2,p.trim);}
   else{poly(c,[[px-8,py],[px+pw/2,py-19],[px+pw+8,py]],ink);poly(c,[[px-5,py-2],[px+pw/2,py-16],[px+pw+5,py-2]],p.trim);poly(c,[[px+4,py-4],[px+pw/2,py-12],[px+pw-4,py-4]],'#c0a390');}
   text(c,letters(lot.chapter),x+w/2,py-2,ink,1,'center');
   for(const xx of [x-1,x+w-14]){rect(c,xx,y+5,15,6,'#755568');rect(c,xx+1,y+4,13,4,'#df9973');rect(c,xx,y,15,5,'#276453');rect(c,xx+2,y-3,10,5,'#75b866');rect(c,xx+4,y-3,3,2,'#b7d576');rect(c,xx+1,y+1,2,2,'#f3a17d');}
 });}
 person(p,frame=0,dir=2){const role=p.role||'walk',skin=['#efc4a0','#d5a179','#a57759','#805942','#edb5a5','#bd8c69'][p.skin??0],shirt=p.color||['#f6c55f','#647cdb','#e57787','#fff0d2','#35b7b1','#aa69bd','#365ca2','#95bc60','#f29959'][p.shirt??0],hair=['#493c3a','#816147','#d5b977','#262b37','#a36547'][p.hair??0];
 return this.cached(`p:${role}:${skin}:${shirt}:${hair}:${frame}:${dir}`,18,25,c=>{
   if(role==='swim'){rect(c,3,20,12,2,'#b2e9e0');rect(c,5,13,7,7,skin);rect(c,5,12,7,3,hair);rect(c,2+frame%2,21,14,1,'#8dddd8');return;}
   rect(c,4,22,11,2,'#283e5666');const step=frame%4===1?-1:frame%4===3?1:0,bob=frame%2===1?1:0;
   rect(c,6,17+bob,3,5+step,'#30334f');rect(c,10,17+bob,3,5-step,'#30334f');rect(c,5,21+step,4,2,'#f1e7cf');rect(c,10,21-step,4,2,'#f1e7cf');
   rect(c,5,10+bob,9,8,shirt);rect(c,5,16+bob,9,2,shade(shirt,-20));rect(c,3,11+bob,2,6+step,skin);rect(c,14,11+bob,2,6-step,skin);
   rect(c,6,4+bob,7,7,skin);rect(c,5,3+bob,8,3,hair);rect(c,5,5+bob,2,4,hair);rect(c,8,2+bob,4,2,hair);
   if(dir!==0){rect(c,dir===3?7:11,7+bob,1,1,'#352f3d');}else rect(c,6,5+bob,7,4,hair);
   if(role==='dance'&&frame%2===1){rect(c,2,6,2,7,skin);rect(c,15,6,2,7,skin);rect(c,1,5,3,2,skin);}
   if(role==='lounge'){rect(c,4,17,12,4,skin);rect(c,13,20,3,2,'#f1e7cf');}
   if(role==='chat'||role==='poolchat'){rect(c,14,14,2,3,'#bc5865');rect(c,14,13,2,1,'#eee3d1');}
   if(role==='visitor'&&p.seed>.5)rect(c,6,11,7,6,'#9d725b');
   if(role==='player'){rect(c,5,9+bob,9,2,'#fbf3d7');rect(c,8,11+bob,3,4,BRAND.blue);}
   if(role==='chef'){rect(c,6,1+bob,7,3,'#f4f1e8');rect(c,5,10+bob,9,8,'#f4f1e8');}
 });}
 // Rasmr and Orangie, as compact 32-bit likenesses (see helipad-references.md):
 // Rasmr — short dark hair, heavy brows, navy hoodie. Orangie — light-brown
 // curls, dark rectangular glasses, black graphic tee, fuller build.
 vip(who,frame=0,dir=2){return this.cached(`vip:${who}:${frame}:${dir}`,20,27,c=>{
   const o=who==='orangie',skin=o?'#f0c6a6':'#d2a27c',top=o?'#16161c':'#27325e',hair=o?'#a8743f':'#211b1f';
   const step=frame%4===1?-1:frame%4===3?1:0,bob=frame%2===1?1:0,wide=o?1:0;
   rect(c,4-wide,24,12+wide*2,2,'#283e5666');
   rect(c,6,18+bob,3,5+step,'#2a2c3a');rect(c,11,18+bob,3,5-step,'#2a2c3a');rect(c,5,22+step,4,2,'#f4f1e8');rect(c,11,22-step,4,2,'#f4f1e8');
   rect(c,5-wide,10+bob,10+wide*2,9,top);rect(c,5-wide,17+bob,10+wide*2,2,shade(top,-10));
   if(o){rect(c,8,12+bob,4,3,'#e8e4dc');}else{rect(c,7,10+bob,6,2,shade(top,18));rect(c,9,13+bob,2,4,'#e9e6dc');}
   rect(c,3-wide,11+bob,2,6+step,o?skin:top);rect(c,15+wide,11+bob,2,6-step,o?skin:top);rect(c,3-wide,16+bob+step,2,2,skin);rect(c,15+wide,16+bob-step,2,2,skin);
   rect(c,6,3+bob,8,8,skin);
   if(o){rect(c,5,1+bob,10,4,hair);rect(c,4,3+bob,2,4,hair);rect(c,14,3+bob,2,4,hair);for(const xx of [5,8,11,13])rect(c,xx,0+bob,2,2,hair);}
   else{rect(c,6,2+bob,8,3,hair);rect(c,5,3+bob,2,3,hair);rect(c,13,3+bob,1,2,hair);}
   if(dir!==0){
     if(o){rect(c,6,6+bob,8,1,'#141418');rect(c,6,6+bob,3,3,'#141418');rect(c,11,6+bob,3,3,'#141418');rect(c,7,7+bob,1,1,'#9fb3c8');rect(c,12,7+bob,1,1,'#9fb3c8');}
     else{rect(c,7,5+bob,2,1,hair);rect(c,11,5+bob,2,1,hair);rect(c,8,7+bob,1,1,'#2b2028');rect(c,11,7+bob,1,1,'#2b2028');rect(c,7,9+bob,6,1,shade(skin,-25));}
   }else rect(c,6,4+bob,8,5,hair);
 });}
 // Top-down vehicles face east, then rotate in quarter turns. Headlights sit
 // on the front corners and tail lights on the rear corners.
 car(kind=0,dir=0){return this.cached('car:'+kind+':'+dir,40,40,c=>{
   const col=CAR_COLORS[kind%CAR_COLORS.length],ink='#151826',horiz=dir%2===0;
   if(horiz)rect(c,6,14,32,18,'#141a3044');else rect(c,13,7,18,32,'#141a3044');
   c.save();c.translate(20,20);c.rotate(dir*Math.PI/2);c.translate(-20,-20);
   rect(c,5,11,30,18,ink);rect(c,4,12,32,16,ink);rect(c,5,12,30,16,col);
   rect(c,5,25,30,3,shade(col,-34));rect(c,6,12,28,2,shade(col,30));rect(c,28,16,6,1,shade(col,22));rect(c,28,23,6,1,shade(col,-16));
   rect(c,22,13,4,14,'#1b2640');rect(c,23,14,2,5,'#86b8cf');rect(c,12,13,10,14,shade(col,12));rect(c,12,13,10,1,shade(col,44));rect(c,9,14,3,12,'#1b2640');rect(c,10,15,1,3,'#86b8cf');
   rect(c,34,13,2,3,'#fff4c4');rect(c,34,24,2,3,'#fff4c4');rect(c,4,13,2,3,'#e0475f');rect(c,4,24,2,3,'#e0475f');
   rect(c,22,10,2,1,ink);rect(c,22,29,2,1,ink);for(const xx of [8,27])for(const yy of [10,29])rect(c,xx,yy,5,1,'#0e0f17');
   if(kind===0){const s=eyesSprite(12,BRAND.pale);if(s)c.drawImage(s,11,14);}
   c.restore();
 });}
 maybach(dir=3){return this.cached('maybach:'+dir,56,56,c=>{
   if(dir%2)rect(c,20,7,20,48,'#141a3044');else rect(c,7,22,48,20,'#141a3044');
   c.save();c.translate(28,28);c.rotate(dir*Math.PI/2);c.translate(-28,-28);
   const ink='#0d0e14',dark='#1a1b24',silver='#c4c7cf';
   rect(c,5,18,46,20,ink);rect(c,4,19,48,18,ink);rect(c,5,19,46,18,silver);rect(c,5,19,46,3,'#e7e9ee');rect(c,5,33,46,4,'#8d919b');
   rect(c,15,20,24,16,dark);rect(c,16,21,22,2,'#3a3c4a');rect(c,39,21,5,14,'#22283c');rect(c,40,22,2,5,'#7da6bd');rect(c,11,21,4,14,'#22283c');
   rect(c,45,22,5,12,'#9a9ea8');for(let y=23;y<33;y+=2)rect(c,50,y,1,1,'#f2f2f2');rect(c,50,20,2,3,'#fff6cf');rect(c,50,33,2,3,'#fff6cf');rect(c,4,20,2,3,'#b8283f');rect(c,4,33,2,3,'#b8283f');
   for(const xx of [10,38])for(const yy of [17,38])rect(c,xx,yy,7,1,'#08080c');
   c.restore();
 });}
 // Food trucks face the plaza (3/4 view, like the buildings).
 truck(t){return this.cached('truck:'+t.label,76,50,c=>{
   const ink=C.ink,col=t.color;
   rect(c,6,44,66,4,'#1d243f44');rect(c,4,10,58,32,ink);rect(c,60,18,13,24,ink);
   rect(c,5,11,56,30,col);rect(c,5,11,56,4,shade(col,30));rect(c,5,35,56,6,shade(col,-30));
   rect(c,61,19,11,22,shade(col,-12));rect(c,62,20,8,8,'#87bcd0');rect(c,62,20,8,2,'#cfe8ee');
   rect(c,12,18,36,13,'#2b2f45');rect(c,13,19,34,11,'#fff2cf');rect(c,13,19,34,3,'#ffd98e');
   rect(c,9,15,44,4,'#f4ead2');for(let i=0;i<11;i++)rect(c,9+i*4,15,2,4,shade(col,-20));
   rect(c,8,1,46,9,ink);rect(c,9,2,44,7,'#f7efdc');text(c,t.label,31,2,ink,1,'center');
   for(const xx of [14,52]){rect(c,xx-5,38,10,8,ink);rect(c,xx-3,40,6,4,'#6b6f80');}
   rect(c,46,32,9,3,'#f7efdc');
 });}
 building(b){return this.cached('building'+b.label,b.w+36,b.h+40,(c,W,H)=>{
   const x=12,y=H-12,w=b.w,h=b.h;
   poly(c,[[x+4,y+5],[x+w+20,y+5],[x+w+20,y-45],[x+17,y-56]],'#25355066');
   rect(c,x-1,y-54,w+2,57,C.ink);rect(c,x+2,y-52,w-11,53,b.color);rect(c,x+w-10,y-53,10,54,shade(b.color,-45));
   rect(c,x+2,y-52,w-12,3,'#8d737f');rect(c,x+1,y+1,w,3,'#fff0c0');
   for(let yy=y-43;yy<y-7;yy+=19)for(let xx=x+9;xx<x+w-15;xx+=20){rect(c,xx-1,yy-1,14,16,'#877287');rect(c,xx,yy,12,14,'#fff0c5');rect(c,xx+2,yy+2,8,10,'#2d5276');rect(c,xx+3,yy+2,2,9,'#80cbbf');rect(c,xx+2,yy+2,7,2,'#4aa5b4');rect(c,xx+5,yy+1,1,12,'#fff0c5');rect(c,xx-1,yy+14,14,2,'#ffe8b2');}
   poly(c,[[x-6,y-55],[x+11,y-h],[x+w-20,y-h],[x+w+5,y-55]],C.ink);
   poly(c,[[x-3,y-58],[x+14,y-h+4],[x+w-22,y-h+4],[x+w+1,y-58]],b.roof);
   for(let yy=y-h+8;yy<y-59;yy+=5){const n=(y-56-yy)/(h-54)*16;rect(c,x+n,yy,w-2*n-5,1,shade(b.roof,15));}
   poly(c,[[x+w-31,y-h+4],[x+w-22,y-h+4],[x+w+1,y-58],[x+w-13,y-58]],shade(b.roof,-31));
   poly(c,[[x+14,y-h+4],[x+22,y-h+4],[x+9,y-58],[x-3,y-58]],shade(b.roof,25));
   rect(c,x+12,y-h+1,w-33,2,shade(b.roof,42));rect(c,x-5,y-57,w+9,3,'#f9dfab');
   rect(c,x+w/2-9,y-21,18,23,'#454354');rect(c,x+w/2-6,y-19,5,19,'#77969d');rect(c,x+w/2+2,y-19,5,19,'#77969d');
   if(b.type==='library'){
     rect(c,x+w/2-45,y-49,90,7,'#eadeb9');poly(c,[[x+w/2-50,y-50],[x+w/2,y-77],[x+w/2+50,y-50]],'#e4d7b3');
     for(let i=0;i<6;i++){rect(c,x+w/2-40+i*15,y-43,6,44,'#e8dabc');rect(c,x+w/2-38+i*15,y-42,2,42,'#fcf1d1');}
     rect(c,x+w/2-48,y+2,96,4,'#cabb9d');rect(c,x+w/2-53,y+6,106,3,'#a6a68e');
   }
   if(b.type==='shop'){rect(c,x-2,y-32,w+3,11,shade(b.roof,-13));for(let i=0;i<w;i+=12)rect(c,x+i,y-32,6,11,'#dfcfaa');rect(c,x,y-6,w,4,'#c19e7b');}
   if(b.type==='hub'){
     // fomo / campus: lavender facade, campus-purple roof, white campus mark on purple.
     rect(c,x+w/2-30,y-h+12,60,40,BRAND.ink);rect(c,x+w/2-29,y-h+13,58,38,BRAND.blue);
     const s=campusSprite(48,BRAND.white);if(s)c.drawImage(s,Math.round(x+w/2-24),y-h+17);
     rect(c,x+4,y-30,w-16,6,BRAND.blue);rect(c,x+4,y-30,w-16,1,BRAND.light);
   }
   const label=b.label,tw=label.length*6+10;rect(c,x+w/2-tw/2,y-43,tw,13,b.type==='hub'?BRAND.ink:C.ink);text(c,label,x+w/2,y-40,b.type==='hub'?BRAND.pale:'#f6e6c3',1,'center');
 });}
 // The street banner hangs above traffic, so the renderer draws it after people.
 streetBanner(){return this.cached('street-banner',76,72,c=>{
   rect(c,1,8,3,62,'#5f5f6a');rect(c,2,8,1,62,'#9c9ca6');rect(c,68,8,3,62,'#5f5f6a');rect(c,69,8,1,62,'#9c9ca6');
   line(c,3,10,69,10,'#414954');rect(c,6,10,60,22,BRAND.ink);rect(c,7,11,58,20,BRAND.blue);rect(c,7,11,58,2,BRAND.light);
   fomo(c,10,12,18);text(c,'GREEK',47,13,BRAND.white,1,'center');text(c,'WARS',47,22,BRAND.white,1,'center');
   for(const xx of [8,63])rect(c,xx,31,1,4,BRAND.ink);
 });}
 ground(world){const c=this.canvas(world.width,world.height),g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const S=world.sites;
 rect(g,0,0,world.width,world.height,C.grass);
 for(let i=0;i<world.width*world.height/145;i++){
   const x=hash(i,'gx')*world.width,y=hash(i,'gy')*world.height;rect(g,x,y,2+hash(i,'gw')*5,1,i%3?C.grass2:C.grass3);
   if(i%97===0)rect(g,x,y-1,1,1,i%2?'#f7d9e4':'#fff3b8');
 }
 this.roads(g,world);
 for(const lot of world.lots)this.lotGround(g,lot);
 for(const v of world.vacant)this.vacantLot(g,v);
 this.claim(g,world.empty);
 // Academic terrace, stepped levels and a continuous accessible side ramp.
 const tr=S.terrace;rect(g,tr.x,tr.y+5,tr.w,tr.h,'#6c8066');rect(g,tr.x+3,tr.y,tr.w-6,tr.h,'#a2aa8e');rect(g,tr.x+10,tr.y+1,tr.w-20,tr.h-6,'#bbbba0');
 for(let i=0;i<8;i++)rect(g,tr.x+117-i*2,tr.y+146+i*4,54+i*4,3,i%2?'#b9b69d':'#d9cfb5');
 const by={stadium:0};for(const l of world.landmarks)by[l.id]=l;
 this.parking(g,S.parking,world.parked);
 this.stadium(g,by.stadium);
 this.basketball(g,S.court);
 this.helipad(g,by.helipad);
 this.plaza(g,S.trucks);
 this.park(g,by.park);
 this.trophyGround(g,2140,378);
 this.intramural(g,S.intramural);this.social(g,S.social);this.garden(g,S.garden);this.quad(g,world);
 // Coffee patio, the back patio and the cottage laundry line.
 rect(g,S.patio.x,S.patio.y,S.patio.w,S.patio.h,'#c8b799');for(let i=0;i<3;i++)this.picnic(g,S.patio.x+30+i*49,S.patio.y+26);
 text(g,'CAMPUS COFFEE',S.patio.x+80,S.patio.y+60,C.ink,1,'center');
 const L=S.laundry;line(g,L.x,L.y,L.x+L.w,L.y,'#686b63');rect(g,L.x,L.y-7,3,29,'#a18464');rect(g,L.x+L.w-3,L.y-7,3,29,'#a18464');for(let i=0;i<8;i++)rect(g,L.x+10+i*23,L.y+1,11,15,['#d8c0a9','#409db8','#e97b86','#eaedff'][i%4]);
 for(const t of world.furniture){if(t.type==='bench')this.bench(g,t.x,t.y);}
 // Banner posts cast a shadow on the road; the cloth itself is drawn overhead.
 rect(g,S.banner.x+4,S.banner.y+66,3,3,'#2a2e4455');rect(g,S.banner.x+71,S.banner.y+66,3,3,'#2a2e4455');
 // Outer campus belt: a changing tree silhouette on the north and south edges.
 for(let x=100;x<world.width-50;x+=61){const t=this.tree(x%3?'tree':'pine',hash(x,'edge'));g.drawImage(t,x,3);}
 for(let x=60;x<world.width-30;x+=64)g.drawImage(this.tree(x%5?'tree':'pine',hash(x,'edge2')),x,world.height-64);
 this.campusDetails(g,world);
 return c;
 }
 roads(g,world){
   const V=world.roads.filter(r=>r.vertical),H=world.roads.filter(r=>!r.vertical);
   // Sidewalks first, then asphalt, so every corner joins cleanly.
   for(const r of world.roads){rect(g,r.x-12,r.y-12,r.w+24,r.h+24,C.border);}
   for(const r of world.roads){rect(g,r.x-10,r.y-10,r.w+20,r.h+20,C.pave);
     if(r.vertical)for(let y=r.y-10;y<r.y+r.h+10;y+=12){rect(g,r.x-10,y,9,1,'#b9a27f');rect(g,r.x+r.w+1,y,9,1,'#b9a27f');}
     else for(let x=r.x-10;x<r.x+r.w+10;x+=12){rect(g,x,r.y-10,1,9,'#b9a27f');rect(g,x,r.y+r.h+1,1,9,'#b9a27f');}}
   for(const r of world.roads){rect(g,r.x,r.y,r.w,r.h,C.road);
     for(let i=0;i<r.w*r.h/60;i++){const x=r.x+hash(r.x,r.y,i)*r.w,y=r.y+hash(r.y,r.x,i)*r.h;rect(g,x,y,1,1,i%2?C.roadDark:'#55587a');}
     if(r.vertical){rect(g,r.x,r.y,1,r.h,'#8d8ea6');rect(g,r.x+r.w-1,r.y,1,r.h,'#2f3248');for(let y=r.y+8;y<r.y+r.h;y+=23)rect(g,r.x+21,y,2,11,C.lane);}
     else{rect(g,r.x,r.y,r.w,1,'#8d8ea6');rect(g,r.x,r.y+r.h-1,r.w,1,'#2f3248');for(let x=r.x+8;x<r.x+r.w;x+=23)rect(g,x,r.y+21,11,2,C.lane);}
   }
   // Intersections exist only where both roads really meet; each open leg gets a zebra crossing.
   for(const a of V)for(const b of H){
     if(!(b.x<=a.x&&a.x+a.w<=b.x+b.w&&a.y<=b.y&&b.y+b.h<=a.y+a.h))continue;
     rect(g,a.x,b.y,a.w,b.h,C.road);for(let i=0;i<30;i++)rect(g,a.x+hash(a.x,b.y,i,'i')*a.w,b.y+hash(b.y,a.x,i,'i')*b.h,1,1,C.roadDark);
     const legs={n:a.y<b.y,s:a.y+a.h>b.y+b.h,w:b.x<a.x,e:b.x+b.w>a.x+a.w};
     for(let n=0;n<6;n++){
       if(legs.n)rect(g,a.x+3+n*7,b.y-9,4,7,C.zebra);if(legs.s)rect(g,a.x+3+n*7,b.y+b.h+2,4,7,C.zebra);
       if(legs.w)rect(g,a.x-9,b.y+3+n*7,7,4,C.zebra);if(legs.e)rect(g,a.x+a.w+2,b.y+3+n*7,7,4,C.zebra);
     }
     if(!legs.n)rect(g,a.x,b.y,a.w,1,'#8d8ea6');if(!legs.s)rect(g,a.x,b.y+b.h-1,a.w,1,'#2f3248');
     if(!legs.w)rect(g,a.x,b.y,1,b.h,'#8d8ea6');if(!legs.e)rect(g,a.x+a.w-1,b.y,1,b.h,'#2f3248');
     rect(g,a.x+35,b.y+28,5,4,'#363a52');rect(g,a.x+36,b.y+29,3,1,'#2b2e43');
   }
 }
 lotGround(g,l){const {x,y,w,h}=l;
   const lawn=hash(l.id,'lawn')>.5?'#62aa59':'#5da75b',light='#73b460';
   rect(g,x-3,y+8,w+6,h-8,'#32644e');rect(g,x,y+9,w,h-12,lawn);
   // Broad lawn stripes make the lots intentional; sparse grass clusters add texture.
   for(let n=0;n<7;n++)rect(g,x+2,y+11+n*34,w-4,17,light);
   rect(g,x,y+9,w,2,'#a0c674');rect(g,x+w-2,y+11,2,h-13,'#367550');
   for(let a=0;a<44;a++){const gx=x+4+hash(l.id,a,'gx')*(w-8),gy=y+17+hash(l.id,a,'gy')*(h-30);rect(g,gx,gy,3,1,a%2?'#489053':'#a0c66c');if(a%3===0)rect(g,gx+1,gy-2,1,2,'#489053');}
   rect(g,x+76,y+152,25,96,'#927d76');rect(g,x+78,y+153,21,95,'#e8cfa3');rect(g,x+78,y+154,2,93,'#fff0be');
   for(let yy=y+156;yy<y+h;yy+=10){rect(g,x+80,yy,19,1,'#c3a780');rect(g,x+88,yy,1,9,'#d2b98f');}
   rect(g,x+161,y+20,10,213,'#8d9470');rect(g,x+162,y+20,8,212,'#cdb88b');for(let yy=y+20;yy<y+227;yy+=12)rect(g,x+163,yy,6,1,'#f1d8a1');
   if(l.pool){
     rect(g,x+9,y+17,152,77,'#2c504f66');rect(g,x+7,y+12,152,77,'#79697b');rect(g,x+8,y+12,150,75,'#e4cba1');
     for(let yy=y+13;yy<y+88;yy+=9)rect(g,x+9,yy,148,1,'#c2aa8d');for(let xx=x+10;xx<x+158;xx+=13)rect(g,xx,y+13,1,73,'#c2aa8d');
     rect(g,x+15,y+24,90,48,'#727a8f');rect(g,x+14,y+23,91,47,'#fff1ce');rect(g,x+18,y+27,84,40,C.waterDark);rect(g,x+21,y+30,78,35,C.water);
     rect(g,x+18,y+27,84,3,'#205475');rect(g,x+18,y+30,3,34,'#16849e');rect(g,x+21,y+62,79,3,'#77e8d7');rect(g,x+98,y+30,3,35,'#a2f3de');
     for(let n=0;n<10;n++){const px=x+26+n*7,py=y+35+(n%3)*7;rect(g,px,py,8,1,'#6ee9dc');rect(g,px+6,py-1,2,3,'#56dce0');}
     for(let n=0;n<3;n++)rect(g,x+89+n*3,y+42,3,13,['#8becd9','#a7f0df','#d1f7e7'][n]);
     rect(g,x+24,y+67,2,8,'#657389');rect(g,x+31,y+67,2,8,'#657389');rect(g,x+24,y+67,9,1,'#fff9da');rect(g,x+24,y+71,9,1,'#fff9da');
     // A candy-colored pool float and striped loungers are focal accents.
     rect(g,x+67,y+47,10,6,'#a84c87');rect(g,x+65,y+48,14,4,'#ee79a0');rect(g,x+68,y+46,8,8,'#ee79a0');rect(g,x+69,y+48,5,3,C.water);rect(g,x+67,y+46,4,1,'#ffe3c4');
     const accent=hash(l.id,'umbrella')>.5?'#db667a':'#5b69c2';
     for(const xx of [x+117,x+139]){rect(g,xx+2,y+37,12,29,'#3b4b6266');rect(g,xx,y+34,12,29,'#876168');rect(g,xx+1,y+34,10,27,'#fff0c8');rect(g,xx+1,y+35,10,7,accent);rect(g,xx+1,y+48,10,4,accent);rect(g,xx+1,y+57,10,3,accent);rect(g,xx+2,y+35,2,27,'#fff4d055');}
     rect(g,x+129,y+20,2,19,'#946981');
     poly(g,[[x+116,y+29],[x+128,y+15],[x+142,y+29],[x+128,y+39]],'#39395466');
     poly(g,[[x+114,y+25],[x+126,y+12],[x+140,y+25],[x+126,y+34]],accent);
     poly(g,[[x+126,y+12],[x+126,y+25],[x+114,y+25]],'#fff0cf');poly(g,[[x+126,y+25],[x+140,y+25],[x+126,y+34]],'#ffd6bd');rect(g,x+125,y+22,3,3,'#fff6d8');
     for(let xx=x+8;xx<x+159;xx+=6){rect(g,xx,y+9,2,7,'#39475a');rect(g,xx,y+9,2,1,'#c9cba6');}rect(g,x+8,y+12,150,1,'#39475a');
     rect(g,x+8,y+86,150,2,'#8f7e78');rect(g,x+10,y+81,85,3,'#be965f');
   }else{
     for(let yy=y+15;yy<y+81;yy+=9){rect(g,x+8,yy,3,5,'#94715d');rect(g,x+8,yy,3,1,'#e5c082');}rect(g,x+8,y+18,144,2,'#be9869');
     this.picnic(g,x+116,y+52);
     for(let i=0;i<3;i++){const xx=x+20+i*23;rect(g,xx-1,y+38,17,14,'#5f6157');rect(g,xx,y+38,15,11,'#24644f');rect(g,xx+2,y+35,11,8,'#79b862');for(let j=0;j<3;j++)rect(g,xx+3+j*4,y+36+(j%2)*5,2,2,i%2?'#ffe193':'#ef947b');}
     rect(g,x+107,y+74,19,9,'#d66a7b');rect(g,x+109,y+74,3,9,'#ffd6a2');
   }
   for(const [dx,dy] of [[3,97],[149,98]]){
     rect(g,x+dx,y+dy+7,21,6,'#756152');rect(g,x+dx,y+dy,20,10,'#285e4b');rect(g,x+dx+2,y+dy-2,15,8,'#428e50');rect(g,x+dx+3,y+dy-2,9,2,'#91c561');
     for(let a=0;a<5;a++){rect(g,x+dx+2+a*3,y+dy+3+(a%2)*4,2,2,a%2?'#ef7c8e':'#ffd986');}
   }
   rect(g,x+36,y+223,25,13,'#29405355');rect(g,x+35,y+220,24,14,C.ink);rect(g,x+37,y+221,20,11,'#26849d');rect(g,x+37,y+221,20,1,'#85e0cf');rect(g,x+46,y+222,1,10,'#f3ebc1');
   for(let a=0;a<3;a++)for(let j=0;j<=a;j++){rect(g,x+38+a*2,y+225-a+j*2,2,2,'#f17b83');rect(g,x+55-a*2,y+225-a+j*2,2,2,'#f17b83');}
   rect(g,x+118,y+226,27,14,'#54405b');rect(g,x+120,y+227,22,10,'#ecc07b');rect(g,x+120,y+227,22,1,'#ffe3a5');rect(g,x+130,y+228,1,8,'#b77b58');for(const xx of [121,139])for(const yy of [228,234])rect(g,x+xx,y+yy,2,3,'#dc5675');
   for(const xx of [x+73,x+104]){rect(g,xx,y+223,5,9,'#252e49');rect(g,xx+1,y+225,3,3,'#3d4fb8');rect(g,xx+1,y+231,3,1,BRAND.light);}
   rect(g,x+9,y+189,2,29,'#f8d99d');rect(g,x+11,y+189,13,10,l.identity.primary);rect(g,x+11,y+197,13,2,l.identity.secondary);
   line(g,x+18,y+212,x+87,y+220,'#36474c');line(g,x+87,y+220,x+159,y+212,'#36474c');
   for(let i=0;i<11;i++){const xx=x+20+i*13,yy=y+213+Math.sin(i/10*Math.PI)*6;rect(g,xx,yy,2,3,i%3===0?'#f597a8':'#ffe0a0');}
 }
 // Unclaimed lots are mown and staked, so the grid reads as a neighborhood
 // still growing rather than a blank lawn.
 vacantLot(g,l){const {x,y,w,h}=l;
   rect(g,x-3,y+8,w+6,h-8,'#3b7151');rect(g,x,y+9,w,h-12,'#5ea25a');for(let n=0;n<7;n++)rect(g,x+2,y+11+n*34,w-4,17,'#67ac5e');
   for(let a=0;a<30;a++){const gx=x+4+hash(l.id,a,'vx')*(w-8),gy=y+17+hash(l.id,a,'vy')*(h-30);rect(g,gx,gy,3,1,'#4a8f52');}
   for(const [px,py] of [[x+20,y+60],[x+156,y+60],[x+20,y+200],[x+156,y+200]]){rect(g,px,py,2,8,'#b48a5a');rect(g,px,py,2,2,'#e2675f');}
   line(g,x+21,y+61,x+157,y+61,'#e8e0c8');line(g,x+21,y+201,x+157,y+201,'#e8e0c8');line(g,x+21,y+61,x+21,y+201,'#e8e0c8');line(g,x+157,y+61,x+157,y+201,'#e8e0c8');
   rect(g,x+70,y+222,2,14,'#8b6d4b');rect(g,x+104,y+222,2,14,'#8b6d4b');rect(g,x+62,y+210,52,16,'#f4ecd8');rect(g,x+63,y+211,50,14,'#ffffff');text(g,'OPEN LOT',x+88,y+214,BRAND.ink,1,'center');
 }
 claim(g,l){rect(g,l.x-3,l.y+8,l.w+6,l.h-8,'#2b3a8a');rect(g,l.x,l.y+18,l.w,l.h-20,'#3f52c9');for(let i=0;i<6;i++)rect(g,l.x+6+i*28,l.y+18,2,l.h-20,'#4a5fd6');
   rect(g,l.x+28,l.y+68,120,93,BRAND.ink);rect(g,l.x+30,l.y+70,116,89,BRAND.blue);rect(g,l.x+30,l.y+70,116,2,BRAND.light);
   text(g,'YOUR HOUSE',l.x+88,l.y+82,BRAND.white,1,'center');const s=campusSprite(40,BRAND.white);if(s)g.drawImage(s,l.x+68,l.y+96);text(g,'START HERE',l.x+88,l.y+142,BRAND.pale,1,'center');
   for(const xx of [l.x+7,l.x+168])for(const yy of [l.y+27,l.y+193]){rect(g,xx,yy,3,12,'#a58c63');rect(g,xx,yy,3,3,BRAND.pale);}}
 bench(c,x,y){rect(c,x-10,y,23,4,'#b29b75');rect(c,x-10,y+6,23,5,'#c4a97a');rect(c,x-9,y+1,21,1,'#d3b888');for(const dx of [-7,9])rect(c,x+dx,y+9,2,5,'#586457');}
 picnic(c,x,y){rect(c,x-15,y-7,32,17,'#866d53');rect(c,x-16,y-7,32,10,'#c6a877');for(const yy of [-5,-2,1])rect(c,x-15,y+yy,30,1,'#ac8d62');rect(c,x-14,y-11,28,3,'#b99a6a');rect(c,x-14,y+9,28,3,'#b99a6a');rect(c,x+5,y-6,3,3,'#efe3be');}
 hammock(c,x,y){rect(c,x-31,y-8,3,27,'#9e7b58');rect(c,x+29,y-8,3,27,'#9e7b58');poly(c,[[x-29,y-4],[x,y+7],[x+31,y-4],[x+17,y+15],[x-13,y+14]],'#c58c85');for(let i=-20;i<24;i+=7)rect(c,x+i,y+5,3,5,'#eee1b6');}
 cornhole(c,x,y){for(const yy of [y,y+56]){poly(c,[[x-8,yy-9],[x+10,yy-9],[x+8,yy+13],[x-11,yy+13]],'#d4b585');rect(c,x-3,yy-4,5,4,'#535758');rect(c,x-2,yy+4,3,3,'#5d79ab');}}
 parking(g,p,cars){rect(g,p.x-3,p.y-3,p.w+6,p.h+6,'#8d8ea6');rect(g,p.x,p.y,p.w,p.h,'#4b4e6a');for(let i=0;i<p.w*p.h/70;i++)rect(g,p.x+hash(i,'pk')*p.w,p.y+hash(i,'pk2')*p.h,1,1,'#3f425b');
   for(let i=0;i<=11;i++){const x=p.x+4+i*32;rect(g,x,p.y+6,1,40,'#e8e3d2');rect(g,x,p.y+p.h-46,1,40,'#e8e3d2');}
   for(let x=p.x+10;x<p.x+p.w-10;x+=18)rect(g,x,p.y+p.h/2,9,1,'#e0c46c');
   rect(g,p.x+p.w-34,p.y+p.h/2-10,22,20,'#33405f');rect(g,p.x+p.w-32,p.y+p.h/2-8,18,16,BRAND.blue);text(g,'P',p.x+p.w-23,p.y+p.h/2-4,BRAND.white,1,'center');
   for(const car of cars)g.drawImage(this.car(car.kind,car.y<p.y+p.h/2?1:3),car.x-20,car.y-20);
 }
 basketball(c,s){const {x,y,w,h}=s;
   rect(c,x-4,y-4,w+8,h+8,'#3b4757');rect(c,x,y,w,h,'#c57650');rect(c,x+5,y+5,w-10,h-10,'#db935f');
   for(let i=0;i<w-10;i+=8)rect(c,x+5+i,y+5,1,h-10,'#d08a58');
   const L='#f1e3c8',cx=x+w/2,cy=y+h/2;
   rect(c,x+5,y+5,w-10,1,L);rect(c,x+5,y+h-6,w-10,1,L);rect(c,x+5,y+5,1,h-10,L);rect(c,x+w-6,y+5,1,h-10,L);rect(c,cx,y+5,1,h-10,L);
   ring(c,cx,cy,16,L);disc(c,cx,cy,13,BRAND.blue);fomo(c,cx-10,cy-10,21,BRAND.pale);
   for(const side of [0,1]){const kx=side?x+w-6-52:x+6;rect(c,kx,cy-14,52,28,'#5368d8');rect(c,kx,cy-14,52,1,L);rect(c,kx,cy+13,52,1,L);rect(c,side?kx:kx+51,cy-14,1,28,L);
     ring(c,side?kx:kx+52,cy,13,L);
     for(let a=-80;a<=80;a+=4){const t=a*Math.PI/180,px=side?x+w-14-Math.cos(t)*86:x+14+Math.cos(t)*86,py=cy+Math.sin(t)*46;if(py>y+6&&py<y+h-6)rect(c,px,py,1,1,L);}
     const hx=side?x+w-14:x+14;rect(c,hx-1,cy-12,2,24,'#2c3140');rect(c,side?hx+1:hx-4,cy-12,3,24,'#f4f2ee');ring(c,side?hx-5:hx+5,cy,4,'#e2563d');}
   for(let i=0;i<w+8;i+=6){rect(c,x-4+i,y-6,1,3,'#7d8a96');}text(c,'THE COURTS',cx,y-16,'#f2e6c8',1,'center');
 }
 stadium(g,l){const {x,y,w,h}=l;
   rect(g,x+8,y+12,w-8,h,'#596d61');rect(g,x,y,w,h,'#9d947f');rect(g,x+6,y+6,w-12,h-12,'#deca9f');
   for(let i=0;i<5;i++){rect(g,x+16,y+16+i*8,w-32,6,i%2?'#535a76':'#83919b');rect(g,x+16,y+h-20-i*8,w-32,6,i%2?'#535a76':'#83919b');}
   // 2,732 spectators represented as individual seat pixels, with animation overlaid.
   for(let i=0;i<2732;i++){const side=i%2,row=Math.floor(i/2/150),col=Math.floor(i/2)%150;const yy=side?y+h-17-row*3:y+19+row*3;const xx=x+20+col*(w-40)/150;rect(g,xx,yy,1,2,[BRAND.blue,'#e4ccb0','#348e9e',BRAND.pale][i%4]);}
   const fx=x+42,fy=y+65,fw=w-84,fh=h-130;rect(g,fx-3,fy-3,fw+6,fh+6,'#f1e2bb');rect(g,fx,fy,fw,fh,'#318452');
   for(let i=0;i<12;i++)rect(g,fx+i*fw/12,fy,fw/24,fh,'#42995a');rect(g,fx,fy,fw/12,fh,BRAND.blue);rect(g,fx+fw*11/12,fy,fw/12,fh,BRAND.blue);
   for(let i=1;i<12;i++){rect(g,fx+i*fw/12,fy,1,fh,'#c4d3ae');if(i<11&&i>1)text(g,String(i<6?i*10-10:110-i*10),fx+i*fw/12+3,fy+9,'#d8dfbc');}
   const ez=eyesSprite(18,BRAND.pale);if(ez){g.save();g.drawImage(ez,Math.round(fx+fw/24-9),Math.round(fy+fh/2-9));g.drawImage(ez,Math.round(fx+fw*23/24-9),Math.round(fy+fh/2-9));g.restore();}
   disc(g,x+w/2,y+h/2,20,BRAND.blue,18);fomo(g,x+w/2-17,y+h/2-17,34,BRAND.pale);
   for(const xx of [fx+7,fx+fw-8]){rect(g,xx,fy+fh/2-12,2,25,'#edd184');rect(g,xx-5,fy+fh/2-14,12,2,'#edd184');rect(g,xx-5,fy+fh/2-27,2,15,'#edd184');rect(g,xx+5,fy+fh/2-27,2,15,'#edd184');}
   rect(g,x+w/2-68,y-8,136,23,BRAND.ink);rect(g,x+w/2-67,y-7,134,21,BRAND.navy);text(g,'fomo FIELD',x+w/2,y-4,BRAND.pale,1,'center');text(g,'HOME OF GREEK WARS',x+w/2,y+6,BRAND.light,1,'center');
   // Gates on both touchlines line up with the gaps left in the walls.
   for(const gx of [x,x+w-12]){rect(g,gx,y+128,12,36,'#c9b78f');for(let i=0;i<3;i++)rect(g,gx+2,y+132+i*11,8,2,'#a8966f');}
   for(const xx of [x+9,x+w-12])for(const yy of [y+45,y+h-35]){rect(g,xx,yy-35,3,49,'#79838a');rect(g,xx-9,yy-37,22,10,'#535e70');for(let n=0;n<4;n++)rect(g,xx-7+n*5,yy-35,3,5,'#e0dfba');}
 }
 helipad(g,l){const {x,y,w,h}=l;rect(g,x,y,w,h,'#d4b58d');rect(g,x+7,y+7,w-14,h-14,'#626f7b');rect(g,x+65,y+29,217,182,'#82969a');
   for(let i=0;i<200;i++)rect(g,x+8+hash(i,'hp')*(w-16),y+8+hash(i,'hp2')*(h-16),1,1,'#56626e');
   for(let r=66;r<=69;r++)ring(g,x+174,y+118,r,'#e7ddbc');text(g,'H',x+174,y+97,'#eee4c6',6,'center');
   for(let a=0;a<12;a++){const v=a/12*Math.PI*2;rect(g,x+174+Math.cos(v)*73,y+118+Math.sin(v)*73,3,3,'#ffda7b');}
   rect(g,x+88,y+9,171,16,BRAND.ink);rect(g,x+89,y+10,169,14,BRAND.navy);text(g,'fomo HELIPORT',x+174,y+14,BRAND.pale,1,'center');text(g,'RASMR × ORANGIE',x+174,y+h-20,'#4b4c5e',1,'center');
   for(let i=0;i<5;i++){rect(g,x+10+i*65,y+228,25,10,'#899183');rect(g,x+12+i*65,y+223,21,9,'#5d8868');}
 }
 plaza(g,p){rect(g,p.x,p.y,p.w,p.h,'#c9b48f');for(let yy=p.y;yy<p.y+p.h;yy+=10)rect(g,p.x,yy,p.w,1,'#b9a37d');for(let xx=p.x;xx<p.x+p.w;xx+=20)rect(g,xx+((xx/20)%2)*10,p.y,1,p.h,'#b9a37d');
   for(let i=0;i<4;i++){this.picnic(g,p.x+56+i*90,p.y+108);this.picnic(g,p.x+100+i*90,p.y+150);}
   line(g,p.x+10,p.y+76,p.x+p.w-10,p.y+86,'#555369');for(let i=0;i<16;i++)rect(g,p.x+16+i*23,p.y+77+i*.6,2,3,i%3?'#ffe0a0':'#f597a8');
   text(g,'FOOD TRUCK ROW',p.x+p.w/2,p.y+p.h-12,'#5a4b3a',1,'center');
 }
 park(g,l){const {x,y,w,h}=l;rect(g,x,y,w,h,'#408552');
   const trail=[[x+24,y],[x+54,y+60],[x+22,y+136],[x+77,y+220],[x+90,y+h]];for(let i=0;i<trail.length-1;i++)line(g,...trail[i],...trail[i+1],'#baa98a',11);
   poly(g,[[x+80,y+40],[x+199,y+31],[x+254,y+69],[x+242,y+138],[x+168,y+156],[x+89,y+134],[x+66,y+91]],'#8db471');
   poly(g,[[x+89,y+47],[x+195,y+39],[x+243,y+70],[x+232,y+131],[x+168,y+147],[x+95,y+126],[x+76,y+90]],'#259cac');
   for(let i=0;i<35;i++)rect(g,x+98+hash(i,'px')*119,y+56+hash(i,'py')*65,5,1,'#6adbc8');
   this.picnic(g,x+277,y+245);this.picnic(g,x+211,y+213);
   for(let i=0;i<9;i++){const x2=x+80+i*18,y2=y+150+Math.sin(i)*10;rect(g,x2,y2,4,4,'#899783');line(g,x2-3,y2+5,x2-3,y2-5,'#567857');line(g,x2,y2+6,x2+2,y2-3,'#567857');}
   rect(g,x+262,y+195,70,37,'#a99470');for(const px of [x+263,x+325])rect(g,px,y+167,5,65,'#8e7759');poly(g,[[x+247,y+172],[x+296,y+145],[x+344,y+172]],'#6f8274');poly(g,[[x+251,y+169],[x+296,y+148],[x+338,y+169]],'#a1a78c');this.bench(g,x+295,y+205);
   rect(g,x+110,y+232,32,25,'#dc8491');for(let i=0;i<5;i++)rect(g,x+110+i*7,y+232,2,25,'#e0c4a8');
   for(let i=0;i<10;i++){const tx=x+268+hash(i,'tx')*70,ty=y+60+hash(i,'ty')*80;g.drawImage(this.tree('tree',hash(i)),tx-23,ty-57);}
   text(g,'WILLOW GREEN',x+w/2,y+8,'#dce1b8',1,'center');
 }
 intramural(g,s){const {x,y,w,h}=s;rect(g,x-4,y-4,w+8,h+8,'#2f6f4a');rect(g,x,y,w,h,'#3a8a58');for(let i=0;i<w;i+=34)rect(g,x+i,y,17,h,'#419460');
   const L='#e3ecd2';rect(g,x+10,y+10,w-20,1,L);rect(g,x+10,y+h-11,w-20,1,L);rect(g,x+10,y+10,1,h-20,L);rect(g,x+w-11,y+10,1,h-20,L);rect(g,x+w/2,y+10,1,h-20,L);ring(g,x+w/2,y+h/2,26,L);
   for(const side of [0,1]){const gx=side?x+w-11:x+10;rect(g,side?gx-36:gx,y+h/2-40,36,1,L);rect(g,side?gx-36:gx,y+h/2+40,36,1,L);rect(g,side?gx-36:gx+35,y+h/2-40,1,80,L);rect(g,side?gx:gx-6,y+h/2-16,6,32,'#f4f2ee');for(let i=0;i<6;i++)rect(g,side?gx:gx-6,y+h/2-16+i*6,6,1,'#9fb09a');}
   text(g,'INTRAMURALS',x+w/2,y-14,'#e7eccf',1,'center');
 }
 social(g,s){const {x,y,w,h}=s;rect(g,x,y,w,h,'#46945a');for(let i=0;i<40;i++)rect(g,x+hash(i,'so')*w,y+hash(i,'so2')*h,3,1,'#5aa968');this.picnic(g,x+60,y+76);this.picnic(g,x+214,y+102);this.hammock(g,x+106,y+52);this.cornhole(g,x+300,y+22);text(g,'THE LAWN',x+w/2,y+h-12,'#d6e8c2',1,'center');}
 garden(g,s){const {x,y,w,h}=s;rect(g,x,y,w,h,'#7a6248');rect(g,x+3,y+3,w-6,h-6,'#8c7356');
   for(let r=0;r<4;r++)for(let i=0;i<5;i++){const bx=x+14+i*72,byy=y+14+r*32;rect(g,bx,byy,60,22,'#5e4632');rect(g,bx+2,byy+2,56,18,'#4d3a2b');for(let k=0;k<7;k++){const col=['#7fc06a','#e46b5d','#f2c35b','#a77bd6'][(r+i)%4];rect(g,bx+5+k*8,byy+6+(k%2)*5,4,4,'#4f9a52');rect(g,bx+6+k*8,byy+7+(k%2)*5,2,2,col);}}
   text(g,'COMMUNITY GARDEN',x+w/2,y-10,'#e7eccf',1,'center');
 }
 quad(g,world){const q=world.sites.quad,f=world.sites.fountain,b=world.sites.bonfire;
   rect(g,q.x+10,q.y+10,q.w-20,q.h-20,'#5aa65d');
   rect(g,f.x-8,q.y+190,16,q.h-200,'#d9c49b');rect(g,q.x+20,f.y-8,q.w-40,16,'#d9c49b');rect(g,f.x-8,q.y+190,1,q.h-200,'#f3e2bd');rect(g,q.x+20,f.y-8,q.w-40,1,'#f3e2bd');
   disc(g,f.x,f.y,56,'#cdb88f',44);disc(g,f.x,f.y,52,'#dcc8a0',40);
   disc(g,f.x,f.y+3,33,'#7a7488',25);disc(g,f.x,f.y,32,'#e5d8b8',24);disc(g,f.x,f.y,28,C.waterDark,20);disc(g,f.x,f.y,25,C.water,18);disc(g,f.x,f.y,6,'#e5d8b8',5);
   for(const [dx,dy] of [[-58,-40],[58,-40],[-58,40],[58,40]]){rect(g,f.x+dx-10,f.y+dy-6,20,12,'#3d7f4f');for(let k=0;k<5;k++)rect(g,f.x+dx-8+k*4,f.y+dy-4+(k%2)*4,2,2,k%2?'#f7a6c0':'#fff0a8');}
   for(const [dx,dy] of [[-44,-34],[44,-34],[-44,34],[44,34]])this.bench(g,b.x+dx,b.y+dy-6);
   disc(g,b.x,b.y+2,20,'#6f6355',8);disc(g,b.x,b.y,16,'#857766',7);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;rect(g,b.x+Math.cos(a)*16-2,b.y+Math.sin(a)*7-1,4,3,'#a5978a');}
   rect(g,b.x-9,b.y-1,18,3,'#6b4a3a');rect(g,b.x-7,b.y+2,14,2,'#563a2e');rect(g,b.x-3,b.y-3,6,3,'#2f2a2c');
   text(g,'THE QUAD',f.x,q.y+q.h-26,'#e2ecd0',1,'center');
 }
 trophyGround(g,x,y){rect(g,x-15,y+90,170,38,'#bbb69c');for(let i=0;i<3;i++)rect(g,x+22-i*7,y+76+i*5,91+i*14,5,['#b09c78','#c8b18a','#dfc89d'][i]);rect(g,x+32,y+70,69,18,'#756b5b');text(g,'CHAMPION',x+66,y+76,'#f6e2ab',1,'center');
   rect(g,x+55,y+44,24,27,'#a97d48');rect(g,x+60,y+44,12,27,'#dfb564');rect(g,x+39,y+9,54,35,'#bd9251');rect(g,x+43,y+11,42,29,'#eac376');rect(g,x+49,y+12,9,23,'#fae1a1');
   for(const dx of [25,92]){rect(g,x+dx,y+12,15,4,'#c9a45d');rect(g,x+dx,y+12,4,21,'#e2bb69');rect(g,x+dx,y+29,15,4,'#b78a49');}
   for(let i=0;i<6;i++)rect(g,x+44+i*6,y+3-(i%3)*3,12,8,['#a8b78b','#c3c996','#8ea17f'][i%3]);text(g,'?',x+67,y+17,'#805f3e',2,'center');text(g,'NATIONAL CHAMPION',x+68,y+112,C.ink,1,'center');
 }
 campusDetails(g,world){const S=world.sites;
   // Public-space details from the original campus kit, redrawn at native pixel scale.
   for(const r of world.roads.filter(r=>r.vertical))for(let y=350;y<world.bottom-60;y+=288){
     rect(g,r.x-8,y+38,4,6,'#9c8770');rect(g,r.x-9,y+37,6,2,'#c3aa7f'); // hydrant
     rect(g,r.x-8,y+91,5,8,'#5c796c');rect(g,r.x-8,y+90,5,2,'#416353');
     rect(g,r.x+47,y+82,5,8,'#6c7b99');rect(g,r.x+46,y+81,7,2,'#555e7d');
     rect(g,r.x+38,y+44,4,5,'#35384f');rect(g,r.x+39,y+45,2,3,'#25283a'); // storm drain at the curb
     rect(g,r.x+12,y+136,7,5,'#676c7e');rect(g,r.x+13,y+137,5,1,'#86899b');
     for(let i=0;i<3;i++){rect(g,r.x-9,y+161+i*7,7,1,'#7c8c89');rect(g,r.x-9,y+161+i*7,1,5,'#7c8c89');}
     rect(g,r.x-9,y+162,4,4,'#48596a');rect(g,r.x-1,y+162,4,4,'#48596a');
   }
   for(const t of world.furniture)if(t.type==='lamp'){rect(g,t.x,t.y-28,2,30,'#5d6c6c');rect(g,t.x-3,t.y-32,8,7,'#697577');rect(g,t.x-2,t.y-30,6,4,'#dbd6ac');rect(g,t.x-4,t.y-33,10,2,'#505e67');rect(g,t.x+2,t.y,3,2,'#2c3a3f44');}
   for(const {x,y} of S.shelters){
     rect(g,x,y-30,49,31,'#6b777c');rect(g,x+2,y-27,45,25,'#9ab1b1');rect(g,x+4,y-25,17,21,'#adc5bf');rect(g,x+24,y-25,20,21,'#9cb8b7');
     rect(g,x-3,y-34,55,5,'#626b7a');rect(g,x+1,y-32,47,1,'#adb6b0');this.bench(g,x+24,y-8);text(g,'SHUTTLE',x+24,y-31,'#e2d9ba',1,'center');
     rect(g,x+57,y-21,13,22,'#8e7170');rect(g,x+59,y-18,9,8,'#d8c3a1');
   }
   const cl=S.campusLife;rect(g,cl.x+3,cl.y+13,3,22,'#6c6859');rect(g,cl.x+41,cl.y+13,3,22,'#6c6859');rect(g,cl.x,cl.y,46,23,'#7a6857');rect(g,cl.x+3,cl.y+3,40,17,'#baa77d');text(g,'CAMPUS',cl.x+23,cl.y+5,'#4b5353',1,'center');text(g,'LIFE',cl.x+23,cl.y+14,'#4b5353',1,'center');
   const {x,y}=S.coffee;rect(g,x-4,y-36,89,36,'#c7b491');rect(g,x,y-32,80,27,'#e2ceab');rect(g,x+7,y-22,25,17,'#648a94');rect(g,x+43,y-24,22,23,'#50667a');
   rect(g,x-6,y-36,93,12,'#c96073');for(let i=0;i<9;i++)rect(g,x-5+i*10,y-35,5,11,'#fff0c3');rect(g,x+4,y-46,71,11,'#3b385b');text(g,'COFFEE',x+39,y-44,'#eadbbb',1,'center');
   const bp=S.backPatio;rect(g,bp.x,bp.y,bp.w,bp.h,'#a9977c');for(let i=0;i<4;i++)this.picnic(g,bp.x+23+i*36,bp.y+21+(i%2)*17);line(g,bp.x-3,bp.y-6,bp.x+bp.w+3,bp.y+41,'#555369');line(g,bp.x-3,bp.y+41,bp.x+bp.w+3,bp.y-6,'#555369');
   for(let i=0;i<10;i++){rect(g,bp.x-2+i*18,bp.y-5+i*4.7,2,3,'#ead49a');rect(g,bp.x-2+i*18,bp.y+40-i*4.7,2,3,'#ead49a');}text(g,'THE BACK PATIO',bp.x+79,bp.y+58,'#405450',1,'center');
   // Bell tower and water tower terminate the campus skyline.
   const bt=S.bell;rect(g,bt.x,bt.y+35,34,60,'#c7ac89');rect(g,bt.x+4,bt.y+41,26,52,'#d8bc94');rect(g,bt.x+10,bt.y+21,15,23,'#6d576e');rect(g,bt.x+13,bt.y+27,9,15,'#504f5b');poly(g,[[bt.x+1,bt.y+21],[bt.x+18,bt.y],[bt.x+36,bt.y+21]],'#4b6987');rect(g,bt.x+4,bt.y+68,25,2,'#f1d5a5');
   const wt=S.waterTower;for(const xx of [wt.x+13,wt.x+44])rect(g,xx,wt.y+38,4,91,'#7e877d');line(g,wt.x+15,wt.y+78,wt.x+45,wt.y+116,'#7e877d',2);line(g,wt.x+45,wt.y+78,wt.x+15,wt.y+116,'#7e877d',2);rect(g,wt.x+4,wt.y+14,53,55,'#3a4fb8');rect(g,wt.x+7,wt.y+17,47,43,BRAND.blue);poly(g,[[wt.x,wt.y+15],[wt.x+30,wt.y],[wt.x+62,wt.y+15]],'#2b3a8f');fomo(g,wt.x+17,wt.y+24,28,BRAND.pale);
 }
}
