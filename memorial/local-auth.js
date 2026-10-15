(function(){
  'use strict';
  const key='memorial-local-users-v1';
  const legacyKey='memorial-registered-account';
  const iterations=210000;
  const encoder=new TextEncoder();
  const hex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  const bytes=hexValue=>new Uint8Array(hexValue.match(/.{2}/g).map(part=>parseInt(part,16)));
  function users(){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch(_){return{}}
  }
  async function digest(password,salt,rounds=iterations){
    const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
    return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations:rounds,hash:'SHA-256'},material,256)));
  }
  async function record(id,name,password){
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    return {accountId:id,name,salt,iterations,hash:await digest(password,salt)};
  }
  function newId(existing){
    for(let attempt=0;attempt<100;attempt++){
      const random=crypto.getRandomValues(new Uint32Array(2));
      const id=String(1000000000+Number(((BigInt(random[0])<<32n)|BigInt(random[1]))%9000000000n));
      if(id!=='guest-invite'&&!existing[id])return id;
    }
    throw new Error('暂时无法生成账号，请重试。');
  }
  async function create(name,password){
    const existing=users();
    const normalized=name.trim().normalize('NFKC').toLocaleLowerCase();
    if(Object.values(existing).some(user=>(user.name||'').trim().normalize('NFKC').toLocaleLowerCase()===normalized))throw new Error('昵称已被使用，请换一个昵称');
    const accountId=newId(existing);
    existing[accountId]=await record(accountId,name,password);
    localStorage.setItem(key,JSON.stringify(existing));
    return {accountId,name};
  }
  async function verify(identifier,password){
    const existing=users();
    const normalized=identifier.trim().normalize('NFKC').toLocaleLowerCase();
    const matches=existing[identifier]?[existing[identifier]]:Object.values(existing).filter(user=>(user.name||'').trim().normalize('NFKC').toLocaleLowerCase()===normalized);
    for(const user of matches){
      if(user?.salt&&user?.hash&&Number.isInteger(user.iterations)){
        const actual=await digest(password,user.salt,user.iterations);
        if(actual===user.hash)return {accountId:user.accountId,name:user.name||user.accountId};
      }
    }
    let legacy;
    try{legacy=JSON.parse(localStorage.getItem(legacyKey)||'null')}catch(_){legacy=null}
    if(legacy&&(identifier===(legacy.accountId||legacy.phone)||(legacy.name||'').trim().normalize('NFKC').toLocaleLowerCase()===normalized)&&password===legacy.password){
      const accountId=legacy.accountId||legacy.phone;
      existing[accountId]=await record(accountId,legacy.name||accountId,password);
      localStorage.setItem(key,JSON.stringify(existing));
      localStorage.removeItem(legacyKey);
      return {accountId,name:legacy.name||accountId};
    }
    return null;
  }
  async function changePassword(accountId,oldPassword,newPassword){
    if(!await verify(accountId,oldPassword))return false;
    const existing=users();
    existing[accountId]=await record(accountId,existing[accountId].name||accountId,newPassword);
    localStorage.setItem(key,JSON.stringify(existing));
    return true;
  }
  function profile(accountId){
    const user=users()[accountId];
    if(user)return {accountId,name:user.name||accountId};
    try{
      const legacy=JSON.parse(localStorage.getItem(legacyKey)||'null');
      if(legacy&&accountId===(legacy.accountId||legacy.phone))return {accountId,name:legacy.name||accountId};
    }catch(_){}
    return {accountId,name:accountId};
  }
  window.memorialLocalAuth={create,verify,changePassword,profile};
})();
