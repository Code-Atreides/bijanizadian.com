import {filterMapSchools} from './village-map-layout.js?v=183';
import {campusIdentity} from './village-school-identities.js?v=183';
let enginePromise;
function loadEngine(){
 if(globalThis.maplibregl)return Promise.resolve(globalThis.maplibregl);
 return enginePromise??=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./vendor/maplibre-gl.css',import.meta.url).href;document.head.append(css);
  const script=document.createElement('script');script.src=new URL('./vendor/maplibre-gl.js',import.meta.url).href;script.onload=()=>resolve(globalThis.maplibregl);script.onerror=()=>{enginePromise=null;script.remove();reject(Error('Map engine unavailable'));};document.head.append(script);
 });
}
export async function createNationalMap(host,{onSelect,onReady=()=>{},onError=()=>{}}){
 const M=await loadEngine();const map=new M.Map({container:host,style:new URL('./data/map-style.json?v=141',import.meta.url).href,center:[-96,38],zoom:3.4,minZoom:2,maxZoom:16,maxPitch:0,dragRotate:false,touchPitch:false,renderWorldCopies:false,attributionControl:false,fadeDuration:0});
 map.touchZoomRotate.disableRotation();map.addControl(new M.AttributionControl({compact:true}),'bottom-right');
 map.getCanvas().setAttribute('aria-label','Campus map. Drag to pan and pinch or scroll to zoom. Click a school to visit its block.');
 const overlay=document.createElement('div');overlay.className='school-map-pins';host.append(overlay);
 const tooltip=document.createElement('div');tooltip.className='school-map-label';tooltip.hidden=true;host.append(tooltip);
 let schools=[],destinations=[],buttons=new Map(),query='',width=1,height=1,frame=0,disposed=false,hovered='',placed=[],pointer=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function showLabel(school,button){hovered=school.id;tooltip.replaceChildren();const identity=campusIdentity(school);if(identity.logo){const badge=document.createElement('span'),img=document.createElement('img');badge.className='school-label-logo';badge.style.background=identity.logoBackground==='primary'?identity.primary:'#fff';img.src=new URL('./assets/schools/'+identity.logo,import.meta.url).href;img.alt='';badge.append(img);tooltip.append(badge);}const name=document.createElement('strong'),arrow=document.createElement('span');name.textContent=school.name;arrow.textContent='↗';tooltip.append(name,arrow);tooltip.hidden=false;positionLabel(button);}
 function positionLabel(button){const x=Number(button.dataset.x),y=Number(button.dataset.y),w=tooltip.offsetWidth;tooltip.style.left=Math.max(12,Math.min(width-w-12,x-w/2))+'px';tooltip.style.top=(y<180?y+20:y-tooltip.offsetHeight-20)+'px';}
 function hideLabel(){hovered='';tooltip.hidden=true;}
 function drawPins(){frame=0;if(disposed||!host.clientWidth)return;width=host.clientWidth;height=host.clientHeight;placed=[];
  for(const school of destinations){const p=map.project([school.lon,school.lat]),b=buttons.get(school.id);b.hidden=p.x<8||p.x>width-8||p.y<140||p.y>height-40;if(b.hidden)continue;b.style.transform='translate('+p.x+'px,'+p.y+'px)';b.dataset.x=p.x;b.dataset.y=p.y;placed.push({school,x:p.x,y:p.y});if(hovered===school.id)positionLabel(b);}
  if(hovered&&buttons.get(hovered)?.hidden)hideLabel();
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(drawPins);}
 function render(){destinations=filterMapSchools(schools,query).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon));overlay.replaceChildren();buttons.clear();hideLabel();for(const school of destinations){const b=document.createElement('button');b.type='button';b.className='school-map-pin';b.dataset.school=school.id;b.setAttribute('aria-label',school.name+'. Visit campus');b.append(document.createElement('i'));b.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};});b.addEventListener('click',e=>{if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6){pointer=null;return;}pointer=null;let target=school;if(e.detail){const r=host.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const nearest=placed.reduce((best,p)=>!best||Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y)?p:best,null);if(nearest)target=nearest.school;}onSelect(target.id);});b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')showLabel(school,b);});b.addEventListener('pointerleave',hideLabel);b.addEventListener('focus',()=>showLabel(school,b));b.addEventListener('blur',hideLabel);overlay.append(b);buttons.set(school.id,b);}schedule();}
 function reset(){hideLabel();if(host.clientWidth<650){map.jumpTo({center:[-92,38],zoom:3.8,pitch:0,bearing:0});schedule();return;}map.fitBounds([[-125,24],[-66,50]],{padding:{top:125,bottom:60,left:40,right:40},duration:0,pitch:0,bearing:0});schedule();}
 const loadTimeout=setTimeout(()=>{if(!host.dataset.mapReady)onError();},15000);
 map.on('move',schedule);map.on('resize',schedule);map.on('load',()=>{clearTimeout(loadTimeout);host.dataset.mapReady='true';onReady();schedule();});
 const observer=new ResizeObserver(()=>{map.resize();schedule();});observer.observe(host);reset();
 return {setSchools(value){schools=value;render();},filter(value){query=value;render();},resize(){map.resize();schedule();},zoom(f){map.zoomTo(map.getZoom()+(f<1?1:-1),{duration:reduced?0:180});},reset,dispose(){disposed=true;clearTimeout(loadTimeout);cancelAnimationFrame(frame);observer.disconnect();map.remove();overlay.remove();tooltip.remove();}};
}
