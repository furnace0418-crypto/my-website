// Only remove records owned by the explicitly confirmed local account.
window.deleteMemorialLocalAccount=function(id){
  const read=(key,fallback)=>JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));
  const users=read('memorial-local-users-v1',{}),profile=window.memorialLocalAuth.profile(id);
  const belongs=entry=>entry&&(entry.accountId?entry.accountId===id:entry.by===profile.name);
  const halls=read('memorial-halls',[]),owned=halls.filter(h=>h.creatorId?h.creatorId===id:h.creator===profile.name);
  const removals=[`memorial-user-avatar-${id}`,`annian-glass-lamp-v3-${id}`];
  owned.forEach(h=>removals.push(`memorial-hall-photos-${h.id}`,`annian-glass-lamp-hall-v1-${h.id}`));
  const writes={
    'memorial-halls':halls.filter(h=>!owned.includes(h)).map(h=>({...h,records:(h.records||[]).filter(r=>!belongs(r))})),
    'memorial-login-history':read('memorial-login-history',[]).filter(value=>value!==id)
  };
  for(const key of ['chen-zhenzhen-wishes','zhang-wenhua-wishes','zheng-xiuqin-wishes','chen-zhenzhen-offerings']){
    if(localStorage.getItem(key)!==null)writes[key]=read(key,[]).filter(entry=>!belongs(entry));
  }
  for(const key of ['memorial-registered-account','memorial-account']){const user=read(key,null);if(user&&(user.accountId||user.phone)===id)removals.push(key);}
  delete users[id];writes['memorial-local-users-v1']=users;
  // Roll back if storage becomes unavailable midway through deletion.
  const keys=[...new Set([...Object.keys(writes),...removals])],backup=new Map(keys.map(key=>[key,localStorage.getItem(key)]));
  try{for(const [key,value] of Object.entries(writes))localStorage.setItem(key,JSON.stringify(value));removals.forEach(key=>localStorage.removeItem(key));}
  catch(error){for(const [key,value] of backup){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch(_){}}throw error;}
};
