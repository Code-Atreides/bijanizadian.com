// One world builds at a time; a burst retains only its newest pending snapshot.
export function createVillageUpdateQueue(build){
  let pending=null,running=null;
  return event=>{
    pending=event;
    if(!running)running=Promise.resolve().then(async()=>{
      try{while(pending){const next=pending;pending=null;await build(next);}}
      finally{running=null;}
    });
    return running;
  };
}
