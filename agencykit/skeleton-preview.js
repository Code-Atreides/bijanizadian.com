import {archiveProjects} from './archive-data.js';
import {mountSkeleton,downloadSkeleton} from './skeletons.js';

const params=new URLSearchParams(location.search);
const item=archiveProjects.flatMap(project=>project.items).find(item=>item.id===params.get('item'));
const embed=params.get('embed')==='1';
document.body.classList.toggle('preview-embedded',embed);
document.querySelector('#preview-toolbar').hidden=embed;
document.querySelector('#preview-context').hidden=embed;
const root=document.querySelector('#skeleton-root');
if(!item){
  const section=document.createElement('section');section.className='preview-missing';
  const title=document.createElement('h1');title.textContent='That starting point isn’t here.';
  const copy=document.createElement('p');copy.textContent='Choose a page from the archive to preview its skeleton.';
  const link=document.createElement('a');link.href='/agencykit#archive';link.textContent='Explore the archive ↗';
  section.append(title,copy,link);root.replaceChildren(section);
}else{
  document.title=`${item.name} skeleton — agencykit`;
  document.querySelector('#preview-title').textContent=item.name;
  let cleanup=mountSkeleton(root,item);
  // The editor sends text/theme data only. Rendered HTML is never accepted.
  if(embed)window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='agencykit-draft-preview'||event.data.sourceId!==item.id)return;
    cleanup();cleanup=mountSkeleton(root,item,{project:event.data.project,draft:event.data.draft});
  });
  window.addEventListener('pagehide',event=>{if(!event.persisted)cleanup();});
  const button=document.querySelector('#preview-download');button.disabled=false;
  button.addEventListener('click',()=>{
    const status=document.querySelector('#preview-status');
    try{downloadSkeleton(item);status.textContent='Your editable HTML file is downloading.';}
    catch{status.textContent='The download could not start. Please try again.';}
    status.hidden=false;
    setTimeout(()=>{status.hidden=true;},3500);
  });
}
