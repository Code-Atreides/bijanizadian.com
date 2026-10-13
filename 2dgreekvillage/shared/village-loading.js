// Unknown network/GPU waits stay indeterminate rather than inventing a percent.
export function createVillageLoading(documentRef=document){
  const cover=documentRef.getElementById('village-loading');
  const background=documentRef.getElementById('village-background-loading');
  const tasks=new Map(),painted=new Map();let blocking=true;
  function paint(prefix,label,value){
    const key=label+':'+value;if(painted.get(prefix)===key)return;painted.set(prefix,key);
    const text=documentRef.getElementById(prefix+'-label'),bar=documentRef.getElementById(prefix+'-progress');
    text.textContent=label;bar.hidden=false;
    if(Number.isFinite(value))bar.value=Math.max(0,Math.min(100,value));
    else bar.removeAttribute('value');
    bar.setAttribute('aria-valuetext',label);
  }
  function refresh(){
    background.hidden=blocking||!tasks.size;
    if(tasks.size){const [label,value]=[...tasks.values()].at(-1);paint('village-background',label,value);}
  }
  return {
    startup(label,value){painted.delete('village-loading');blocking=true;cover.hidden=false;paint('village-loading',label,value);refresh();},
    ready(){blocking=false;cover.hidden=true;refresh();},
    task(id,label,value){const old=tasks.get(id);if(old&&old[0]===label&&old[1]===value)return;tasks.set(id,[label,value]);refresh();},
    done(id){if(tasks.delete(id))refresh();},
    fail(label){blocking=true;cover.hidden=false;paint('village-loading',label,null);documentRef.getElementById('village-loading-progress').hidden=true;refresh();}
  };
}
