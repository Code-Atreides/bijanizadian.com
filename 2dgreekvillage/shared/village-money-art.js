const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
const smooth=t=>t*t*(3-2*t);
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
function canvas(width,height){if(typeof document==='undefined'||!document.createElement)return null;const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
function texture(T,c){if(!c)return null;const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;}

// Baked soft density, irregular edges and directional shading avoid hard sphere silhouettes.
export function createCloudTexture(T){
  const c=canvas(192,192);if(!c)return null;const ctx=c.getContext('2d'),pixels=ctx.createImageData(192,192);
  for(let y=0;y<192;y++)for(let x=0;x<192;x++){
    const nx=(x-96)/83,ny=(y-96)/83,r=Math.hypot(nx,ny);
    const billow=noise(nx*3+4,ny*3+9)*.6+noise(nx*7+20,ny*7+5)*.28+noise(nx*16+32,ny*16+17)*.12;
    const density=Math.max(0,Math.min(1,(1-r+(billow-.5)*.35)/.38));
    const light=Math.max(0,Math.min(1,.5-nx*.17-ny*.24+Math.sqrt(Math.max(0,1-r*r))*.25));
    const shade=Math.round(145+light*102+billow*8),index=(y*192+x)*4;
    pixels.data.set([shade,Math.min(255,shade+3),Math.min(255,shade+7),Math.round(smooth(density)*(.77+billow*.18)*255)],index);
  }
  ctx.putImageData(pixels,0,0);return texture(T,c);
}

// Fine engraved linework, a portrait medallion, denomination and warm paper grain.
export function createBanknoteTexture(T){
  const c=canvas(768,336);if(!c)return null;const ctx=c.getContext('2d');
  ctx.fillStyle='#dcd9bd';ctx.fillRect(0,0,768,336);
  for(let i=0;i<14000;i++){const x=hash(i,1)*768,y=hash(i,2)*336;ctx.fillStyle=i%2?'#42664c16':'#ffffee36';ctx.fillRect(x,y,.7,1.6);}
  ctx.strokeStyle='#365744';
  for(const [inset,width] of [[12,3],[20,1],[26,2],[33,1]]){ctx.lineWidth=width;ctx.strokeRect(inset,inset,768-inset*2,336-inset*2);}
  ctx.save();ctx.beginPath();ctx.rect(36,36,696,264);ctx.clip();
  ctx.lineWidth=.65;ctx.strokeStyle='#60806288';
  for(let row=0;row<33;row++){
    ctx.beginPath();for(let x=34;x<736;x+=2){const y=47+row*7.7+Math.sin(x*.054+row*.7)*3+Math.sin(x*.13+row)*1.5;x===34?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  }
  for(const cx of [106,662])for(let ring=0;ring<15;ring++){
    ctx.beginPath();for(let a=0;a<=Math.PI*2+.02;a+=.02){const r=37+ring*.9+Math.sin(a*18+ring*.28)*4;const x=cx+Math.cos(a)*r,y=168+Math.sin(a)*r*1.23;a===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle='#d4d6ba';ctx.beginPath();ctx.ellipse(384,167,99,127,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#45634c';for(let i=0;i<8;i++){ctx.lineWidth=i%3?1:2;ctx.beginPath();ctx.ellipse(384,167,99-i*2,127-i*2,0,0,Math.PI*2);ctx.stroke();}
  ctx.save();ctx.beginPath();ctx.ellipse(384,167,81,109,0,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#53705a';ctx.beginPath();ctx.moveTo(320,286);ctx.quadraticCurveTo(329,241,366,229);ctx.lineTo(368,205);ctx.quadraticCurveTo(339,194,343,151);ctx.quadraticCurveTo(324,102,366,82);ctx.quadraticCurveTo(414,58,429,109);ctx.lineTo(423,136);ctx.lineTo(440,158);ctx.lineTo(426,164);ctx.quadraticCurveTo(433,197,399,207);ctx.lineTo(402,228);ctx.quadraticCurveTo(445,241,456,286);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#d6d8bca0';ctx.lineWidth=.8;
  for(let i=0;i<64;i++){ctx.beginPath();ctx.moveTo(328,86+i*3);ctx.quadraticCurveTo(383,103+i*3,444,80+i*3);ctx.stroke();}
  ctx.strokeStyle='#2a4836';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(404,135);ctx.lineTo(419,136);ctx.moveTo(408,180);ctx.lineTo(425,179);ctx.stroke();ctx.restore();
  ctx.fillStyle='#2e503b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 22px Georgia';ctx.fillText('FOMO RESERVE',384,33);
  ctx.font='bold 18px Georgia';ctx.fillText('ONE HUNDRED',384,307);
  ctx.font='bold 56px Georgia';for(const [x,y] of [[90,68],[678,68],[90,270],[678,270]])ctx.fillText('100',x,y);
  ctx.font='bold 40px Georgia';ctx.fillText('100',106,168);ctx.fillText('100',662,168);
  ctx.textAlign='left';ctx.font='14px monospace';ctx.fillText('FW 02609100 A',162,249);ctx.fillText('FW 02609100 A',492,91);
  ctx.strokeStyle='#6c8261';ctx.lineWidth=2;ctx.beginPath();ctx.arc(550,204,25,0,Math.PI*2);ctx.stroke();ctx.font='bold 20px Georgia';ctx.textAlign='center';ctx.fillText('F',550,205);
  return texture(T,c);
}
