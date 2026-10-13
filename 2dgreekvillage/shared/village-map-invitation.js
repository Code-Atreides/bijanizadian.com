import {mapInviteEligible} from './village-map-layout.js?v=183';
export function createMapInvitation(shell,openMap){
 const scroll=document.createElement('aside');scroll.className='village-map-scroll';scroll.hidden=true;scroll.setAttribute('aria-label','Explore the campus map');
 scroll.innerHTML=`<button class="map-scroll-dismiss" type="button" aria-label="Dismiss map invitation">×</button><button class="map-scroll-open" type="button" aria-label="Unroll the map and explore schools"><span class="map-scroll-paper"><span class="map-scroll-kicker">THE GREEK ATLAS</span><img src="/fomo/campuswars/assets/map-scroll.svg" alt="" width="300" height="155"><span class="map-scroll-cta">Find your school <b>↗</b></span></span></button>`;
 shell.append(scroll);let timer=0,opened=false,shown=false,visible=false,overlay=false;
 const hide=()=>{scroll.hidden=true;};
 function check(){clearTimeout(timer);timer=0;const eligible=mapInviteEligible({ready:shell.classList.contains('village-ready'),national:!shell.dataset.destination||shell.dataset.destination==='national',intro:shell.classList.contains('intro-playing'),visible:visible&&!document.hidden,overlay:overlay||Boolean(document.querySelector('dialog[open]')),opened});
  if(!eligible){hide();return;}if(shown){scroll.hidden=false;return;}
  timer=setTimeout(()=>{shown=true;scroll.hidden=false;timer=0;},3000);
 }
 scroll.querySelector('.map-scroll-open').addEventListener('click',()=>{opened=true;hide();openMap();});scroll.querySelector('.map-scroll-dismiss').addEventListener('click',()=>{opened=true;hide();});
 const observer=new MutationObserver(check);observer.observe(shell,{attributes:true,attributeFilter:['class','data-destination']});
 const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>.45;check();},{threshold:[0,.45]});intersection.observe(shell);
 document.addEventListener('visibilitychange',check);document.addEventListener('village:overlay',e=>{overlay=e.detail.open;check();});document.addEventListener('national:visibility',e=>{if(e.detail.open)opened=true;check();});
 return {dismiss(){opened=true;hide();clearTimeout(timer);},dispose(){clearTimeout(timer);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',check);scroll.remove();}};
}
