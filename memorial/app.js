const app=document.querySelector('#app');
const inviteGlitchAudio=new Audio('assets/invite-jumpscare.mp3');
inviteGlitchAudio.preload='auto';
inviteGlitchAudio.volume=.9;
inviteGlitchAudio.load();
const InviteAudioContext=window.AudioContext||window.webkitAudioContext;
const inviteAudioContext=InviteAudioContext?new InviteAudioContext():null;
let inviteAudioBuffer=null;
if(inviteAudioContext)fetch('assets/invite-jumpscare.mp3').then(response=>response.arrayBuffer()).then(data=>inviteAudioContext.decodeAudioData(data)).then(buffer=>inviteAudioBuffer=buffer).catch(()=>{});
const fortuneVideoUrl=new URL('assets/invite-home-v2.mp4',document.baseURI).href;
let fortuneVideoCachePromise;
let fortuneVideoObjectUrl;
function startFortuneVideoCache(){
  if(!('caches' in window)||fortuneVideoCachePromise)return;
  fortuneVideoCachePromise=(async()=>{
    const cache=await caches.open('memorial-fortune-video-v2');
    if(!await cache.match(fortuneVideoUrl)){
      const response=await fetch(fortuneVideoUrl,{cache:'force-cache',priority:'low'});
      if(!response.ok)throw new Error('Video download failed');
      await cache.put(fortuneVideoUrl,response);
    }
    return cache;
  })().catch(()=>null);
}
async function useCachedFortuneVideo(video){
  if(!video)return;
  if(!fortuneVideoCachePromise)startFortuneVideoCache();
  const cache=await fortuneVideoCachePromise;
  if(!cache)return;
  try{
    if(!fortuneVideoObjectUrl){
      const response=await cache.match(fortuneVideoUrl);
      if(!response)return;
      fortuneVideoObjectUrl=URL.createObjectURL(await response.blob());
    }
    if(video.isConnected&&video.paused&&video.currentTime===0){
      video.src=fortuneVideoObjectUrl;
      video.load();
    }
  }catch(_){}
}
if(document.readyState==='complete')setTimeout(startFortuneVideoCache,400);
else addEventListener('load',()=>setTimeout(startFortuneVideoCache,400),{once:true});
const navigation=performance.getEntriesByType?.('navigation')?.[0];
if(navigation?.type==='reload'||(!navigation&&performance.navigation?.type===1)){
  history.replaceState(null,'',location.pathname+location.search+'#home');
}
let pendingBrowseQuery='';
const nameSearchHistory=[];
function rememberNameSearch(name){
  const query=name.trim();
  if(!query)return;
  const existing=nameSearchHistory.indexOf(query);
  if(existing!==-1)nameSearchHistory.splice(existing,1);
  nameSearchHistory.unshift(query);
  if(nameSearchHistory.length>8)nameSearchHistory.length=8;
}
function attachNameSearchHistory(form){
  const input=form.querySelector('input');
  form.autocomplete='off';
  input.autocomplete='off';
  const panel=document.createElement('div');
  panel.className='name-search-history';
  panel.hidden=true;
  form.appendChild(panel);
  const render=()=>{
    const query=input.value.trim();
    const matches=nameSearchHistory.filter(name=>!query||name.includes(query));
    panel.hidden=!matches.length;
    if(panel.hidden){panel.replaceChildren();return}
    const header=document.createElement('div');header.className='name-search-history-head';
    const title=document.createElement('span');title.textContent='最近搜索';
    const clear=document.createElement('button');clear.type='button';clear.className='name-search-history-clear';clear.textContent='清空';
    clear.onclick=()=>{nameSearchHistory.length=0;render();input.focus()};
    header.append(title,clear);panel.replaceChildren(header);
    for(const name of matches){
      const row=document.createElement('div');row.className='name-search-history-row';
      const choose=document.createElement('button');choose.type='button';choose.className='name-search-history-choose';choose.textContent=name;
      choose.onclick=()=>{input.value=name;panel.hidden=true;form.requestSubmit()};
      const remove=document.createElement('button');remove.type='button';remove.className='name-search-history-remove';remove.setAttribute('aria-label',`删除${name}的搜索记录`);remove.textContent='×';
      remove.onclick=()=>{nameSearchHistory.splice(nameSearchHistory.indexOf(name),1);render();input.focus()};
      row.append(choose,remove);panel.appendChild(row);
    }
  };
  input.addEventListener('focus',render);
  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{if(event.key==='Escape')panel.hidden=true});
  form.addEventListener('focusout',()=>setTimeout(()=>{if(!form.contains(document.activeElement))panel.hidden=true},0));
}
let inviteAccessGranted=false;
let inviteTransitionPending=false;
const saved=()=>JSON.parse(localStorage.getItem('memorial-halls')||'[]');
const hallPhotoKey=id=>`memorial-hall-photos-${id}`;
const hallPhotos=id=>{try{return JSON.parse(localStorage.getItem(hallPhotoKey(id))||'[]')}catch{return []}};
function wireHallPhotos(form){
  const input=form.querySelector('[name="hallPhotos"]'),list=form.querySelector('.hall-photo-list'),message=form.querySelector('.hall-photo-message');
  let photos=[];
  const render=()=>{list.replaceChildren();photos.forEach((source,index)=>{const item=document.createElement('div');item.className='hall-photo-item';const image=document.createElement('img');image.src=source;image.alt='逝者照片';const remove=document.createElement('button');remove.type='button';remove.textContent='移除';remove.setAttribute('aria-label','移除逝者照片');remove.onclick=()=>{photos.splice(index,1);render()};item.append(image,remove);list.append(item)})};
  input.onchange=async()=>{message.textContent='';const file=input.files[0];if(!file)return;const submit=form.querySelector('[type="submit"]');submit.disabled=true;try{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('请选择不超过 10 MB 的 JPG、PNG 或 WebP 图片');const url=URL.createObjectURL(file);try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});const scale=Math.min(1,1000/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);photos=[canvas.toDataURL('image/jpeg',.78)]}finally{URL.revokeObjectURL(url)}render()}catch(error){message.textContent=error.message}finally{submit.disabled=false;input.value=''}};
  return {load(id){photos=hallPhotos(id).slice(0,1);render()},save(id){try{if(photos.length)localStorage.setItem(hallPhotoKey(id),JSON.stringify(photos));else localStorage.removeItem(hallPhotoKey(id));return true}catch{message.textContent='照片存储空间不足，请更换图片后重试';return false}}};
}
const previousAccount=JSON.parse(localStorage.getItem('memorial-account')||'null');
if(previousAccount?.password&&previousAccount.accountId!=='guest-invite'&&!localStorage.getItem('memorial-registered-account'))localStorage.setItem('memorial-registered-account',JSON.stringify(previousAccount));
localStorage.removeItem('memorial-account');
localStorage.removeItem('memorial-invite-theme');
const account=()=>JSON.parse(localStorage.getItem('memorial-account')||'null');
const avatarFor=id=>id?localStorage.getItem(`memorial-user-avatar-${id}`):null;
async function saveUserAvatar(id,file){
  const objectUrl=URL.createObjectURL(file);
  try{
    const photo=new Image();
    await new Promise((resolve,reject)=>{photo.onload=resolve;photo.onerror=reject;photo.src=objectUrl});
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d');
    const size=Math.min(photo.naturalWidth,photo.naturalHeight);
    context.drawImage(photo,(photo.naturalWidth-size)/2,(photo.naturalHeight-size)/2,size,size,0,0,256,256);
    localStorage.setItem(`memorial-user-avatar-${id}`,canvas.toDataURL('image/jpeg',.82));
    return true;
  }catch(_){return false}finally{URL.revokeObjectURL(objectUrl)}
}
const loginHistoryKey='memorial-login-history';
function recentLoginAccounts(){
  try{
    const entries=JSON.parse(localStorage.getItem(loginHistoryKey)||'[]');
    return Array.isArray(entries)?entries.filter(id=>typeof id==='string'&&id!=='guest-invite'&&id.length<=32).slice(0,5):[];
  }catch(_){return[]}
}
function rememberLoginAccount(id){
  if(!id||id==='guest-invite')return;
  localStorage.setItem(loginHistoryKey,JSON.stringify([id,...recentLoginAccounts().filter(entry=>entry!==id)].slice(0,5)));
}
const applyInviteTheme=()=>document.body.classList.toggle('invite-theme',localStorage.getItem('memorial-invite-theme')==='1');
applyInviteTheme();
const inviteVideoState={paused:false,muted:false,volume:.75,currentTime:0};
let inviteVideoDelayUntil=0;
const rememberInviteVideo=()=>{const video=document.querySelector('.invite-video-hero video[data-enhanced="1"]');if(!video)return;inviteVideoState.paused=video.paused;inviteVideoState.muted=video.muted;inviteVideoState.volume=video.volume;inviteVideoState.currentTime=Number.isFinite(video.currentTime)?video.currentTime:0};
const videoControlsObserver=new MutationObserver(()=>document.querySelectorAll('.invite-video-hero video').forEach(video=>{if(!document.body.classList.contains('invite-theme')||video.dataset.enhanced)return;video.dataset.enhanced='1';video.autoplay=false;video.src=video.dataset.src;video.controls=true;video.volume=inviteVideoState.volume;video.muted=inviteVideoState.muted;video.addEventListener('loadedmetadata',()=>{if(inviteVideoState.currentTime>0&&inviteVideoState.currentTime<video.duration)video.currentTime=inviteVideoState.currentTime},{once:true});video.addEventListener('pause',()=>inviteVideoState.paused=true);video.addEventListener('play',()=>inviteVideoState.paused=false);video.addEventListener('volumechange',()=>{inviteVideoState.muted=video.muted;inviteVideoState.volume=video.volume});const start=()=>{if(!video.isConnected||!document.body.classList.contains('invite-theme')||inviteVideoState.paused)return;video.play().catch(()=>{video.muted=true;inviteVideoState.muted=true;video.play().catch(()=>{})})};setTimeout(start,Math.max(0,inviteVideoDelayUntil-performance.now()))}));
videoControlsObserver.observe(app,{childList:true,subtree:true});
const demo={id:'demo',name:'阿乐',birth:'2024年08月21日',death:'2024年08月21日',creator:'admin',bio:'123123',records:[{type:'点烛',by:'admin',at:'2024年08月21日 21:30',text:'点燃了一支蜡烛，照亮前路'},{type:'上香',by:'admin',at:'2024年08月21日 21:28',text:'献上了一炷香，寄托哀思'},{type:'献花',by:'admin',at:'2024年08月21日 21:28',text:'献上了一束花，表达怀念'}]};
const zhenzhen={id:'chen-zhenzhen',name:'陈珍珍',birth:'2004年03月14日',death:'2024年',creator:'安念堂',bio:'愿你在另一处，获得平静。',records:[]};
const zhangwenhua={id:'zhang-wenhua',name:'张文华',birth:'1976年08月17日',death:'2013年11月03日',creator:'安念堂',bio:'张文华生于云阳，2013年于云阳市家中离世。',records:[]};
const zhengxiuqin={id:'zheng-xiuqin',name:'郑秀琴',birth:'1975年',death:'2005年05月12日',creator:'安念堂',bio:'郑秀琴生于云阳，2005年于云阳市城南区离世。',records:[]};
const halls=()=>[zhenzhen,zhangwenhua,zhengxiuqin,demo,...saved()];
const searchableHalls=()=>halls().filter(h=>!document.body.classList.contains('invite-theme')||(['chen-zhenzhen','zhang-wenhua','zheng-xiuqin','demo'].includes(h.id)&&!(h.id==='chen-zhenzhen'&&!window.memorialRegistrationState?.chen)));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(form,name)=>form.elements.namedItem(name).value;
const dateText=()=>new Date().toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const offeringKey='chen-zhenzhen-offerings';
try{localStorage.removeItem(offeringKey)}catch(_){}
let offeringState={};
const offerings=()=>offeringState;
const saveOffering=type=>(offeringState={...offeringState,[type]:true});
let zhangOfferingState={};
let chenRegistrationNoticeShown=false;
let chenRegistrationNoticePending=false;
function queueChenRegistrationNotice(){
  if(chenRegistrationNoticeShown||chenRegistrationNoticePending||window.memorialRegistrationState?.chen||document.body.classList.contains('invite-theme'))return;
  if(offerings().flower&&offerings().lamp){
    chenRegistrationNoticePending=true;
  }
}
function showChenRegistrationNotice(){
  if(chenRegistrationNoticeShown||!chenRegistrationNoticePending)return;
  if(window.memorialRegistrationState?.chen){chenRegistrationNoticePending=false;return}
  if(document.body.classList.contains('invite-theme')){chenRegistrationNoticePending=false;return}
  if(location.hash.startsWith('#services'))return;
  const flowerConfirm=document.querySelector('.flower-confirm');
  if(flowerConfirm&&!flowerConfirm.hidden)return;
  chenRegistrationNoticePending=false;
  chenRegistrationNoticeShown=true;
  const notice=document.createElement('div');
  notice.className='chen-registration-notice';
  notice.setAttribute('role','alert');
  notice.innerHTML='<section><p>该居民尚未完成登记，请联系管理员。</p><small>桃原市纪念馆</small></section>';
  document.body.appendChild(notice);
  setTimeout(()=>notice.remove(),3000);
}
window.memorialLampBridge={recordLamp:id=>{if(id==='zhang-wenhua')zhangOfferingState={...zhangOfferingState,lamp:true};else if(id==='chen-zhenzhen'){saveOffering('lamp');queueChenRegistrationNotice('lamp')}}};
const offeringText=state=>state.flower&&state.lamp?'你已经献花，并点燃长明灯了。':state.flower?'你已经献花了。':state.lamp?'你已经点燃长明灯了。':'你还没有进行祭奠。';
const wishKey='chen-zhenzhen-wishes';
const memorialWishes=()=>{try{const entries=JSON.parse(localStorage.getItem(wishKey)||'[]');return Array.isArray(entries)?entries:[]}catch(_){return[]}};
function applyOfferingIcons(){
  app.querySelectorAll('.service-grid b,.tribute-person b').forEach(element=>{
    if(element.textContent.includes('♨')&&/[❀✿]/u.test(element.textContent)){
      element.innerHTML='<img class="flower-symbol" src="assets/flower-symbol.webp?v=2" alt=""><span>献花并</span><img class="lamp-symbol" src="assets/lamp-symbol.webp?v=1" alt=""><span>点燃长明灯</span>';
    }else if(element.textContent.includes('♨')){
      const label=element.closest('.tribute-person')?'点燃长明灯':'';
      element.innerHTML=`<img class="lamp-symbol" src="assets/lamp-symbol.webp?v=1" alt="">${label?`<span>${label}</span>`:''}`;
    }else if(/[❀✿]/u.test(element.textContent)){
      const label=element.closest('.tribute-person')?'献花':'';
      element.innerHTML=`<img class="flower-symbol" src="assets/flower-symbol.webp?v=2" alt="">${label?`<span>${label}</span>`:''}`;
    }
  });
  const flowerButton=app.querySelector('.life-flower');
  if(flowerButton)flowerButton.innerHTML='<img class="flower-symbol" src="assets/flower-symbol.webp?v=2" alt="">献花';
  const flowerDialogIcon=app.querySelector('.flower-confirm-icon');
  if(flowerDialogIcon)flowerDialogIcon.innerHTML='<img class="flower-symbol" src="assets/flower-symbol.webp?v=2" alt="">';
  const genericFlower=app.querySelector('[data-rite="献花"]');
  if(genericFlower)genericFlower.innerHTML='<img class="flower-symbol" src="assets/flower-symbol.webp?v=2" alt="">献花';
  const mailbox=[...app.querySelectorAll('.service-grid a')].find(link=>link.querySelector('strong')?.textContent==='时空信箱');
  if(mailbox)mailbox.querySelector('b').innerHTML='<img class="letter-symbol" src="assets/letter-symbol.webp?v=1" alt="">';
  for(const [label,name] of [['创建纪念馆','memorial'],['留言寄思','message']]){
    const link=[...app.querySelectorAll('.service-grid a')].find(item=>item.querySelector('strong')?.textContent===label);
    if(link)link.querySelector('b').innerHTML=`<img class="${name}-symbol" src="assets/${name}-symbol.png?v=1" alt="">`;
  }
  app.querySelectorAll('.service-grid a').forEach(item=>{
    item.removeAttribute('href');
    item.setAttribute('aria-disabled','true');
    item.tabIndex=-1;
  });
}
function decoratePortalFrames(){
  const intro=app.querySelector('.platform-intro'),values=app.querySelector('.portal-values');
  if(intro&&values){
    const overview=document.createElement('section');
    overview.className='overview-frame';
    intro.before(overview);
    overview.append(intro,values);
  }
  for(const panel of app.querySelectorAll('.overview-frame,.service-panel,.notice-panel,.about-panel')){
    panel.classList.add('ornate-frame');
    for(const position of ['top-left','top-right','bottom-right','bottom-left']){
      const corner=document.createElement('span');
      corner.className=`ornate-frame-corner ${position}`;
      corner.setAttribute('aria-hidden','true');
      panel.appendChild(corner);
    }
  }
}
addEventListener('message',event=>{
  const iframe=document.querySelector('iframe[src^="lantern.html?memorial="]');
  if(event.origin!==location.origin||event.source!==iframe?.contentWindow)return;
  const memorialId=new URL(iframe.src).searchParams.get('memorial');
  if(event.data?.type==='memorial-offering'&&event.data.offering==='lamp')window.memorialLampBridge.recordLamp(memorialId);
  if(event.data?.type==='memorial-return')location.hash=`#hall/${memorialId}/tributes`;
  if(event.data?.type==='memorial-wish'){
    const message=String(event.data.message||'').trim().slice(0,40);
    if(!message)return;
    const by=document.body.classList.contains('invite-theme')?'特邀访客':'普通用户';
    const entry={by,message,at:dateText()};
    const key=memorialId==='zhang-wenhua'?'zhang-wenhua-wishes':wishKey;
    try{const previous=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([entry,...previous].slice(0,50)))}catch(_){}
  }
});
function toggleInviteTheme(){
  if(document.body.classList.contains('theme-glitch'))return;
  rememberInviteVideo();
  const turningDark=!document.body.classList.contains('invite-theme');
  const fx=document.createElement('div');
  fx.className='theme-glitch-fx';
  fx.setAttribute('aria-hidden','true');
  fx.innerHTML=`<svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="ink-rough" x="-18%" y="-18%" width="136%" height="136%"><feTurbulence type="fractalNoise" baseFrequency=".015 .025" numOctaves="2" seed="17" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="B"/></filter></defs><g class="ink-main" filter="url(#ink-rough)"><path d="M-140 720C-82 521 35 401 183 359c96-27 126-99 225-124 135-34 247 25 316 111 55 68 48 153 154 180 132 34 216-81 351-55 180 35 288 178 426 342l45 177H-140Z"/><path d="M-118 48c151-62 281-15 367 67 90 86 191 38 306 67 140 35 211 139 196 248-16 116-132 138-238 149-152 16-203 119-351 83C40 632-79 543-128 407Z"/><path d="M1690-24c-127 5-237 61-305 150-62 81-34 169-131 222-112 61-217 4-315 88-89 76-116 196-65 295 68 132 240 139 394 102 148-36 243 50 392-15Z"/><path d="M-90-90h1780v247c-154-13-224 101-366 91-132-9-174-111-301-91-116 18-145 126-276 122-140-4-193-128-328-105-105 18-157 102-268 75C66 218-8 143-90 179Z"/></g><g class="ink-specks"><circle cx="236" cy="225" r="18"/><circle cx="302" cy="177" r="8"/><circle cx="1148" cy="194" r="14"/><circle cx="1278" cy="268" r="7"/><circle cx="941" cy="711" r="11"/><circle cx="1064" cy="756" r="6"/><circle cx="546" cy="641" r="9"/><circle cx="1398" cy="576" r="16"/></g></svg><span></span>`;
  document.body.appendChild(fx);
  document.body.classList.add('theme-glitch');
  setTimeout(()=>{
    if(turningDark)localStorage.setItem('memorial-invite-theme','1');
    else localStorage.removeItem('memorial-invite-theme');
    applyInviteTheme();
    if(turningDark&&location.hash!=='#home')location.hash='#home';
    else route();
  },720);
  setTimeout(()=>{document.body.classList.remove('theme-glitch');fx.remove()},1550);
}
function activateInviteAccess(){
  if(inviteTransitionPending)return;
  inviteTransitionPending=true;
  inviteAccessGranted=true;
  localStorage.setItem('memorial-invite-theme','1');
  inviteVideoDelayUntil=performance.now()+2350;
  inviteAudioContext?.resume().catch(()=>{});
  setTimeout(()=>{playInviteGlitchSound();playInviteEntryFx();applyInviteTheme();if(location.hash==='#home')route();else location.hash='#home'},950);
  setTimeout(()=>inviteTransitionPending=false,2400);
}
function showInviteVerification(){
  document.querySelector('.invite-prompt.invite-recheck')?.remove();
  const prompt=document.createElement('div');
  prompt.className='invite-prompt invite-recheck';
  prompt.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="invite-recheck-title"><button class="invite-close" type="button" aria-label="关闭验证窗口">×</button><h2 id="invite-recheck-title">特邀访问权限验证</h2><p>该邀请码用于验证特邀访客身份。完成验证后，可进入特邀主题并访问相应内容；如暂不验证，仍可继续使用普通用户功能。</p><label><span>特邀邀请码</span><input class="invite-recheck-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="请输入特邀邀请码"></label><small class="invite-recheck-error" role="alert"></small><div><button class="invite-skip" type="button">暂不验证</button><button class="invite-confirm" type="button">验证并进入</button></div></section>`;
  document.body.appendChild(prompt);
  const code=prompt.querySelector('.invite-recheck-code'),error=prompt.querySelector('.invite-recheck-error');
  const close=()=>prompt.remove();
  prompt.querySelector('.invite-close').onclick=close;
  prompt.querySelector('.invite-skip').onclick=close;
  const confirm=prompt.querySelector('.invite-confirm');
  confirm.onclick=async()=>{if(inviteTransitionPending||confirm.disabled)return;confirm.disabled=true;try{if(!await window.memorialGateVerify('invite',{code:code.value})){error.textContent='邀请码无效，请核对后重新输入。';code.focus();return}close();activateInviteAccess()}catch(_){error.textContent='验证暂时不可用，请稍后重试。'}finally{confirm.disabled=false}};
  prompt.onclick=e=>{if(e.target===prompt)close()};
  code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();prompt.querySelector('.invite-confirm').click()}};
  code.focus();
}
function header(){
  window.syncMemorialRegistration?.();
  const user=account(),name=document.querySelector('#accountName'),exit=document.querySelector('#exitLink'),registerLink=document.querySelector('.account-register'),login=document.querySelector('.account-login'),avatar=document.querySelector('#accountAvatar'),mode=document.querySelector('#accountMode'),articlesLink=document.querySelector('#articlesLink');
  const signedIn=Boolean(user),darkTheme=document.body.classList.contains('invite-theme');
  document.querySelector('.header-account')?.classList.toggle('signed-in',signedIn);
  if(name){name.textContent='登录';name.hidden=signedIn}
  if(avatar){avatar.hidden=false;const image=avatar.querySelector('img'),source=avatarFor(user?.accountId);image.hidden=!source;if(source)image.src=source;else image.removeAttribute('src')}
  if(mode){mode.hidden=!signedIn;mode.textContent=darkTheme?'特邀访客':'普通用户';mode.title=darkTheme?'切换至普通用户':inviteAccessGranted?'切换至特邀访客':'输入邀请码，切换至特邀访客';mode.onclick=darkTheme||inviteAccessGranted?toggleInviteTheme:showInviteVerification}
  if(exit)exit.hidden=!user;
  if(registerLink)registerLink.hidden=signedIn;
  if(articlesLink)articlesLink.textContent='资讯';
  if(login){login.href=signedIn?'#me':'#login';login.title=signedIn?'进入我的页面':'';login.setAttribute('aria-label',signedIn?'进入我的页面':'登录');login.onclick=null;}
}
function home(){app.innerHTML=`<section class="invite-hero-copy"><h1>欢迎来到桃原市</h1><p>安念堂由福善文化研究会发起，致力于保存城市记忆，传承生命故事，<br>让每一份思念都有安放之地。</p><form class="hero-search" action="#browse"><span>⌕</span><input aria-label="搜索逝者" placeholder="输入姓名，追忆故人"><button type="submit">搜索</button><small class="hero-search-error" hidden></small></form></section><section class="portal-hero"><div class="portal-hero-inner"><h1>为逝者留名，为思念留处</h1><p>安念堂由福善文化研究会发起，致力于保存城市记忆，传承生命故事，<br>让每一份思念都有安放之地。</p><form class="hero-search" action="#browse"><span>⌕</span><input aria-label="搜索逝者" placeholder="输入姓名，追忆故人"><button type="submit">搜索</button><small class="hero-search-error" hidden></small></form></div></section><section class="portal-main"><div class="platform-intro section-heading"><h2><span>︽</span> 平台简介 <span>︾</span></h2><p>安念堂是面向社会的公益性网络纪念平台。<br>我们以数字化的方式，保存逝者生平事迹，传承家族记忆，倡导文明祭祀，弘扬中华优秀传统文化，<br>让思念跨越时空，让记忆生生不息。</p></div><div class="values portal-values"><article class="value-card"><div class="value-icon"><img src="assets/value-civilized-rites.webp" alt=""></div><div><h3>文明祭祀</h3><p>摒弃传统祭祀的陋习，用绿色环保的方式寄托哀思，减少资源消耗和环境污染。</p></div></article><article class="value-card"><div class="value-icon"><img src="assets/value-across-time.webp" alt=""></div><div><h3>跨越时空</h3><p>无论身在何处，都能随时缅怀逝者，打破地域限制，让思念不再受距离阻隔。</p></div></article><article class="value-card"><div class="value-icon"><img src="assets/value-memory-legacy.webp" alt=""></div><div><h3>记忆传承</h3><p>记录逝者生平事迹，构建家族记忆档案，让后人能够了解先辈故事。</p></div></article></div><div class="portal-lower"><section class="service-panel"><div class="section-heading"><h2><span>︽</span> 服务介绍 <span>︾</span></h2><p>以科技传递思念，用文化守护记忆</p></div><div class="service-grid"><a href="#create"><b>⌂</b><strong>创建纪念馆</strong><span>为逝者建立一处永恒的纪念空间</span></a><a href="#browse"><b>❀</b><strong>网上献花</strong><span>以花寄情，遥表思念</span></a><a href="#services"><b>♨</b><strong>点亮长明灯</strong><span>一盏微光，长照思念</span></a><a href="#letters"><b>▤</b><strong>留言寄思</strong><span>写下你想对他说的话</span></a><a href="#letters"><b>✉</b><strong>时空信箱</strong><span>给逝去的亲人写一封信</span></a></div></section><aside class="notice-panel"><div class="section-heading"><h2><span>︽</span> 研究会公告 <span>︾</span></h2><p>发布公益纪念项目动态与文明祭祀倡议</p></div><ul><li><span>关于安念堂公益纪念平台正式上线的公告</span><time>2024-04-01</time></li><li><span>清明节网络祭祀倡议书</span><time>2024-03-28</time></li><li><span>关于纪念馆内容审核与管理的说明</span><time>2024-02-15</time></li><li><span>福善文化研究会2024年工作计划</span><time>2024-01-20</time></li></ul></aside></div><section class="about-panel"><div class="section-heading"><h2><span>︽</span> 关于我们 <span>︾</span></h2><p>让城市记住每一个平凡而珍贵的生命</p></div><div class="about-copy"><p>安念堂是福善文化研究会发起的公益纪念项目。我们关注生命故事的保存与家族记忆的传承，希望借助温和、庄重的数字方式，为每一份思念提供长久安放的空间。</p><p>平台倡导文明、节俭、绿色的纪念方式，并持续整理地方人物故事、家庭影像与口述资料，让普通人的生命经历也能被认真记录、被后人看见。</p></div></section></section>`;document.querySelectorAll('.hero-search').forEach(form=>form.onsubmit=e=>{e.preventDefault();const q=e.currentTarget.querySelector('input').value.trim(),error=e.currentTarget.querySelector('.hero-search-error');if(!q){error.textContent='请输入要搜索的姓名';error.hidden=false;return}const found=searchableHalls().filter(h=>h.name.includes(q));if(!found.length){error.textContent='未找到相关纪念馆';error.hidden=false;return}error.hidden=true;pendingBrowseQuery=q;location.hash='#browse'});}
function showEntryInvitePrompt(){
  document.querySelector('.invite-entry-prompt')?.remove();
  const prompt=document.createElement('div');
  prompt.className='invite-prompt invite-entry-prompt';
  prompt.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="invite-entry-title"><button class="invite-close" type="button" aria-label="关闭">×</button><h2 id="invite-entry-title">你有邀请码吗？</h2><p>有邀请码可进入特邀主题；没有邀请码也可以正常使用安念堂。</p><label><span>特邀邀请码</span><input inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="请输入邀请码"></label><small role="alert"></small><div><button class="invite-skip" type="button">暂不验证</button><button class="invite-confirm" type="button">验证并进入</button></div></section>';
  document.body.append(prompt);
  const code=prompt.querySelector('input'),error=prompt.querySelector('small');
  const ordinary=()=>{prompt.remove();inviteAccessGranted=false;localStorage.removeItem('memorial-invite-theme');applyInviteTheme();header();if(location.hash==='#home')route();else location.hash='#home'};
  prompt.querySelector('.invite-close').onclick=ordinary;
  prompt.querySelector('.invite-skip').onclick=ordinary;
  prompt.querySelector('.invite-confirm').onclick=async()=>{const button=prompt.querySelector('.invite-confirm');if(button.disabled)return;button.disabled=true;try{if(!await window.memorialGateVerify('invite',{code:code.value})){error.textContent='邀请码无效，请核对后重新输入。';code.focus();return}prompt.remove();activateInviteAccess()}catch(_){error.textContent='验证暂时不可用，请稍后重试。'}finally{button.disabled=false}};
  code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();prompt.querySelector('.invite-confirm').click()}};
  prompt.onclick=e=>{if(e.target===prompt)ordinary()};
  code.focus();
}
function register(){
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>用户注册</h1></div><form class="form-body" id="registerForm" autocomplete="off"><div class="message" id="formMessage" hidden></div><label class="avatar-upload"><span class="avatar-preview"><img alt="头像预览" hidden></span><strong>选择头像</strong><input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传头像"></label><label class="field"><span>昵称</span><input name="annianRegisterName" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="请输入昵称" maxlength="24" required></label><label class="field"><span>设置密码</span><input name="password" type="password" autocomplete="new-password" placeholder="至少 8 位" minlength="8" required></label><label class="check"><input type="checkbox" name="terms" required>我已阅读并同意用户协议和隐私政策</label><button class="btn" type="submit">注册</button><p class="fine-print">已有账号？ <a href="#login">立即登录</a></p></form></div></div>`;
  const registerForm=document.querySelector('#registerForm');
  registerForm.noValidate=true;
  const fieldHint=input=>{
    const hint=document.createElement('div');
    hint.className='message field-hint';hint.setAttribute('role','alert');hint.hidden=true;
    input.closest('.field').after(hint);
    input.addEventListener('input',()=>{hint.hidden=true});
    return hint;
  };
  const passwordHint=fieldHint(registerForm.elements.namedItem('password'));
  const avatarInput=registerForm.elements.namedItem('avatar');
  avatarInput.onchange=()=>{const file=avatarInput.files[0],image=registerForm.querySelector('.avatar-preview img');if(image.dataset.preview)URL.revokeObjectURL(image.dataset.preview);if(file){image.dataset.preview=URL.createObjectURL(file);image.src=image.dataset.preview;image.hidden=false}else{image.hidden=true;image.removeAttribute('src')}};
  registerForm.onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget,message=document.querySelector('#formMessage');
    const nickname=field(form,'annianRegisterName').trim(),password=field(form,'password');
    message.hidden=true;passwordHint.hidden=true;
    if(nickname.length<2||nickname.length>24){message.textContent='昵称需为 2 至 24 个字符';message.hidden=false;form.elements.namedItem('annianRegisterName').focus();return}
    if(password.length<8||password.length>128){passwordHint.textContent='密码需为 8 至 128 位';passwordHint.hidden=false;form.elements.namedItem('password').focus();return}
    if(avatarInput.files[0]&&(!['image/png','image/jpeg','image/webp'].includes(avatarInput.files[0].type)||avatarInput.files[0].size>8*1024*1024)){message.textContent='请选择不超过 8 MB 的 PNG、JPG 或 WebP 图片';message.hidden=false;return}
    if(!form.elements.namedItem('terms').checked){message.textContent='请先阅读并同意用户协议和隐私政策';message.hidden=false;return}
    const submit=form.querySelector('[type="submit"]');
    submit.disabled=true;
    try{
      const user=await window.memorialLocalAuth.create(nickname,password);
      if(avatarInput.files[0])await saveUserAvatar(user.accountId,avatarInput.files[0]);
      localStorage.setItem('memorial-account',JSON.stringify(user));
      rememberLoginAccount(user.accountId);
      header();
      showEntryInvitePrompt();
    }catch(error){message.textContent=error.message==='昵称已被使用，请换一个昵称'?error.message:'注册失败，请检查浏览器是否允许本地存储后重试。';message.hidden=false;submit.disabled=false}
  };
}
function playInviteGlitchSound(){
  if(inviteAudioBuffer&&inviteAudioContext?.state==='running'){
    const source=inviteAudioContext.createBufferSource();
    const gain=inviteAudioContext.createGain();
    source.buffer=inviteAudioBuffer;gain.gain.value=.9;
    source.connect(gain).connect(inviteAudioContext.destination);
    source.start(0,.82);
    return;
  }
  inviteGlitchAudio.currentTime=.82;
  inviteGlitchAudio.play().catch(()=>{});
}
function playInviteEntryFx(){
  document.querySelector('.invite-entry-fx')?.remove();
  const fx=document.createElement('div'),text=document.createElement('strong'),chars='魑魅魍魉卍▓▒░※卐亡祭祀禁忌零壹贰叁肆伍陆柒捌玖';
  fx.className='invite-entry-fx';text.className='invite-entry-text';fx.appendChild(text);document.body.appendChild(fx);
  const target='欢迎来到桃原市',started=performance.now();
  const timer=setInterval(()=>{const progress=Math.min(1,(performance.now()-started)/1250);const fixed=Math.floor(progress*target.length);let value='';for(let i=0;i<target.length;i++)value+=i<fixed?target[i]:chars[Math.floor(Math.random()*chars.length)];text.textContent=value;text.dataset.text=value;if(progress>=1)clearInterval(timer)},62);
  setTimeout(()=>{clearInterval(timer);fx.remove()},1400);
}
function login(){
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>用户登录</h1><p>回到安念堂，继续珍藏记忆</p></div><form class="form-body" id="loginForm" autocomplete="off"><div class="message" id="formMessage" hidden></div><label class="field"><span>昵称</span><input name="annianLoginName" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="请输入昵称" required></label><label class="field"><span>密码</span><input name="password" type="password" autocomplete="off" placeholder="请输入密码" required></label><button class="btn" type="submit">登录</button><p class="fine-print">还没有账号？ <a href="#register">立即注册</a></p></form></div></div>`;
  const form=document.querySelector('#loginForm');
  const accountInput=form.elements.namedItem('annianLoginName');
  const forgot=document.createElement('p');
  forgot.className='fine-print login-forgot';
  forgot.innerHTML='<button type="button">忘记密码？</button><span hidden>若已退出且不记得密码，请重新注册。</span>';
  form.querySelector('.fine-print').before(forgot);
  forgot.querySelector('button').onclick=()=>{forgot.querySelector('span').hidden=!forgot.querySelector('span').hidden};
  const picker=document.createElement('div');
  picker.className='login-nickname-picker';
  const nicknameField=accountInput.closest('.field');
  nicknameField.before(picker);
  picker.append(nicknameField);
  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='login-history-toggle';toggle.setAttribute('aria-label','展开最近登录的昵称');toggle.setAttribute('aria-expanded','false');
  const history=document.createElement('div');
  history.className='login-account-history';history.hidden=true;
  picker.append(toggle,history);
  const closeHistory=()=>{history.hidden=true;toggle.setAttribute('aria-expanded','false')};
  toggle.onclick=()=>{history.hidden=!history.hidden;toggle.setAttribute('aria-expanded',String(!history.hidden))};
  document.addEventListener('pointerdown',function closeOnOutside(event){if(!picker.isConnected){document.removeEventListener('pointerdown',closeOnOutside);return}if(!picker.contains(event.target))closeHistory()});
  const renderLoginHistory=()=>{
    const ids=recentLoginAccounts();
    history.replaceChildren();
    toggle.hidden=!ids.length;
    if(!ids.length){closeHistory();return}
    const title=document.createElement('p');title.textContent='最近登录';history.append(title);
    const list=document.createElement('div');list.className='login-account-list';history.append(list);
    for(const id of ids){
      const item=document.createElement('div');item.className='login-account-item';item.tabIndex=0;item.setAttribute('role','button');
      const savedProfile=window.memorialLocalAuth.profile(id);
      const portrait=document.createElement('span');portrait.className='login-history-avatar';
      const source=avatarFor(id);
      if(source){const image=document.createElement('img');image.src=source;image.alt='';portrait.append(image)}
      const label=document.createElement('span');label.className='login-history-name';label.textContent=savedProfile.name;
      const arrow=document.createElement('button');arrow.type='button';arrow.className='login-history-delete';arrow.textContent='×';arrow.setAttribute('aria-label',`删除用户 ${savedProfile.name}`);
      arrow.onclick=event=>{event.stopPropagation();if(!confirm(`确定删除用户“${savedProfile.name}”及其所有记录？\n将删除此浏览器内的账号、纪念馆、照片、长明灯及留言记录，此操作不可撤销。`))return;try{window.deleteMemorialLocalAccount(id);if(accountInput.value===savedProfile.name)accountInput.value='';renderLoginHistory();}catch(_){alert('删除失败，请检查浏览器存储权限后重试。');}};
      item.append(portrait,label,arrow);
      item.onclick=()=>{accountInput.value=savedProfile.name;closeHistory();form.elements.namedItem('password').focus()};
      item.onkeydown=event=>{if(event.target===item&&['Enter',' '].includes(event.key)){event.preventDefault();item.click();}};
      list.append(item);
    }
  };
  renderLoginHistory();
  form.onsubmit=async e=>{
    e.preventDefault();
    const f=e.currentTarget,nickname=field(f,'annianLoginName').trim(),password=field(f,'password');
    const message=f.querySelector('#formMessage'),submit=f.querySelector('[type="submit"]');
    message.hidden=true;submit.disabled=true;
    try{
      let user=await window.memorialLocalAuth.verify(nickname,password);
      if(!user){message.hidden=false;message.textContent='昵称或密码不正确';return}
      localStorage.setItem('memorial-account',JSON.stringify(user));
      rememberLoginAccount(user.accountId||user.phone);
      header();
      showEntryInvitePrompt();
    }catch(_){message.hidden=false;message.textContent='登录失败，请稍后重试。'}
    finally{submit.disabled=false}
  };
}
function changePasswordPage(){
  const user=account();
  if(!user||user.guest){location.hash='#login';return}
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>修改密码</h1><p>昵称 <span id="securityAccount"></span></p></div><form class="form-body" id="changePasswordForm"><div class="message" id="formMessage" hidden></div><label class="field"><span>当前密码</span><input name="current" type="password" autocomplete="current-password" required></label><label class="field"><span>新密码</span><input name="password" type="password" autocomplete="new-password" placeholder="至少 8 位" required></label><label class="field"><span>确认新密码</span><input name="confirm" type="password" autocomplete="new-password" required></label><button class="btn" type="submit">保存新密码</button></form></div></div>`;
  app.querySelector('.page-shell').insertAdjacentHTML('afterbegin','<a class="page-return-me" href="#me">← 返回我的</a>');
  app.querySelector('#securityAccount').textContent=user.name;
  app.querySelector('#changePasswordForm').onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget,message=form.querySelector('#formMessage'),submit=form.querySelector('[type="submit"]');
    const current=field(form,'current'),password=field(form,'password'),confirm=field(form,'confirm');
    message.hidden=false;message.classList.remove('ok');
    if(password.length<8||password.length>128){message.textContent='新密码需为 8 至 128 位';return}
    if(password!==confirm){message.textContent='两次新密码输入不一致';return}
    submit.disabled=true;
    try{
      if(!await window.memorialLocalAuth.changePassword(user.accountId,current,password)){message.textContent='当前密码不正确';return}
      form.reset();message.textContent='密码已更新，下次登录请使用新密码。';message.classList.add('ok');
    }catch(_){message.textContent='修改失败，请稍后重试。'}
    finally{submit.disabled=false}
  };
}
function browse(query=''){
  app.innerHTML=`<div class="page-shell"><h1 class="page-heading">浏览纪念馆</h1><form class="browse-tools" id="hallSearchForm"><svg class="browse-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><input class="search-input" id="hallSearch" placeholder="搜索逝者姓名"><button class="btn btn-gold" type="submit">搜索</button></form><div class="memorial-grid" id="hallGrid"></div></div>`;
  const grid=app.querySelector('#hallGrid'),input=app.querySelector('#hallSearch');
  input.value=query||pendingBrowseQuery;
  pendingBrowseQuery='';
  function draw(){
    const q=input.value.trim();
    if(!q){grid.innerHTML='<div class="empty">请输入故人姓名进行搜索</div>';return}
    const found=searchableHalls().filter(h=>h.name.includes(q));
    grid.innerHTML=found.length?found.map(h=>{const featured=['chen-zhenzhen','zhang-wenhua','zheng-xiuqin'].includes(h.id);const coverClass=h.id==='chen-zhenzhen'?' chen-cover':h.id==='zhang-wenhua'?' zhang-cover':h.id==='zheng-xiuqin'?' zheng-cover':'';return `<article class="memorial-card${featured?' featured-memorial':''}"><div class="memorial-cover${coverClass}">${featured?'':'☾'}</div><div class="memorial-card-body"><h2>${esc(h.name)}</h2><p>${esc(h.birth)} - ${esc(h.death)}</p><p>创建者: ${esc(h.creator)}</p><a class="btn btn-gold" href="#hall/${encodeURIComponent(h.id)}">${featured?'进入纪念馆':'❤ 进行祭祀'}</a></div></article>`}).join(''):'<div class="empty">没有找到相关纪念馆</div>';
  }
  app.querySelector('#hallSearchForm').onsubmit=e=>{e.preventDefault();draw()};
  draw();
}
function wireCreateDatePicker(input){
  input.type='text';input.inputMode='numeric';input.autocomplete='off';input.placeholder='年 / 月 / 日';
  const picker=document.createElement('div');picker.className='admin-date-picker create-date-picker';
  input.before(picker);picker.append(input);
  const wrap=document.createElement('div');wrap.className='admin-date-input-wrap';
  picker.prepend(wrap);wrap.append(input);
  wrap.insertAdjacentHTML('beforeend','<button type="button" class="admin-calendar-toggle" aria-label="打开日历" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M17 14h1M7 18h2M12 18h2"/></svg></button>');
  picker.insertAdjacentHTML('beforeend','<div class="admin-calendar-panel" hidden><div class="admin-calendar-header"><button type="button" data-month-step="-1" aria-label="上个月">‹</button><div class="admin-calendar-title"><button type="button" class="admin-calendar-year-toggle" aria-label="选择年份"></button><strong class="admin-calendar-month-label"></strong></div><button type="button" data-month-step="1" aria-label="下个月">›</button></div><div class="admin-calendar-year-panel" hidden><div class="admin-calendar-decade"><button type="button" data-decade-step="-1" aria-label="上十年">‹</button><span></span><button type="button" data-decade-step="1" aria-label="下十年">›</button></div><div class="admin-calendar-years"></div></div><div class="admin-calendar-month-panel"><div class="admin-calendar-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="admin-calendar-days"></div></div></div>');
  const panel=picker.querySelector('.admin-calendar-panel'),toggle=picker.querySelector('.admin-calendar-toggle'),yearToggle=picker.querySelector('.admin-calendar-year-toggle'),monthLabel=picker.querySelector('.admin-calendar-month-label'),yearPanel=picker.querySelector('.admin-calendar-year-panel'),monthPanel=picker.querySelector('.admin-calendar-month-panel'),decadeLabel=picker.querySelector('.admin-calendar-decade span'),years=picker.querySelector('.admin-calendar-years'),days=picker.querySelector('.admin-calendar-days');
  let year=new Date().getFullYear(),month=new Date().getMonth()+1,decade=Math.floor(year/10)*10;
  const parse=()=>{const m=input.value.trim().match(/^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})(?:日)?$/);if(!m)return null;const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),date=new Date(y,mo-1,d);return date.getFullYear()===y&&date.getMonth()===mo-1&&date.getDate()===d?{year:y,month:mo,day:d}:null};
  const format=date=>`${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`;
  const render=()=>{yearToggle.textContent=`${year}年`;monthLabel.textContent=`${month}月`;days.replaceChildren();const leading=(new Date(year,month-1,1).getDay()+6)%7;for(let i=0;i<leading;i++)days.append(document.createElement('span'));const selected=parse(),count=new Date(year,month,0).getDate();for(let day=1;day<=count;day++){const button=document.createElement('button');button.type='button';button.textContent=day;button.setAttribute('aria-label',`${year}年${month}月${day}日`);if(selected?.year===year&&selected.month===month&&selected.day===day)button.setAttribute('aria-current','date');button.onclick=()=>{input.value=format({year,month,day});input.setCustomValidity('');panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus()};days.append(button)}};
  const renderYears=()=>{decadeLabel.textContent=`${decade}—${decade+9}`;years.replaceChildren();for(let y=decade;y<decade+10;y++){const button=document.createElement('button');button.type='button';button.textContent=y;if(y===year)button.setAttribute('aria-current','date');button.onclick=()=>{year=y;yearPanel.hidden=true;monthPanel.hidden=false;render()};years.append(button)}};
  toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){const selected=parse();if(selected){year=selected.year;month=selected.month}yearPanel.hidden=true;monthPanel.hidden=false;render()}};
  yearToggle.onclick=()=>{yearPanel.hidden=!yearPanel.hidden;monthPanel.hidden=!yearPanel.hidden;decade=Math.floor(year/10)*10;if(!yearPanel.hidden)renderYears()};
  picker.querySelectorAll('[data-decade-step]').forEach(button=>button.onclick=()=>{decade+=Number(button.dataset.decadeStep)*10;renderYears()});
  picker.querySelectorAll('[data-month-step]').forEach(button=>button.onclick=()=>{const date=new Date(year,month-1+Number(button.dataset.monthStep),1);year=date.getFullYear();month=date.getMonth()+1;yearPanel.hidden=true;monthPanel.hidden=false;render()});
  input.addEventListener('input',()=>input.setCustomValidity(''));
  input.addEventListener('blur',()=>{if(!input.value.trim())return;const selected=parse();if(selected)input.value=format(selected);else input.setCustomValidity('请输入有效的年、月、日')});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus()}});
  document.addEventListener('pointerdown',event=>{if(!picker.isConnected)return;if(!picker.contains(event.target)){panel.hidden=true;toggle.setAttribute('aria-expanded','false')}},{signal:window.createDatePickerAbort?.signal});
}
function validateResidentDates(form){
  const fields=form.elements;
  const matches=(value,expected)=>{
    const parts=value.trim().match(/^(\d{4})\s*[年.\/-]\s*(\d{1,2})\s*[月.\/-]\s*(\d{1,2})\s*日?$/);
    return Boolean(parts&&parts.slice(1).map(Number).join('-')===expected);
  };
  const valid=fields.name.value.trim()!=='郑愿'||(matches(fields.birth.value,'2006-8-23')&&matches(fields.death.value,'2025-9-27'));
  let message=form.querySelector('.resident-date-error');
  if(!valid&&!message){message=document.createElement('p');message.className='message resident-date-error';message.setAttribute('role','alert');form.querySelector('[type="submit"]').before(message);}
  if(message){message.hidden=valid;message.textContent=valid?'':'姓名与出生、逝世日期不匹配，请核对后重试。';}
  return valid;
}
function create(section='details',hallId=''){
  if(!account()){location.hash='#register';return}
  const lamp=section==='lantern';
  if(lamp){
    if(document.body.classList.contains('invite-theme')){location.hash='#me';return}
    const own=saved().filter(h=>ownsHall(h,account()));
    if(!hallId){
      if(own.length===1){location.hash='#create/lantern/'+encodeURIComponent(own[0].id);return}
      app.innerHTML='<div class="page-shell create-page"><a class="page-return-me" href="#me">← 返回我的</a><div class="create-page-head"><h1>定制长明灯</h1><p>请选择要绑定的纪念馆</p></div><div class="my-main"><div class="my-hall-list" id="lampHallList"></div></div></div>';
      const list=app.querySelector('#lampHallList');
      if(!own.length)list.innerHTML='<div class="my-empty"><strong>先创建纪念馆</strong><p>每座纪念馆拥有自己独立的长明灯。</p><a class="btn" href="#create">创建纪念馆</a></div>';
      else own.forEach(h=>{const link=document.createElement('a');link.className='my-hall-item lamp-hall-choice';link.href='#create/lantern/'+encodeURIComponent(h.id);link.textContent=h.name+'　›';list.append(link)});
      return;
    }
    const hall=own.find(h=>h.id===hallId);if(!hall){location.hash='#me';return}
    app.innerHTML=`<div class="create-lantern-fullscreen"><iframe class="create-lantern-frame" title="${esc(hall.name)}的长明灯" src="lantern.html?memorial=${encodeURIComponent(hall.id)}&v=4" allow="fullscreen"></iframe><a class="create-lantern-back" href="#me">‹ 返回我的</a></div>`;
    return;
  }
  app.innerHTML=`<div class="page-shell create-page"><div class="create-page-head"><h1>创建纪念馆</h1><p>为逝者建立专属的记忆空间</p></div><div class="create-sections" role="tablist" aria-label="创建纪念馆栏目"><a role="tab" aria-selected="${!lamp}" href="#create">基本资料</a><a role="tab" aria-selected="${lamp}" href="#create/lantern">定制长明灯</a></div><div class="create-section-body">${lamp?'<iframe class="create-lantern-frame" title="定制长明灯" src="lantern.html?v=2" loading="lazy" allow="fullscreen"></iframe>':'<form class="form-body create-form" id="createForm"><label class="field"><span>逝者姓名</span><input name="name" required placeholder="请输入姓名"></label><label class="field"><span>出生日期</span><input name="birth" type="date" required></label><label class="field"><span>逝世日期</span><input name="death" type="date" required></label><label class="field"><span>生平简介</span><textarea name="bio" placeholder="记录值得珍藏的故事"></textarea></label><div class="hall-photo-upload"><span class="hall-photo-title">纪念照片</span><div class="hall-photo-list"></div><label class="hall-photo-add">＋ 添加照片<input name="hallPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p class="hall-photo-message" role="alert"></p></div><button class="btn" type="submit">创建纪念馆</button></form>'}</div></div>`;
  app.querySelector('.create-page').insertAdjacentHTML('afterbegin','<a class="page-return-me" href="#me">← 返回我的</a>');
  app.querySelector('.hall-photo-title').textContent='逝者照片';
  app.querySelector('.hall-photo-add').firstChild.textContent='＋ 上传照片';
  app.querySelector('[name="hallPhotos"]').removeAttribute('multiple');
  app.querySelector('#createForm').prepend(app.querySelector('.hall-photo-upload'));
  window.createDatePickerAbort?.abort();window.createDatePickerAbort=new AbortController();
  app.querySelectorAll('#createForm input[type="date"]').forEach(wireCreateDatePicker);
  const createForm=document.querySelector('#createForm'),photoState=wireHallPhotos(createForm);createForm._photoState=photoState;
  createForm.onsubmit=e=>{e.preventDefault();const f=e.currentTarget;if(!f.birth.value||!f.death.value||!validateResidentDates(f))return;const h={id:String(Date.now()),name:f.name.value.trim(),birth:f.birth.value,death:f.death.value,creator:account().name,creatorId:account().accountId,bio:f.bio.value.trim(),records:[]};if(!photoState.save(h.id))return;localStorage.setItem('memorial-halls',JSON.stringify([...saved(),h]));location.hash='#create/lantern/'+h.id;};
}
const ownsHall=(hall,user)=>Boolean(user&&(hall.creatorId?hall.creatorId===user.accountId:hall.creator===user.name));
function editHall(id){
  const user=account(),hall=saved().find(item=>item.id===id);
  if(!hall||!ownsHall(hall,user)||document.body.classList.contains('invite-theme')){location.hash='#me';return}
  create();
  app.querySelector('.create-page').classList.add('edit-page');
  app.querySelector('.create-page-head h1').textContent='编辑纪念馆';
  app.querySelector('.create-page-head p').textContent='更新纪念馆的基本资料';
  app.querySelector('.create-sections').remove();
  const form=app.querySelector('#createForm');
  form._photoState.load(hall.id);
  for(const key of ['name','birth','death','bio'])form.elements[key].value=hall[key]||'';
  const saveButton=form.querySelector('button[type="submit"]');saveButton.textContent='保存修改';
  const actions=document.createElement('div');actions.className='create-edit-actions';saveButton.before(actions);actions.append(saveButton);
  const lampPanel=document.createElement('div');lampPanel.className='edit-lamp-panel';lampPanel.innerHTML='<span>我的长明灯</span><a href="#create/lantern/'+encodeURIComponent(hall.id)+'">继续定制 ›</a>';form.append(lampPanel);
  form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity()||!validateResidentDates(form)||!form._photoState.save(id))return;const updated={...hall,name:form.elements.name.value.trim(),birth:form.elements.birth.value,death:form.elements.death.value,bio:form.elements.bio.value.trim()};localStorage.setItem('memorial-halls',JSON.stringify(saved().map(item=>item.id===id?updated:item)));location.hash='#me'};
}
function myPage(){
  const user=account();
  if(!user){location.hash='#login';return}
  const own=document.body.classList.contains('invite-theme')?[]:saved().filter(h=>ownsHall(h,user));
  const legacyKey=user.accountId?`annian-glass-lamp-v3-${user.accountId}`:'annian-glass-lamp-v2';
  if(own.length===1){const hallKey=`annian-glass-lamp-hall-v1-${own[0].id}`,legacy=localStorage.getItem(legacyKey)||localStorage.getItem('annian-glass-lamp-v2');if(legacy&&!localStorage.getItem(hallKey)){localStorage.setItem(hallKey,legacy);localStorage.removeItem(legacyKey);localStorage.removeItem('annian-glass-lamp-v2')}}
  app.innerHTML=`<div class="page-shell my-page"><div class="my-profile"><div class="my-avatar" aria-hidden="true"><img alt="" hidden></div><div><span class="my-eyebrow">我的安念堂</span><h1 id="myName"></h1><p>让思念有处安放，让记忆继续留存。</p></div></div><div class="my-layout"><main class="my-main"><div class="my-section-title"><div><h2>我创建的纪念馆</h2><p>你在这里保存的生命故事</p></div><a class="btn" href="#create">＋ 创建纪念馆</a></div><div class="my-hall-list" id="myHallList"></div></main><aside class="my-aside"><h2>账户设置</h2><a href="#change-password"><span>修改密码</span><span aria-hidden="true">›</span></a><a href="#logout"><span>退出登录</span><span aria-hidden="true">›</span></a></aside></div></div>`;
  app.querySelector('#myName').textContent=user.name;
  app.querySelector('.my-eyebrow').remove();
  const settings=app.querySelector('.my-aside');settings.classList.add('my-profile-settings');app.querySelector('.my-profile').append(settings);
  const avatarSource=avatarFor(user.accountId);
  if(avatarSource){const portrait=app.querySelector('.my-avatar');portrait.querySelector('img').src=avatarSource;portrait.querySelector('img').hidden=false}
  const list=app.querySelector('#myHallList');
  const unmappedLegacy=own.length>1?(localStorage.getItem(legacyKey)||localStorage.getItem('annian-glass-lamp-v2')):null;
  if(unmappedLegacy){
    const free=own.filter(h=>!localStorage.getItem(`annian-glass-lamp-hall-v1-${h.id}`));
    if(free.length){const box=document.createElement('div');box.className='my-legacy-lamp';box.innerHTML='<label>旧长明灯尚未绑定纪念馆 <select aria-label="选择旧长明灯绑定的纪念馆"></select></label><button type="button">关联旧灯</button>';const select=box.querySelector('select');free.forEach(h=>{const option=document.createElement('option');option.value=h.id;option.textContent=h.name;select.append(option)});box.querySelector('button').onclick=()=>{const hall=free.find(h=>h.id===select.value);if(!hall)return;localStorage.setItem(`annian-glass-lamp-hall-v1-${hall.id}`,unmappedLegacy);localStorage.removeItem(legacyKey);localStorage.removeItem('annian-glass-lamp-v2');myPage()};app.querySelector('.my-main').append(box)}
  }
  if(document.body.classList.contains('invite-theme')){app.querySelector('.my-section-title .btn').remove();list.innerHTML='<div class="my-empty"><strong>暂不支持</strong></div>';return}
  if(!own.length){app.querySelector('.my-section-title .btn').remove();list.innerHTML='<div class="my-empty"><strong>还没有创建纪念馆</strong><p>建立一处纪念空间，保存关于故人的故事。</p><a class="btn" href="#create">＋ 创建纪念馆</a></div>';return}
  own.forEach(h=>{const item=document.createElement('div');item.className='my-hall-item';const info=document.createElement('a');info.className='my-hall-info';info.href='#hall/'+encodeURIComponent(h.id);const title=document.createElement('strong');title.textContent=h.name;const meta=document.createElement('small');meta.textContent=[h.birth,h.death].filter(Boolean).join(' — ');info.append(title,meta);const actions=document.createElement('div');actions.className='my-hall-actions';const enter=document.createElement('a');enter.href=info.href;enter.textContent='进入';const edit=document.createElement('a');edit.href='#manage/'+encodeURIComponent(h.id);edit.textContent='编辑';const remove=document.createElement('button');remove.type='button';remove.textContent='删除';remove.onclick=()=>confirmHallDeletion(h);actions.append(enter,edit,remove);item.append(info,actions);list.append(item)});
}
function confirmHallDeletion(hall){
  const user=account();if(!ownsHall(hall,user))return;
  const dialog=document.createElement('dialog');dialog.className='my-delete-dialog';
  dialog.innerHTML='<h2>删除纪念馆？</h2><p class="my-delete-name"></p><p>删除后，馆内资料、长明灯、祭奠记录和留言都无法恢复。</p><div><button type="button" class="my-delete-cancel">取消</button><button type="button" class="my-delete-confirm">确认删除</button></div>';
  dialog.querySelector('.my-delete-name').textContent=hall.name;
  const close=()=>{dialog.close();dialog.remove()};dialog.querySelector('.my-delete-cancel').onclick=close;
  dialog.querySelector('.my-delete-confirm').onclick=()=>{if(!ownsHall(hall,account())){close();return}localStorage.setItem('memorial-halls',JSON.stringify(saved().filter(item=>item.id!==hall.id)));localStorage.removeItem(`annian-glass-lamp-hall-v1-${hall.id}`);localStorage.removeItem(hallPhotoKey(hall.id));close();myPage()};
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}
function showChenMessageVision(){
  document.querySelector('.chen-message-vision')?.remove();
  const vision=document.createElement('div');
  vision.className='chen-message-vision';
  vision.setAttribute('aria-hidden','true');
  const fragment=document.createDocumentFragment();
  for(let i=0;i<156;i++){
    const word=document.createElement('span');
    const x=((Math.sin(i*127.1+4.2)*43758.5453)%1+1)%1*110-5;
    const y=((Math.sin(i*269.5+2.8)*24634.6345)%1+1)%1*112-6;
    word.textContent='等等我';
    word.style.cssText=`--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--size:${20+(i*23)%58}px;--delay:${(i%29)*26+Math.floor(i/29)*75}ms;--angle:${(i*13)%17-8}deg;--alpha:${(.34+(i%7)*.09).toFixed(2)}`;
    fragment.append(word);
  }
  vision.append(fragment);
  document.body.append(vision);
  window.setTimeout(()=>vision.remove(),window.matchMedia('(prefers-reduced-motion: reduce)').matches?1100:2400);
}
let chenMessageVisionShown=false;
function addPersonalArchive(name){
  const tabs=app.querySelector('.life-tabs');
  tabs.querySelector('span').outerHTML='<button class="personal-archive-tab" type="button" data-life-tab="personal">个人信息留存</button>';
  const pane=document.createElement('div');
  pane.className='life-pane personal-archive-pane';
  pane.dataset.lifePane='personal';
  if(name==='张文华'&&!document.body.classList.contains('invite-theme')){
    pane.innerHTML='<div class="personal-archive-details"><a class="personal-archive-folder" href="assets/zhang-personal-archive.zip" download="张文华-个人信息留存.zip" aria-label="下载张文华个人信息留存资料，包含一封信件"><span class="personal-archive-folder-icon" aria-hidden="true"></span><span class="personal-archive-folder-copy"><strong>张文华 · 个人资料</strong><small>文件夹　·　1 封信件</small></span><span class="personal-archive-folder-action">下载文件夹 ↓</span></a></div>';
    app.querySelector('.life-story').append(pane);
    return;
  }
  if(name!=='陈珍珍'){
    pane.innerHTML='<div class="personal-archive-empty">暂无个人信息留存</div>';
    app.querySelector('.life-story').append(pane);
    return;
  }
  const rows=[...app.querySelectorAll('.life-profile dl div')].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent]);
  const details=`<div class="personal-archive-details"><h2>个人信息留存</h2><p>以下内容依据纪念馆现有资料留存。</p><dl><div><dt>姓名</dt><dd>${esc(name)}</dd></div>${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></div>`;
  const unlockedFiles='<div class="personal-archive-downloads"><a href="assets/chen-evidence-photo-v2.png" download="附件1.png"><span class="archive-file-type">图片</span><span><strong>附件 1</strong><small>物证照片 · PNG</small></span><b>下载 ↓</b></a></div>';
  if(!document.body.classList.contains('invite-theme')){
    pane.innerHTML=name==='陈珍珍'
      ?'<div class="personal-archive-details"><a class="personal-archive-folder" href="assets/chen-personal-archive.zip" download="陈珍珍-个人信息留存.zip" aria-label="下载陈珍珍个人信息留存资料，包含四张图片"><span class="personal-archive-folder-icon" aria-hidden="true"></span><span class="personal-archive-folder-copy"><strong>陈珍珍 · 个人资料</strong><small>文件夹　·　4 张图片</small></span><span class="personal-archive-folder-action">下载文件夹 ↓</span></a></div>'
      :details;
  }
  else{
    pane.innerHTML='<div class="personal-archive-gate"><h2>个人信息留存</h2><p>请输入该居民的居民编号，验证后查看留存资料。</p><form><label for="personal-resident-number">居民编号</label><div class="personal-archive-entry"><input id="personal-resident-number" name="residentNumber" type="text" autocomplete="off" spellcheck="false" required><button type="submit">确认查看</button></div><p class="personal-archive-error" role="alert" hidden></p></form></div>';
    pane.querySelector('form').onsubmit=async event=>{
      event.preventDefault();
      const value=pane.querySelector('input').value.trim().toUpperCase();
      const error=pane.querySelector('.personal-archive-error');
      const button=pane.querySelector('button[type="submit"]');
      button.disabled=true;
      try{
        if(await window.memorialGateVerify('archive',{code:value})){pane.innerHTML=unlockedFiles;return}
        error.textContent='居民编号有误，请核对后重试。';
      }catch(_){error.textContent='验证暂时不可用，请稍后重试。'}
      finally{button.disabled=false}
      error.hidden=false;
    };
  }
  app.querySelector('.life-story').append(pane);
}
function setupMemorialMessageBoard(storageKey,{loadStored=false}={}){
  const pane=app.querySelector('[data-life-pane="messages"]'),heading=pane.querySelector('.tribute-heading');
  heading.querySelector('p')?.remove();
  const list=document.createElement('div');list.className='memorial-message-list';
  pane.querySelectorAll(':scope > .memorial-message').forEach(item=>list.append(item));heading.after(list);
  const addMessage=entry=>{const article=document.createElement('article'),by=document.createElement('b'),body=document.createElement('p'),time=document.createElement('time');article.className='memorial-message';by.textContent=entry.by||'普通用户';body.textContent=entry.message||'';time.textContent=entry.at||'';article.append(by,body,time);list.append(article)};
  if(loadStored){try{JSON.parse(localStorage.getItem(storageKey)||'[]').forEach(addMessage)}catch(_){}}
  const updateEmpty=()=>{list.querySelector('.memorial-message-empty')?.remove();if(!list.querySelector('.memorial-message')){const empty=document.createElement('div');empty.className='memorial-message-empty';empty.textContent='暂无留言';list.append(empty)}};updateEmpty();
  const form=document.createElement('form');form.className='custom-message-form';form.innerHTML='<label class="field"><span>留下思念</span><textarea name="message" placeholder="写下想说的话" required></textarea></label><button class="btn" type="submit">发表留言</button>';pane.append(form);
  form.onsubmit=event=>{event.preventDefault();const message=form.elements.message.value.trim();if(!message)return;const entry={by:account()?.name||'普通用户',message,at:dateText()};try{const old=JSON.parse(localStorage.getItem(storageKey)||'[]');localStorage.setItem(storageKey,JSON.stringify([...old,entry]))}catch(_){return}list.querySelector('.memorial-message-empty')?.remove();addMessage(entry);form.reset()};
}
function zhenzhenMemorial(initialTab='story'){
  const taoyuanTimeline=[
    ['2004年｜出生于云阳','陈珍珍出生于云阳市。童年时期主要与母亲张文华共同生活，性格开朗，喜欢拍照，也很喜欢小动物。'],
    ['童年时期｜与家人共同生活','陈珍珍从小与郑愿一起长大，姐弟二人关系亲近，平时一起上学、一起回家，也常常因为小事拌嘴。家里的日子虽然普通，却一直很热闹。'],
    ['少年时期｜求学成长','进入中学后，陈珍珍逐渐有了自己的朋友圈，她喜欢逛街、拍照、和朋友聚会，对新的事物一直很感兴趣。'],
    ['高中时期｜听闻桃原市','进入高中后，陈珍珍接触到了更多校外的人和信息，也再次听到了“桃原市”这个名字。她小时候曾听母亲张文华提起过那里，当时只把它当作一个很遥远的地方。随着相关的谈论和网络内容不断出现，她也逐渐想起母亲过去说过的话，并开始对桃原市产生向往，萌生了前往那里的念头。'],
    ['此后｜迁居桃原','经过一段时间的考虑，陈珍珍最终来到桃原市生活。新的环境让她逐渐安定下来，也开始重新安排自己的生活。'],
    ['此后｜安居桃原','陈珍珍一直生活在桃原市，日子平静而普通。']
  ];
  const timeline=[
    ['2004年｜出生于云阳市','陈珍珍出生于云阳市。童年时期主要与母亲张文华共同生活，父亲长期在外。'],
    ['童年时期｜家庭与成长','张文华一直牵挂着幼年被送养的郑愿，因此偶尔会带陈珍珍去看望他。陈珍珍从小与郑愿以姐弟相称，两人关系亲近。'],
    ['母亲去世后｜生活逐渐独立','张文华去世后，陈珍珍的家庭生活发生了很大变化。她开始更多地独自面对生活，也逐渐形成了自己的社交圈。与郑愿见面的机会虽然减少，但两人仍保持联系。'],
    ['高中时期｜生活发生变化','进入高中后，陈珍珍逐渐认识了一些校外人士，开始频繁参加聚会，偶尔逃课，原本的生活圈也随之发生变化。此后她接触到一些较为复杂的社交关系，并曾卷入带有金钱往来的私人交往。她很少向家人和旧友详细谈起这些经历，只偶尔表示自己“最近很忙”。'],
    ['2024年｜离世','高三期间，陈珍珍与过去的同学和朋友往来越来越少，也很少再更新自己的日常。生命最后一段时间，她开始频繁接触有关“福报”“善业”和人生意义的内容，并转发过多篇相关文章。2024年，陈珍珍于云阳市家中离世。']
  ];
  const tributes=[['x华','献花','2025年09月25日 20:16'],['xx远','献花并点燃长明灯','2025年08月02日 07:43'],['x梅','点燃长明灯','2025年04月04日 10:05'],['xx兰','献花','2025年03月19日 22:31'],['x宁','献花并点燃长明灯','2024年12月21日 09:12'],['xx安','献花','2024年10月03日 19:48'],['x林','点燃长明灯','2024年09月18日 14:26'],['x愿','献花并点燃长明灯','2024年09月13日 21:41']];
  const fortuneRecords=[
    {title:'捡垃圾，清理路面',paragraphs:['陈珍珍曾长期在居住地附近清理路边垃圾，捡拾烟头、塑料袋和废纸，并主动清扫楼栋周边的卫生死角。'],verdict:'获得福报'},
    {title:'布施蚂蚁',paragraphs:['陈珍珍会定期在楼下角落投放糖水、米粒和饼干碎屑，认为这样是在“照顾微小生命”。','后期她开始频繁提到“它们也有去处”“小东西也要被看见”。'],verdict:'获取福报'},
    {title:'只吃素食',paragraphs:['陈珍珍自某一阶段起开始坚持素食，并在聊天记录中多次表示“减少欲望”“不再沾染血气”会让人更接近平静。','她将节制饮食视为一种“自我净化”。'],verdict:'获取福报'},
    {title:'在妇科医院劝人不要堕胎',paragraphs:['陈珍珍曾多次前往妇科医院附近，与陌生人交谈，劝说对方“留下生命”“不要亲手结束一个可能来到世上的人”。'],verdict:'福报提升'},
    {title:'与抑郁症网友聊天，并劝其前往桃原市',paragraphs:['陈珍珍曾在网络上长期接触情绪低落、厌世或有自毁倾向的网友。她最初以安慰、陪伴和倾听为主，但后期聊天内容逐渐发生变化。她开始频繁提到“桃原市”，并将那里描述成一个“不会再痛苦的地方”、“真正可以结束一切的地方”。'],verdict:'福报已满'}
  ];
  app.innerHTML=`<div class="life-memorial-shell"><aside class="life-profile"><img class="life-portrait" src="assets/chen-zhenzhen-portrait.webp" alt="陈珍珍"><h1>陈珍珍</h1><p class="life-dates">2004.03.14　—　2024</p><p class="life-wish">愿你在另一处，获得平静。</p><dl><div><dt>性别</dt><dd>女</dd></div><div><dt>出生</dt><dd>2004年3月14日</dd></div><div><dt>籍贯</dt><dd>云阳市</dd></div><div><dt>离世</dt><dd>2024年</dd></div><div><dt>安葬地</dt><dd>云阳市纪念馆</dd></div></dl><button class="life-flower" type="button">✿　献花</button></aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">祭奠记录</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline">${timeline.map(([title,text])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(text)}</p></article>`).join('')}</div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>祭奠记录</h2><p>每一次到访，都让思念有了回声。</p></div><div class="tribute-list">${tributes.map(([name,type,time])=>`<article><div class="tribute-person"><span>${name}</span><b>${type==='献花'?'✿ 献花':'♨ 点燃长明灯'}</b></div><time>${time}</time></article>`).join('')}</div><a class="tribute-action" href="#services">前往祭奠</a></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2><p>那些没有说完的话，仍可以在这里轻轻写下。</p></div><article class="memorial-message"><b>匿名用户</b><p>等等我</p></article></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true" aria-labelledby="flower-confirm-title"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2 id="flower-confirm-title">已献花</h2><p>愿这一束花伴她安眠，也让思念长久芬芳。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  app.querySelectorAll('.tribute-list .tribute-person b').forEach((label,index)=>{
    if(tributes[index][1]==='献花并点燃长明灯')label.textContent='✿ 献花并 ♨ 点燃长明灯';
  });
  if(document.body.classList.contains('invite-theme')){
    app.querySelectorAll('[data-life-tab="tributes"], [data-life-pane="tributes"] .tribute-heading h2').forEach(label=>label.textContent='福报记录');
    app.querySelector('[data-life-pane="tributes"] .tribute-heading p').textContent='以下为已记录的福报事项。';
    const recordList=app.querySelector('[data-life-pane="tributes"] .tribute-list');
    recordList.classList.add('fortune-record-list');
    recordList.innerHTML=fortuneRecords.map(({title,paragraphs,verdict})=>`<article class="fortune-record"><h3>${esc(title)}</h3>${paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}<p class="fortune-verdict"><strong>系统判定：</strong>${esc(verdict)}</p></article>`).join('');
    app.querySelector('.life-portrait').src='assets/chen-zhenzhen-taoyuan.webp?v=2';
    app.querySelector('.life-wish').textContent='祝陈女士在桃原市生活愉快';
    app.querySelector('.life-timeline').innerHTML=taoyuanTimeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('');
    const profileRows=app.querySelectorAll('.life-profile dl div');
    profileRows[3].querySelector('dt').textContent='安居';
    profileRows[4].querySelector('dt').textContent='登记地';
    profileRows[4].querySelector('dd').textContent='桃原市纪念馆';
  }
  addPersonalArchive('陈珍珍');
  addMemorialBackLink('陈珍珍');
  document.querySelector('.tribute-action').href='#services/chen-zhenzhen';
  const messagePane=document.querySelector('[data-life-pane="messages"]');
  for(const wish of memorialWishes().reverse()){
    const article=document.createElement('article'),by=document.createElement('b'),message=document.createElement('p'),time=document.createElement('time');
    article.className='memorial-message';by.textContent=wish.by||'普通用户';message.textContent=wish.message||'';time.textContent=wish.at||'';
    article.append(by,message,time);messagePane.insertBefore(article,messagePane.children[1]);
  }
  setupMemorialMessageBoard(wishKey);
  document.querySelectorAll('[data-life-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-life-tab]').forEach(item=>item.classList.toggle('active',item===button));document.querySelectorAll('[data-life-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.lifePane===button.dataset.lifeTab));if(button.dataset.lifeTab==='messages'&&!chenMessageVisionShown){chenMessageVisionShown=true;showChenMessageVision()}});
  if(initialTab!=='story')document.querySelector(`[data-life-tab="${initialTab}"]`)?.click();
  const offeringNotice=document.createElement('div');offeringNotice.className='offering-notice';offeringNotice.setAttribute('role','status');offeringNotice.textContent=offeringText(offerings());offeringNotice.hidden=!offerings().flower&&!offerings().lamp;document.querySelector('.life-story').prepend(offeringNotice);
  const flowerConfirm=document.querySelector('.flower-confirm');
  const closeFlowerConfirm=()=>{flowerConfirm.hidden=true;showChenRegistrationNotice()};
  document.querySelector('.life-flower').onclick=()=>{offeringNotice.textContent=offeringText(saveOffering('flower'));offeringNotice.hidden=false;flowerConfirm.hidden=false;document.querySelector('.flower-confirm-ok').focus();queueChenRegistrationNotice('flower')};
  document.querySelector('.flower-confirm-close').onclick=closeFlowerConfirm;
  document.querySelector('.flower-confirm-ok').onclick=closeFlowerConfirm;
  flowerConfirm.onclick=e=>{if(e.target===flowerConfirm)closeFlowerConfirm()};
  if(document.body.classList.contains('invite-theme')){
    app.querySelector('.life-flower')?.remove();
    app.querySelector('.tribute-action')?.remove();
    flowerConfirm.remove();
  }
}
function hall(id,tab){if(id==='chen-zhenzhen'){zhenzhenMemorial(tab);return}if(id==='zhang-wenhua'){zhangwenhuaMemorial(tab);return}if(id==='zheng-xiuqin'){zhengxiuqinMemorial(tab);return}const h=halls().find(x=>x.id===id);if(!h){browse();return}app.innerHTML=`<div class="page-shell"><div class="panel"><div class="detail-head"><div class="portrait">☾</div><div><h1>${esc(h.name)}</h1><p>${esc(h.birth)} - ${esc(h.death)}　创建者: ${esc(h.creator)}</p><div class="rite-actions"><button data-rite="点烛">🕯 点烛</button><button data-rite="上香">♨ 上香</button><button data-rite="献花">🌿 献花</button></div></div></div><div class="detail-content"><h2>生平简介</h2><p class="bio">${esc(h.bio||'暂无生平简介')}</p><h2>祭祀记录</h2><div id="recordList"></div><form id="messageForm"><label class="field"><span>留下思念</span><textarea name="message" placeholder="写下想说的话" required></textarea></label><button class="btn" type="submit">发表留言</button></form></div></div></div>`;const list=document.querySelector('#recordList');function records(){list.innerHTML=h.records.length?h.records.map(r=>`<article class="record"><div class="record-top"><span><b>${esc(r.by)}</b>　${esc(r.type)}</span><time>${esc(r.at)}</time></div><p>${esc(r.text)}</p></article>`).join(''):'<p class="empty">尚无祭祀记录</p>'}records();function add(type,text){h.records.unshift({type,by:account()?.name||'访客',at:dateText(),text});if(h.id!=='demo'){localStorage.setItem('memorial-halls',JSON.stringify(saved().map(x=>x.id===h.id?h:x)))}records()}document.querySelectorAll('[data-rite]').forEach(b=>b.onclick=()=>{const t=b.dataset.rite;add(t,({点烛:'点燃了一支蜡烛，照亮前路',上香:'献上了一炷香，寄托哀思',献花:'献上了一束花，表达怀念'})[t])});document.querySelector('#messageForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;add('留言',f.message.value.trim());f.reset()};}
function customHall(id,initialTab='story'){
  if(document.body.classList.contains('invite-theme')){location.hash='#browse';return}
  const h=saved().find(item=>item.id===id);if(!h){browse();return}
  app.innerHTML=`<div class="life-memorial-shell custom-life-shell"><aside class="life-profile"><div class="custom-life-portrait"><img src="assets/person-placeholder.svg?v=3" alt=""></div><h1>${esc(h.name)}</h1><p class="life-dates">${esc(h.birth)}　—　${esc(h.death)}</p><p class="life-wish">愿记忆与思念长存。</p><dl><div><dt>出生</dt><dd>${esc(h.birth)}</dd></div><div><dt>离世</dt><dd>${esc(h.death)}</dd></div><div><dt>创建者</dt><dd>${esc(h.creator)}</dd></div></dl><button class="life-flower" type="button">✿　献花</button></aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">祭奠记录</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline"><article><i></i><h2>生平简介</h2><p>${esc(h.bio||'暂无生平简介')}</p></article></div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>祭奠记录</h2></div><div class="tribute-list custom-tribute-list"></div><a class="tribute-action" href="#services/${encodeURIComponent(id)}">前往祭奠</a></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2></div><div class="custom-message-list"></div><form class="custom-message-form"><label class="field"><span>留下思念</span><textarea name="message" placeholder="写下想说的话" required></textarea></label><button class="btn" type="submit">发表留言</button></form></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2>已献花</h2><p>愿这一束花承载思念，长伴安眠。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  if(!h.bio?.trim()){const timeline=app.querySelector('.life-timeline');timeline.className='empty-life-bio';timeline.textContent='暂无生平简介'}
  const dates=app.querySelector('.life-dates');dates.classList.add('custom-life-dates');
  const photos=hallPhotos(id);
  if(photos.length){const portrait=app.querySelector('.custom-life-portrait img');portrait.src=photos[0];portrait.alt=`${h.name}的照片`;portrait.classList.add('uploaded-photo')}
  const birth=document.createElement('time'),death=document.createElement('span');birth.textContent=h.birth||'';death.textContent=`— ${h.death||''}`;dates.replaceChildren(birth,death);
  if(ownsHall(h,account())){const back=document.createElement('a');back.className='life-back-link';back.href='#me';back.textContent='← 返回我的';app.querySelector('.life-profile').prepend(back)}else addMemorialBackLink(h.name);
  addPersonalArchive(h.name,null);
  const render=()=>{const rites=h.records.filter(item=>item.type!=='留言'),messages=h.records.filter(item=>item.type==='留言');app.querySelector('.custom-tribute-list').innerHTML=rites.length?rites.map(item=>`<article class="memorial-message"><b>${esc(item.by)}</b><time>${esc(item.at)}</time><p>${esc(item.text)}</p></article>`).join(''):'<p class="empty">尚无祭奠记录</p>';app.querySelector('.custom-message-list').innerHTML=messages.length?messages.map(item=>`<article class="memorial-message"><b>${esc(item.by)}</b><time>${esc(item.at)}</time><p>${esc(item.text)}</p></article>`).join(''):'<p class="empty">暂无留言</p>'};
  const add=(type,message)=>{h.records??=[];h.records.unshift({type,by:account()?.name||'访客',at:dateText(),text:message});localStorage.setItem('memorial-halls',JSON.stringify(saved().map(item=>item.id===h.id?h:item)));render()};render();
  app.querySelectorAll('[data-life-tab]').forEach(button=>button.onclick=()=>{app.querySelectorAll('[data-life-tab]').forEach(item=>item.classList.toggle('active',item===button));app.querySelectorAll('[data-life-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.lifePane===button.dataset.lifeTab))});
  app.querySelector(`[data-life-tab="${initialTab}"]`)?.click();
  app.querySelector('.custom-message-form').onsubmit=event=>{event.preventDefault();const form=event.currentTarget,message=form.elements.message.value.trim();if(!message)return;add('留言',message);form.reset()};
  const dialog=app.querySelector('.flower-confirm'),close=()=>dialog.hidden=true;app.querySelector('.life-flower').onclick=()=>{add('献花','献上了一束花，表达怀念');dialog.hidden=false};dialog.querySelectorAll('button').forEach(button=>button.onclick=close);dialog.onclick=event=>{if(event.target===dialog)close()};
}
function simple(title){app.innerHTML=`<div class="page-shell simple-page"><h1 class="page-heading">${title}</h1><p>相关内容正在整理中。</p><a class="btn" href="#home">返回首页</a></div>`;}
function fortuneExplanation(){app.innerHTML=`<div class="page-shell fortune-page"><header><h1 class="page-heading">福报说明</h1></header><section class="fortune-body"><div class="fortune-copy fortune-copy-light"><p>然世间诸事，虽有顺逆得失，善念善行终有其归。</p><p>有人身处困厄，独力难支。若有人伸手相扶，使其得以渡过难关，此事，可谓善乎？</p><p>有人心怀怨憎，几欲伤人害己。若有人劝其止怒，引其回转，使恶念不再增长，此事，又可谓善乎？</p><p>一切众生，自久远以来，受贪、嗔、痴三毒所扰，常因执念而生烦恼，因烦恼而起争端。若能以慈心待人，以善意解怨，使众生少受一分苦，亦使自身少造一分业。</p><p>故扶其困，是善。解其忧，是慈。劝其止恶，是度。</p><p>善念既生，善行相续，久而积之，是为福报。</p></div><div class="fortune-copy fortune-copy-dark"><p>然世间诸事，并非皆有善恶之明界。</p><p>有人身受重苦，求生不得，求死不能。若有人代其断苦，使其不再受此身之刑，此事，可谓恶乎？</p><p>有人恶业深重，终日伤人造业。若任其存世，则恶业日增；若断其恶行，使其不再害人，此事，又可谓恶乎？</p><p>一切众生，自久远以来，受贪、嗔、痴三毒所缚，妄想颠倒，恶业轮转。众生困于火宅，却不知火宅为苦。</p><p>故止其苦，是救。止其恶，是度。断其业，是慈悲</p></div><div class="fortune-video"><video src="assets/invite-home-v2.mp4" controls preload="none" playsinline></video></div></section></div>`;useCachedFortuneVideo(app.querySelector('.fortune-video video'));}
function route(){
  window.syncMemorialRegistration?.();
  rememberInviteVideo();applyInviteTheme();header();
  const hash=decodeURIComponent(location.hash.slice(1)||'home');
  const [page,id,tab]=hash.split('/');
  const activeSection=page==='home'?'home':page==='letters'?'letters':page==='articles'?'articles':['me','create','manage','change-password'].includes(page)?'me':'';
  document.querySelectorAll('.site-header nav a').forEach(link=>{
    if(link.getAttribute('href')===`#${activeSection}`)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  if(page==='me'&&!account()){location.hash='#login';return}
  if(page==='hall'&&id==='chen-zhenzhen'&&document.body.classList.contains('invite-theme')&&!window.memorialRegistrationState?.chen){location.hash='#browse';return}
  if(!account()&&(page==='letters'||(page==='services'&&!['chen-zhenzhen','zhang-wenhua'].includes(id)))){location.hash='#login';return}
  if(page==='home'){home();wireHomeBulletins()}
  else if(page==='services'&&!id){location.hash='#create/lantern';return}
  else if(page==='services'){
    if(document.body.classList.contains('invite-theme')&&saved().some(h=>h.id===id)){location.hash='#browse';return}
    const custom=saved().find(h=>h.id===id),source=['chen-zhenzhen','zhang-wenhua'].includes(id)||custom?`lantern.html?memorial=${encodeURIComponent(id)}&v=4`:'lantern.html?v=4';
    app.innerHTML=custom?`<div class="create-lantern-fullscreen"><iframe class="create-lantern-frame" title="${esc(custom.name)}的长明灯" src="${source}" allow="fullscreen"></iframe><a class="create-lantern-back" href="${ownsHall(custom,account())?'#me':'#browse'}">‹ ${ownsHall(custom,account())?'返回我的':'返回浏览'}</a></div>`:`<iframe title="云祭服务 · 定制长明灯" src="${source}" style="display:block;width:100%;height:1250px;border:0" allow="fullscreen"></iframe>`;
  }
  else if(page==='articles')bulletinPage(id);
  else if(page==='register')register();
  else if(page==='login')login();
  else if(page==='change-password')changePasswordPage();
  else if(page==='me')myPage();
  else if(page==='browse')browse(id);
  else if(page==='create')create(id,tab);
  else if(page==='manage')editHall(id);
  else if(page==='hall')saved().some(item=>item.id===id)?customHall(id,tab):hall(id,tab);
  else if(page==='logout'){inviteAccessGranted=false;localStorage.removeItem('memorial-account');localStorage.removeItem('memorial-invite-theme');applyInviteTheme();location.hash='#home';return}
  else simple(({help:'帮助中心',agreement:'用户协议',privacy:'隐私政策'})[page]||'页面不存在');
  applyOfferingIcons();
  decoratePortalFrames();
  app.querySelectorAll('.hero-search, #hallSearchForm').forEach(attachNameSearchHistory);
  scrollTo(0,0);
  showChenRegistrationNotice();
}
document.addEventListener('submit',e=>{
  const form=e.target.closest?.('.hero-search, #hallSearchForm');
  if(!form)return;
  const query=form.querySelector('input').value.trim();
  let error=form.querySelector('.hero-search-error, .browse-search-error');
  if(!error){error=document.createElement('small');error.className='browse-search-error';error.setAttribute('role','alert');form.appendChild(error)}
  if(!query||!account()){
    e.preventDefault();e.stopImmediatePropagation();
    error.textContent=!query?'请输入故人姓名':'请先登录或注册';
    error.hidden=false;
    return;
  }
  error.hidden=true;
  rememberNameSearch(query);
  form.querySelector('.name-search-history')?.setAttribute('hidden','');
  if(form.classList.contains('hero-search')){
    e.preventDefault();e.stopImmediatePropagation();
    pendingBrowseQuery=query;
    location.hash='#browse';
  }
},true);
function addMemorialBackLink(name){
  const link=document.createElement('a');
  link.className='life-back-link';
  link.href=`#browse/${encodeURIComponent(name)}`;
  link.textContent='← 返回搜索';
  link.addEventListener('click',()=>{pendingBrowseQuery=name});
  app.querySelector('.life-profile')?.prepend(link);
}
function zhangwenhuaMemorial(initialTab='story'){
  const taoyuanTimeline=[
    ['1976年｜出生于云阳','张文华出生于云阳周边农村。家境普通，从小性格要强，也很早便开始帮家里分担生活中的事情。'],
    ['年轻时期｜来到云阳市工作','成年后，张文华离开家乡来到云阳市谋生，并与好友郑秀琴进入同一家工厂工作。两人住在同一间宿舍，在陌生的城市里彼此照应，关系一直十分亲近。'],
    ['工作时期｜生活逐渐安定','最初的日子并不富裕，但随着工作渐渐稳定，两人的生活也慢慢有了起色。后来郑秀琴开了一家小服装店，张文华平时也会过去帮忙。'],
    ['成家以后｜一家人共同生活','张文华后来建立了自己的家庭，先后有了陈珍珍和郑愿。姐弟二人从小一起生活、一起上学，一家人的日子虽然平常，却一直很安稳。'],
    ['中年时期｜听闻桃原市','生活逐渐稳定以后，张文华从身边人口中听说了桃原市。有人告诉她，那里环境安静，生活简单，人们彼此和善，是一个适合重新开始、长久生活的地方。类似的说法听得多了，她也渐渐对这座城市产生向往。'],
    ['此后｜安居桃原','经过一段时间的考虑，张文华最终决定迁往桃原市，生活也慢慢归于平静。']
  ];
  const timeline=[
    ['1976年｜出生于云阳','张文华出生于云阳周边农村。年轻时家境普通，很早便开始帮家里分担生活压力。'],
    ['年轻时期｜离开家乡','成年后，张文华与好友郑秀琴一同离开农村来到云阳市，希望通过工作改变原本的生活。两人随后进入同一家服装厂，平日彼此照应，关系一直很好。'],
    ['工厂时期｜第一次听说桃原市','在工厂宿舍生活期间，一位年长女工曾多次向她们提起“桃原市”，称只要多做好事、积累福报，将来便有机会去往一个没有贫穷和痛苦的地方。张文华起初只把这些话当作长辈的安慰，并没有真正放在心上。'],
    ['工厂时期｜经历风波','工作期间，厂内接连发生了一些异常事件。1998年，一名与她们相熟的女工在设备事故中意外去世。此后，张文华也逐渐意识到工厂内部存在不少问题。这段经历给她留下了很深的影响，也让她始终没有彻底忘记年轻时听到的“桃原市”。'],
    ['离开工厂｜各自开始生活','经历那段时期后，张文华后来离开工厂，逐渐建立自己的家庭。虽然生活方向发生变化，她与郑秀琴仍一直保持联系。'],
    ['成家以后｜家庭与牵挂','张文华婚后生下陈珍珍，家庭生活并不宽裕。郑秀琴时常来看望她们'],
    ['生活低谷｜桃原市再次被提起','后来，郑秀琴的生活陷入低谷，并再次向张文华提起年轻时在工厂听说的“桃原市”。她开始认真相信，只要积累足够的福报，就能够前往那里。张文华起初并不认同，只把这些话当作好友在困境中的寄托。'],
    ['2005年｜故友离世','2005年，郑秀琴意外离世，年仅30岁。张文华一直无法释怀她生前最后一段时间的状态，也开始反复想起她曾说过的“桃原市”和“福报”。原本被她当作传闻的东西，也从此变成了一件始终无法彻底忘记的事。'],
    ['郑愿出生以后｜送往郑家','后来郑愿出生。由于家庭经济状况持续紧张，夫妻关系也长期不稳，张文华最终将年幼的郑愿交由郑家亲属照料。对她而言，这既是现实中的无奈选择，也多少带着对故友郑秀琴的愧疚与牵挂。'],
    ['2013年｜离世','2013年，张文华于云阳市家中离世，享年37岁。']
  ];
  const fortuneRecords=[
    {title:'在医院门口给绝症患者家属免费送盒饭',paragraphs:['张文华曾连续一段时间在医院附近为陪护病人的家属准备简单餐食。她认为长期照顾病人已经足够辛苦，至少应该让这些人在最疲惫的时候能够吃上一顿热饭。','后期她也开始频繁与一些长期陪护的家属交谈，尤其关注那些已经失去治疗希望的病人。'],verdict:'获得福报'},
    {title:'每天进行力所能及的布施',paragraphs:['张文华会定期拿出一部分收入帮助生活困难的人，有时是现金，有时是食物和生活用品。即使自身生活并不宽裕，她仍认为“自己还能撑过去，就应该帮一把更难的人”。'],verdict:'获得福报'},
    {title:'收养附近的流浪猫',paragraphs:['张文华曾陆续将住处附近受伤、生病或无人照料的流浪猫带回家中照顾，并自行承担食物和治疗费用。'],verdict:'获得福报'},
    {title:'将家中不用的物品送给有需要的人',paragraphs:['张文华会主动整理家中闲置的衣物、家具和日用品，并将仍可使用的物品送给附近生活困难的家庭。'],verdict:'获得福报'},
    {title:'长期帮助行动不便者处理生活困难',paragraphs:['张文华曾主动帮助附近几名行动不便或长期卧床的人处理生活中的实际问题，包括购买生活用品、陪同就医以及处理一些个人生活上的困难。'],verdict:'获得福报'},
    {title:'对长期表达痛苦的人采取解脱行为',paragraphs:['张文华主动帮助有困难的人寻得安宁'],verdict:'福报已满'}
  ];
  app.innerHTML=`<div class="life-memorial-shell"><aside class="life-profile"><img class="life-portrait" src="assets/zhang-wenhua-portrait.webp" alt="张文华"><h1>张文华</h1><p class="life-dates">1976.08.17　—　2013.11.03</p><p class="life-wish">愿记忆与思念长存。</p><dl><div><dt>性别</dt><dd>女</dd></div><div><dt>出生</dt><dd>1976年8月17日</dd></div><div><dt>籍贯</dt><dd>云阳</dd></div><div><dt>离世</dt><dd>2013年11月3日</dd></div><div><dt>安葬地</dt><dd>未注明</dd></div></dl><button class="life-flower" type="button">✿　献花</button></aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">祭奠记录</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline">${timeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('')}</div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>祭奠记录</h2><p>每一次到访，都让思念有了回声。</p></div><div class="tribute-list"></div><a class="tribute-action" href="#services/zhang-wenhua">前往祭奠</a></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2><p>那些没有说完的话，仍可以在这里轻轻写下。</p></div></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true" aria-labelledby="flower-confirm-title"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2 id="flower-confirm-title">已献花</h2><p>愿这一束花承载思念，长伴她安眠。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  app.querySelector('.life-profile dl div:last-child dd').textContent='云阳市纪念馆';
  if(document.body.classList.contains('invite-theme')){
    app.querySelector('.life-portrait').src='assets/zhang-wenhua-taoyuan.webp?v=2';
    app.querySelector('.life-wish').textContent='祝张女士在桃原市生活愉快';
    app.querySelector('.life-timeline').innerHTML=taoyuanTimeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('');
    const profileRows=app.querySelectorAll('.life-profile dl div');
    profileRows[3].querySelector('dt').textContent='安居';
    profileRows[4].querySelector('dt').textContent='登记地';
    profileRows[4].querySelector('dd').textContent='桃原市纪念馆';
  }
  addPersonalArchive('张文华',null);
  addMemorialBackLink('张文华');
  const messagePane=app.querySelector('[data-life-pane="messages"]');
  try{for(const wish of JSON.parse(localStorage.getItem('zhang-wenhua-wishes')||'[]')){const article=document.createElement('article');article.className='memorial-message';const by=document.createElement('b'),body=document.createElement('p'),time=document.createElement('time');by.textContent=wish.by||'普通用户';body.textContent=wish.message||'';time.textContent=wish.at||'';article.append(by,body,time);messagePane.append(article)}}catch(_){}
  setupMemorialMessageBoard('zhang-wenhua-wishes');
  app.querySelectorAll('[data-life-tab]').forEach(button=>button.onclick=()=>{app.querySelectorAll('[data-life-tab]').forEach(item=>item.classList.toggle('active',item===button));app.querySelectorAll('[data-life-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.lifePane===button.dataset.lifeTab))});
  if(initialTab!=='story')app.querySelector(`[data-life-tab="${initialTab}"]`)?.click();
  const notice=document.createElement('div');notice.className='offering-notice';notice.setAttribute('role','status');notice.textContent=offeringText(zhangOfferingState);notice.hidden=!zhangOfferingState.flower&&!zhangOfferingState.lamp;app.querySelector('.life-story').prepend(notice);
  const tributes=app.querySelector('.tribute-list');
  if(zhangOfferingState.flower||zhangOfferingState.lamp)tributes.innerHTML=Object.entries(zhangOfferingState).filter(([,active])=>active).map(([type])=>`<article><div class="tribute-person"><span>普通用户</span><b>${type==='flower'?'✿ 献花':'♨ 点燃长明灯'}</b></div><time>今日</time></article>`).join('');
  const dialog=app.querySelector('.flower-confirm'),close=()=>dialog.hidden=true;
  app.querySelector('.life-flower').onclick=()=>{zhangOfferingState={...zhangOfferingState,flower:true};notice.textContent=offeringText(zhangOfferingState);notice.hidden=false;dialog.hidden=false;app.querySelector('.flower-confirm-ok').focus()};
  app.querySelector('.flower-confirm-close').onclick=close;app.querySelector('.flower-confirm-ok').onclick=close;dialog.onclick=e=>{if(e.target===dialog)close()};
  if(document.body.classList.contains('invite-theme')){
    app.querySelectorAll('[data-life-tab="tributes"], [data-life-pane="tributes"] .tribute-heading h2').forEach(label=>label.textContent='福报记录');
    app.querySelector('[data-life-pane="tributes"] .tribute-heading p').textContent='以下为已记录的福报事项。';
    tributes.classList.add('fortune-record-list');
    tributes.innerHTML=fortuneRecords.map(({title,paragraphs,verdict})=>`<article class="fortune-record"><h3>${esc(title)}</h3>${paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}<p class="fortune-verdict"><strong>系统判定：</strong>${esc(verdict)}</p></article>`).join('');
    app.querySelector('.life-flower')?.remove();
    app.querySelector('.tribute-action')?.remove();
    dialog.remove();
  }
}
function zhengxiuqinMemorial(initialTab='story'){
  const timeline=[
  [
    "1975年｜出生于云阳",
    "郑秀琴出生于云阳周边农村。家境普通，年轻时便希望离开家乡，通过工作改变自己的生活。"
  ],
  [
    "年轻时期｜离开家乡",
    "成年后，郑秀琴与好友张文华一同来到云阳市，两人随后进入同一家服装厂工作。初到城市时彼此照应，是对方少数能够信任的人。"
  ],
  [
    "工厂时期｜第一次听说桃原市",
    "住在工厂宿舍期间，一位年长女工经常照顾她们，也曾多次提到一个叫“桃原市”的地方。她说，只要多做好事、积累福报，最后便能够去往一个没有贫穷和痛苦的地方。\n郑秀琴最初并不真正相信，只把这些话当作对生活的一种安慰。"
  ],
  [
    "1998年｜工厂风波",
    "1998年，一名与她们相熟的女工在设备事故中意外去世。此后发生的一些异常情况，使郑秀琴开始重新回想起对方过去有关“桃原市”的说法。\n与此同时，她逐渐发现厂内部分年轻女工长期遭受不当对待。郑秀琴开始私下帮助工友，并尝试将相关情况向外反映。"
  ],
  [
    "离开工厂｜重新开始生活",
    "离开工厂后，郑秀琴留在云阳市经营一家小型服装店。最初几年生意逐渐稳定，她也第一次觉得自己的生活真正有了起色。"
  ],
  [
    "生活逐渐稳定｜未能实现的愿望",
    "生活稍有好转后，郑秀琴也曾希望拥有自己的家庭和孩子，但始终没能如愿。\n她很少主动提起这件事，但却始终没能如愿."
  ],
  [
    "生活低谷｜店铺倒闭",
    "后来服装店经营出现问题，最终无法继续维持。除了生意失败，她还留下了一些债务和需要处理的后续问题。\n曾经好不容易建立起来的生活再次失去稳定，她开始变得沉默，也很少再谈以后要做什么。"
  ],
  [
    "低谷时期｜重新想起桃原市",
    "正是在这一时期，郑秀琴重新想起年轻时工厂宿舍里听到的“桃原市”。\n过去被她当作安慰的话，逐渐变成了另一种可能。\n她开始相信，如果真的能够积累足够的福报，也许有一天可以离开现在的生活，在另一个地方重新开始。\n此后，她开始更频繁地帮助他人，并有意识地记录自己所做的善事。"
  ],
  [
    "2005年｜离世",
    "2005年，郑秀琴意外离世，享年30岁"
  ]
];
  const fortuneRecords=[
    {title:'帮助拾荒老人 / 环卫工人',paragraphs:['郑秀琴平时遇到附近拾荒的老人或环卫工人，会主动送水、送饭，有时也会把店里不要的纸箱和旧物整理好交给他们。'],verdict:'获得福报'},
    {title:'捐给山区孩子自己剩下的衣物',paragraphs:['郑秀琴会把自己和店里剩下但还能穿的衣物整理出来，统一寄给山区学校和困难家庭。','服装店经营困难以后，她仍然保留了这个习惯。'],verdict:'获得福报'},
    {title:'借贷补发工人工资',paragraphs:['服装店经营出现问题后，郑秀琴一度无力结清员工工资。她后来通过借款筹集资金，陆续补发拖欠款项。'],verdict:'获得福报'},
    {title:'到养老院做义工照顾患病老人',paragraphs:['生活陷入低谷后，郑秀琴开始长期到养老院做义工，帮助行动不便、长期卧床或患有重病的老人处理日常生活。','在长期接触这些老人后，她开始频繁提到“活着是不是一定比离开更好”之类的问题。'],verdict:'获得福报'},
    {title:'将自己的积蓄交给病重老人的家属',paragraphs:['郑秀琴曾将自己剩余的大部分积蓄交给一名长期患病老人的家属，用于治疗和后续照护。'],verdict:'获得福报'},
    {title:'帮助长期受病痛折磨的人结束痛苦',paragraphs:['郑秀琴主动帮助长期受病痛折磨的人寻得安宁。'],verdict:'福报已满'}
  ];
  const taoyuanTimeline=[
    ['1975年｜出生于云阳','郑秀琴出生于云阳周边农村。家境普通，年轻时便离开家乡来到云阳市生活，希望通过工作让自己的日子慢慢稳定下来。'],
    ['年轻时期｜来到云阳市工作','成年后，郑秀琴与好友张文华一同进入服装厂工作。两人住在同一间宿舍，在陌生的城市里彼此照应，关系一直十分亲近。'],
    ['工作时期｜生活逐渐安定','随着工作渐渐稳定，郑秀琴的生活也慢慢有了起色。后来她离开工厂，在云阳市经营起一家小服装店，生意虽然不算很大，但日子过得踏实。'],
    ['成家以后｜建立自己的家庭','生活稳定后，郑秀琴结婚成家，也有了自己的孩子。她一直很珍惜这份来之不易的家庭生活，平日除了经营店铺，大部分时间都用来照顾家人。'],
    ['家庭稳定后｜与张文华一家保持往来','郑秀琴与张文华始终保持着联系。张文华有了陈珍珍和郑愿以后，也常带着两个孩子来店里找她。几个孩子年龄相近，见面时总能玩到一起，两家人的往来也因此一直没有断过。'],
    ['中年时期｜听闻桃原市','生活逐渐安稳以后，郑秀琴再次听人提起了年轻时曾听说过的“桃原市”。有人说，那里生活平静，没有太多烦恼，也很适合一家人长久生活。随着类似的说法越来越多，她也渐渐对那里产生向往。'],
    ['迁居桃原｜重新开始生活','经过一段时间的考虑，郑秀琴最终和家人一同来到桃原市生活。新的环境让一家人的生活慢慢稳定下来，她也重新开始经营自己的小店。'],
    ['此后｜安居桃原','郑秀琴此后一直与家人生活在桃原市。张文华也会偶尔带着陈珍珍和郑愿来探望她，两家人仍像从前一样保持往来，日子平静而普通。']
  ];
  const dark=document.body.classList.contains('invite-theme');
  const portrait=dark?'assets/zheng-xiuqin-taoyuan.webp':'assets/zheng-xiuqin-portrait.webp';
  app.innerHTML=`<div class="life-memorial-shell"><aside class="life-profile"><img class="life-portrait" src="${portrait}" alt="郑秀琴"><h1>郑秀琴</h1><p class="life-dates">1975　—　2005.05.12</p><p class="life-wish">愿记忆与思念长存。</p><dl><div><dt>性别</dt><dd>女</dd></div><div><dt>出生</dt><dd>1975年</dd></div><div><dt>籍贯</dt><dd>云阳</dd></div><div><dt>离世</dt><dd>2005年5月12日</dd></div><div><dt>${dark?'登记地':'安葬地'}</dt><dd>${dark?'桃原市纪念馆':'云阳市纪念馆'}</dd></div></dl>${dark?'':'<button class="life-flower" type="button">✿　献花</button>'}</aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">${dark?'福报记录':'祭奠记录'}</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline">${timeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body).replace(/\n/g,'<br>')}</p></article>`).join('')}</div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>${dark?'福报记录':'祭奠记录'}</h2></div><div class="tribute-list"></div></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2></div></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true" aria-labelledby="flower-confirm-title"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2 id="flower-confirm-title">已献花</h2><p>愿这一束花承载思念，长伴她安眠。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  if(dark){
    app.querySelector('.life-timeline').innerHTML=taoyuanTimeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('');
    app.querySelector('[data-life-pane="tributes"] .tribute-heading').insertAdjacentHTML('beforeend','<p>以下为已记录的福报事项。</p>');
    const recordList=app.querySelector('[data-life-pane="tributes"] .tribute-list');
    recordList.classList.add('fortune-record-list');
    recordList.innerHTML=fortuneRecords.map(({title,paragraphs,verdict})=>`<article class="fortune-record"><h3>${esc(title)}</h3>${paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}<p class="fortune-verdict"><strong>系统判定：</strong>${esc(verdict)}</p></article>`).join('');
    app.querySelector('.life-dates').textContent='1975　—　';
    app.querySelector('.life-wish').textContent='祝郑女士在桃原市生活愉快';
    const rows=app.querySelectorAll('.life-profile dl div');
    rows[3].querySelector('dt').textContent='现居';
    rows[3].querySelector('dd').textContent='桃原市';
  }
  addMemorialBackLink('郑秀琴');
  addPersonalArchive('郑秀琴',null);
  setupMemorialMessageBoard('zheng-xiuqin-wishes',{loadStored:true});
  app.querySelectorAll('[data-life-tab]').forEach(button=>button.onclick=()=>{app.querySelectorAll('[data-life-tab]').forEach(item=>item.classList.toggle('active',item===button));app.querySelectorAll('[data-life-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.lifePane===button.dataset.lifeTab))});
  if(initialTab!=='story')app.querySelector(`[data-life-tab="${initialTab}"]`)?.click();
  const dialog=app.querySelector('.flower-confirm'),close=()=>dialog.hidden=true;
  if(dark){dialog.remove();return}
  app.querySelector('.life-flower').onclick=()=>{dialog.hidden=false;app.querySelector('.flower-confirm-ok').focus()};
  app.querySelector('.flower-confirm-close').onclick=close;app.querySelector('.flower-confirm-ok').onclick=close;dialog.onclick=e=>{if(e.target===dialog)close()};
}
addEventListener('hashchange',route);route();

