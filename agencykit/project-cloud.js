import {cloudConfig} from './cloud-config.js';

const AUTH='agencykit-session-v1', PENDING='agencykit-pending-v1';
const cleanEmail=value=>String(value||'').trim().toLowerCase();
export function emailLinkCode(href) {
  try { let url=new URL(href);for(let i=0;i<4;i++){
    if(url.searchParams.get('mode')==='signIn'&&url.searchParams.get('oobCode'))return url.searchParams.get('oobCode');
    const nested=url.searchParams.get('link')||url.searchParams.get('deep_link_id');if(!nested)break;url=new URL(nested);
  }}catch{}return '';
}
/** ETag writes stop on concurrent changes rather than overwriting another device. */
export function createProjectCloud({store,setStorageMode,onChange=()=>{},notify=()=>{}}) {
  let auth=null,etag=null,revision=0,applying=false,busy=false,dirty=false,conflict=false,timer=null,ready=false;
  let status='Local workspace',message='',code=emailLinkCode(location.href);
  const session={get(key){try{return sessionStorage.getItem(key);}catch{return null;}},set(key,value){sessionStorage.setItem(key,value);},remove(key){try{sessionStorage.removeItem(key);}catch{}}};
  const emit=(detail={})=>onChange(detail);
  function rememberAuth(){session.set(AUTH,JSON.stringify(auth));}
  async function api(action,body){
    const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:'+action+'?key='+cloudConfig.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok){const reason=result.error?.message||'';if(/EXPIRED_OOB_CODE|INVALID_OOB_CODE/.test(reason))throw Error('This sign-in link has expired or was already used. Request a new one.');if(/TOO_MANY|QUOTA/.test(reason))throw Error('Too many attempts. Please try again later.');throw Error('Sign-in could not finish. Check your email address and try a new link.');}return result;
  }
  async function token(){
    if(!auth)throw Error('Sign in to connect your workspace.');
    if(auth.expiresAt>Date.now()+60000)return auth.idToken;
    const response=await fetch('https://securetoken.googleapis.com/v1/token?key='+cloudConfig.apiKey,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:auth.refreshToken}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Your session has expired. Sign out, then sign in again.');
    const data=await response.json();auth={...auth,idToken:data.id_token,refreshToken:data.refresh_token,expiresAt:Date.now()+Number(data.expires_in)*1000};rememberAuth();return auth.idToken;
  }
  async function request(method,body,tag){
    if(method==='PUT'&&!(typeof tag==='string'&&/^"[^"\r\n]+"$/.test(tag)))throw Error('Cloud version could not be verified. Reload the cloud connection before saving.');
    const access=await token();
    const response=await fetch(cloudConfig.databaseURL+'/agencykitWorkspace.json?auth='+encodeURIComponent(access),{method,headers:{'Content-Type':'application/json','X-Firebase-ETag':'true',...(tag?{'if-match':tag}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
    if(response.status===401||response.status===403)throw Error('This email does not have access to the agency workspace.');
    if(response.status===412)return {conflict:true};
    if(!response.ok)throw Error('Cloud connection unavailable. Your draft is kept in this tab; retry or export a backup.');
    return {value:await response.json(),etag:response.headers.get('ETag')};
  }
  function pending(){session.set(PENDING,JSON.stringify({uid:auth.uid,payload:store.exportData(),etag,revision}));}
  async function flush(){
    clearTimeout(timer);if(!ready||!auth||busy||conflict||!dirty)return;
    busy=true;status='Saving to cloud…';emit();
    const payload=store.exportData();
    try{
      if(payload.length>4*1024*1024)throw Error('This workspace is too large to sync. Export a backup and reduce embedded images.');
      const result=await request('PUT',{payload,revision:revision+1,updatedBy:auth.uid,updatedAt:{'.sv':'timestamp'}},etag);
      if(result.conflict){conflict=true;status='Changes on another device';message='Your edits are still here. Export them before loading the latest cloud copy.';return;}
      etag=result.etag;revision+=1;dirty=store.exportData()!==payload;message='';status=dirty?'Saving to cloud…':'Saved to cloud';
      if(dirty)pending();else session.remove(PENDING);
    }catch(error){status='Not synced';message=error.message;dirty=true;}
    finally{busy=false;emit();if(dirty&&!conflict&&status!=='Not synced')timer=setTimeout(flush,300);}
  }
  async function connect({discardPending=false}={}){
    ready=false;status='Opening your workspace…';emit();
    try{
      const result=await request('GET');const cloud=result.value;
      let cached=null;try{cached=JSON.parse(session.get(PENDING)||'null');}catch{}
      setStorageMode('shared');applying=true;
      try{store.replaceData(cloud?.payload||JSON.stringify({version:1,projects:[]}));}finally{applying=false;}
      etag=result.etag;revision=cloud?.revision||0;dirty=false;conflict=false;
      if(!discardPending&&cached?.uid===auth.uid){
        applying=true;try{store.replaceData(cached.payload);}finally{applying=false;}
        dirty=true;conflict=cached.etag!==etag;
        if(conflict){status='Changes on another device';message='Your unsynced edits are recovered. Export a backup before loading the cloud copy.';}
      }
      ready=true;
      if(discardPending)session.remove(PENDING);
      if(!conflict){status=cloud?'Saved to cloud':'Cloud connected';message='';if(dirty)await flush();}
      emit({reload:true});
      return true;
    }catch(error){status='Connection needs attention';message=error.message;emit();return false;}
  }
  store.subscribe(()=>{
    if(applying||!auth||!ready)return;
    dirty=true;try{pending();}catch{status='Not synced';message='Session storage is full. Export a backup before leaving.';emit();return;}
    status=conflict?'Changes on another device':'Saving to cloud…';emit();clearTimeout(timer);timer=setTimeout(flush,400);
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('online',()=>{if(dirty&&!conflict)flush();});
  const service={
    getState:()=>({signedIn:!!auth,ready,applying,email:auth?.email||'',status,message,conflict,busy,needsEmail:!!code,dirty}),
    async sendLink(email){
      email=cleanEmail(email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email address.');
      await api('sendOobCode',{requestType:'EMAIL_SIGNIN',email,continueUrl:'https://bijanizadian.com/agencykit#projects',canHandleCodeInApp:true});
      try{localStorage.setItem('agencykit-signin-email',email);}catch{}
      status='Check your email';message='Open the sign-in link on this device to connect your workspace.';emit();
    },
    async finishSignIn(email){
      if(!code)throw Error('Open the sign-in link from your email.');
      const result=await api('signInWithEmailLink',{email:cleanEmail(email),oobCode:code});
      auth={uid:result.localId,email:result.email,idToken:result.idToken,refreshToken:result.refreshToken,expiresAt:Date.now()+Number(result.expiresIn)*1000};rememberAuth();
      code='';history.replaceState(null,'','/agencykit#projects');await connect();
    },
    async signOut(){
      if(dirty){await flush();if(dirty)throw Error('Export your unsynced work or retry the connection before signing out.');}
      const local=localStorage.getItem('agencykit-projects-v1')||JSON.stringify({version:1,projects:[]});
      applying=true;setStorageMode('local');
      try{store.replaceData(local);}catch(error){setStorageMode('shared');throw Error('Your local workspace could not reopen. The shared session is still connected; export a backup before leaving.');}finally{applying=false;}
      auth=null;ready=false;etag=null;revision=0;conflict=false;session.remove(AUTH);session.remove(PENDING);session.remove('agencykit-shared-cache');
      status='Local workspace';message='';emit({reload:true});
    },
    async retry(){if(!ready)return connect();return flush();},
    async loadCloud(){
      // Keep a recoverable copy in this tab when resolving a conflict.
      session.set('agencykit-conflict-backup',store.exportData());if(!await connect({discardPending:true}))throw Error('The cloud copy could not load. Your pending edits are still kept in this tab.');
    },
    async start(){
      if(code){status='Finish signing in';message='Confirm the email address that received this link.';emit();return;}
      try{auth=JSON.parse(session.get(AUTH)||'null');if(!auth?.uid||!auth.refreshToken)auth=null;}catch{auth=null;}
      if(auth)await connect();else emit();
    },
  };
  return service;
}
