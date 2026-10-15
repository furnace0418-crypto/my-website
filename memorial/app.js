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
const previousAccount=JSON.parse(localStorage.getItem('memorial-account')||'null');
if(previousAccount?.password&&previousAccount.phone!=='123456'&&!localStorage.getItem('memorial-registered-account'))localStorage.setItem('memorial-registered-account',JSON.stringify(previousAccount));
localStorage.removeItem('memorial-account');
localStorage.removeItem('memorial-invite-theme');
const account=()=>JSON.parse(localStorage.getItem('memorial-account')||'null');
const loginHistoryKey='memorial-login-history';
function recentLoginAccounts(){
  try{
    const entries=JSON.parse(localStorage.getItem(loginHistoryKey)||'[]');
    return Array.isArray(entries)?entries.filter(id=>typeof id==='string'&&id.length<=32).slice(0,5):[];
  }catch(_){return[]}
}
function rememberLoginAccount(id){
  if(!id)return;
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
const zhengxiuqin={id:'zheng-xiuqin',name:'郑秀琴',birth:'1975年',death:'2008年05月12日',creator:'安念堂',bio:'郑秀琴生于云阳，2008年于云阳市城南区离世。',records:[]};
const halls=()=>[zhenzhen,zhangwenhua,zhengxiuqin,demo,...saved()];
const searchableHalls=()=>halls().filter(h=>!(document.body.classList.contains('invite-theme')&&h.id==='chen-zhenzhen'&&!window.memorialRegistrationState?.chen));
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
  if(chenRegistrationNoticeShown||chenRegistrationNoticePending||document.body.classList.contains('invite-theme'))return;
  if(offerings().flower&&offerings().lamp){
    chenRegistrationNoticePending=true;
  }
}
function showChenRegistrationNotice(){
  if(chenRegistrationNoticeShown||!chenRegistrationNoticePending)return;
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
  setTimeout(()=>notice.remove(),1100);
}
window.memorialLampBridge={recordLamp:id=>{if(id==='zhang-wenhua')zhangOfferingState={...zhangOfferingState,lamp:true};else if(id==='chen-zhenzhen'){saveOffering('lamp');queueChenRegistrationNotice('lamp')}}};
const offeringText=state=>state.flower&&state.lamp?'你已经献花，并点燃长明灯了。':state.flower?'你已经献花了。':state.lamp?'你已经点燃长明灯了。':'你还没有进行祭奠。';
const wishKey='chen-zhenzhen-wishes';
const memorialWishes=()=>{try{const entries=JSON.parse(localStorage.getItem(wishKey)||'[]');return Array.isArray(entries)?entries:[]}catch(_){return[]}};
function applyOfferingIcons(){
  app.querySelectorAll('.service-grid b,.tribute-person b').forEach(element=>{
    if(element.textContent.includes('♨')){
      const label=element.closest('.tribute-person')?'点燃长明灯':'';
      element.innerHTML=`<img class="lamp-symbol" src="assets/lamp-symbol.png?v=1" alt="">${label?`<span>${label}</span>`:''}`;
    }else if(/[❀✿]/u.test(element.textContent)){
      const label=element.closest('.tribute-person')?'献花':'';
      element.innerHTML=`<img class="flower-symbol" src="assets/flower-symbol.png?v=2" alt="">${label?`<span>${label}</span>`:''}`;
    }
  });
  const flowerButton=app.querySelector('.life-flower');
  if(flowerButton)flowerButton.innerHTML='<img class="flower-symbol" src="assets/flower-symbol.png?v=2" alt="">献花';
  const flowerDialogIcon=app.querySelector('.flower-confirm-icon');
  if(flowerDialogIcon)flowerDialogIcon.innerHTML='<img class="flower-symbol" src="assets/flower-symbol.png?v=2" alt="">';
  const genericFlower=app.querySelector('[data-rite="献花"]');
  if(genericFlower)genericFlower.innerHTML='<img class="flower-symbol" src="assets/flower-symbol.png?v=2" alt="">献花';
  const mailbox=[...app.querySelectorAll('.service-grid a')].find(link=>link.querySelector('strong')?.textContent==='时空信箱');
  if(mailbox)mailbox.querySelector('b').innerHTML='<img class="letter-symbol" src="assets/letter-symbol.png?v=1" alt="">';
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
  confirm.onclick=()=>{if(inviteTransitionPending||confirm.disabled)return;if(code.value.trim()!=='123456'){error.textContent='邀请码无效，请核对后重新输入。';code.focus();return}confirm.disabled=true;close();activateInviteAccess()};
  prompt.onclick=e=>{if(e.target===prompt)close()};
  code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();prompt.querySelector('.invite-confirm').click()}};
  code.focus();
}
function header(){
  const user=account(),name=document.querySelector('#accountName'),exit=document.querySelector('#exitLink'),security=document.querySelector('#changePasswordLink'),registerLink=document.querySelector('.account-register'),login=document.querySelector('.account-login'),articlesLink=document.querySelector('#articlesLink');
  const signedIn=Boolean(user),darkTheme=document.body.classList.contains('invite-theme');
  if(name)name.textContent=signedIn?(darkTheme?'特邀访客':user.name||'普通用户'):'登录';
  if(exit)exit.hidden=!user;
  if(registerLink)registerLink.hidden=signedIn;
  if(security)security.hidden=!user||user.accountId==='123456';
  if(articlesLink)articlesLink.textContent='资讯';
  if(login){login.href=signedIn?'#':'#login';login.title=signedIn?(darkTheme?'切换至普通用户主题':inviteAccessGranted?'切换至特邀访客主题':'验证特邀访问权限'):'';login.onclick=signedIn?(event=>{event.preventDefault();if(darkTheme||inviteAccessGranted)toggleInviteTheme();else showInviteVerification()}):null;}
}
function home(){app.innerHTML=`<section class="invite-hero-copy"><h1>欢迎来到桃原市</h1><p>安念堂由福善文化研究会发起，致力于保存城市记忆，传承生命故事，<br>让每一份思念都有安放之地。</p><form class="hero-search" action="#browse"><span>⌕</span><input aria-label="搜索逝者" placeholder="输入姓名，追忆故人"><button type="submit">搜索</button><small class="hero-search-error" hidden></small></form></section><section class="portal-hero"><div class="portal-hero-inner"><h1>为逝者留名，为思念留处</h1><p>安念堂由福善文化研究会发起，致力于保存城市记忆，传承生命故事，<br>让每一份思念都有安放之地。</p><form class="hero-search" action="#browse"><span>⌕</span><input aria-label="搜索逝者" placeholder="输入姓名，追忆故人"><button type="submit">搜索</button><small class="hero-search-error" hidden></small></form></div></section><section class="portal-main"><div class="platform-intro section-heading"><h2><span>︽</span> 平台简介 <span>︾</span></h2><p>安念堂是面向社会的公益性网络纪念平台。<br>我们以数字化的方式，保存逝者生平事迹，传承家族记忆，倡导文明祭祀，弘扬中华优秀传统文化，<br>让思念跨越时空，让记忆生生不息。</p></div><div class="values portal-values"><article class="value-card"><div class="value-icon"><img src="assets/value-civilized-rites.png" alt=""></div><div><h3>文明祭祀</h3><p>摒弃传统祭祀的陋习，用绿色环保的方式寄托哀思，减少资源消耗和环境污染。</p></div></article><article class="value-card"><div class="value-icon"><img src="assets/value-across-time.png" alt=""></div><div><h3>跨越时空</h3><p>无论身在何处，都能随时缅怀逝者，打破地域限制，让思念不再受距离阻隔。</p></div></article><article class="value-card"><div class="value-icon"><img src="assets/value-memory-legacy.png" alt=""></div><div><h3>记忆传承</h3><p>记录逝者生平事迹，构建家族记忆档案，让后人能够了解先辈故事。</p></div></article></div><div class="portal-lower"><section class="service-panel"><div class="section-heading"><h2><span>︽</span> 服务介绍 <span>︾</span></h2><p>以科技传递思念，用文化守护记忆</p></div><div class="service-grid"><a href="#create"><b>⌂</b><strong>创建纪念馆</strong><span>为逝者建立一处永恒的纪念空间</span></a><a href="#browse"><b>❀</b><strong>网上献花</strong><span>以花寄情，遥表思念</span></a><a href="#services"><b>♨</b><strong>点亮长明灯</strong><span>一盏微光，长照思念</span></a><a href="#letters"><b>▤</b><strong>留言寄思</strong><span>写下你想对他说的话</span></a><a href="#letters"><b>✉</b><strong>时空信箱</strong><span>给逝去的亲人写一封信</span></a></div></section><aside class="notice-panel"><div class="section-heading"><h2><span>︽</span> 研究会公告 <span>︾</span></h2><p>发布公益纪念项目动态与文明祭祀倡议</p></div><ul><li><span>关于安念堂公益纪念平台正式上线的公告</span><time>2024-04-01</time></li><li><span>清明节网络祭祀倡议书</span><time>2024-03-28</time></li><li><span>关于纪念馆内容审核与管理的说明</span><time>2024-02-15</time></li><li><span>福善文化研究会2024年工作计划</span><time>2024-01-20</time></li></ul></aside></div><section class="about-panel"><div class="section-heading"><h2><span>︽</span> 关于我们 <span>︾</span></h2><p>让城市记住每一个平凡而珍贵的生命</p></div><div class="about-copy"><p>安念堂是福善文化研究会发起的公益纪念项目。我们关注生命故事的保存与家族记忆的传承，希望借助温和、庄重的数字方式，为每一份思念提供长久安放的空间。</p><p>平台倡导文明、节俭、绿色的纪念方式，并持续整理地方人物故事、家庭影像与口述资料，让普通人的生命经历也能被认真记录、被后人看见。</p></div></section></section>`;document.querySelectorAll('.hero-search').forEach(form=>form.onsubmit=e=>{e.preventDefault();const q=e.currentTarget.querySelector('input').value.trim(),error=e.currentTarget.querySelector('.hero-search-error');if(!q){error.textContent='请输入要搜索的姓名';error.hidden=false;return}const found=searchableHalls().filter(h=>h.name.includes(q));if(!found.length){error.textContent='未找到相关纪念馆';error.hidden=false;return}error.hidden=true;pendingBrowseQuery=q;location.hash='#browse'});}
function register(){
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>用户注册</h1><p>设置昵称和密码，保存你的回忆</p></div><form class="form-body" id="registerForm"><div class="message" id="formMessage" hidden></div><label class="field"><span>昵称</span><input name="name" autocomplete="nickname" placeholder="填写一个你喜欢的名字，无需真实姓名" maxlength="24" required></label><label class="field"><span>设置密码</span><input name="password" type="password" autocomplete="new-password" placeholder="至少 8 位" minlength="8" required></label><label class="check"><input type="checkbox" name="terms" required>我已阅读并同意用户协议和隐私政策</label><button class="btn" type="submit">注册</button><p class="fine-print">已有账号？ <a href="#login">立即登录</a></p></form></div></div>`;
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
  registerForm.onsubmit=async e=>{
    e.preventDefault();
    const form=e.currentTarget,message=document.querySelector('#formMessage');
    const nickname=field(form,'name').trim(),password=field(form,'password');
    message.hidden=true;passwordHint.hidden=true;
    if(nickname.length<2||nickname.length>24){message.textContent='昵称需为 2 至 24 个字符';message.hidden=false;form.elements.namedItem('name').focus();return}
    if(password.length<8||password.length>128){passwordHint.textContent='密码需为 8 至 128 位';passwordHint.hidden=false;form.elements.namedItem('password').focus();return}
    if(!form.elements.namedItem('terms').checked){message.textContent='请先阅读并同意用户协议和隐私政策';message.hidden=false;return}
    const submit=form.querySelector('[type="submit"]');
    submit.disabled=true;
    try{
      const user=await window.memorialLocalAuth.create(nickname,password);
      localStorage.setItem('memorial-account',JSON.stringify(user));
      rememberLoginAccount(user.accountId);
      header();
      location.hash='#home';
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
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>用户登录</h1><p>回到安念堂，继续珍藏记忆</p></div><form class="form-body" id="loginForm"><div class="message" id="formMessage" hidden></div><label class="field"><span>昵称</span><input name="nickname" autocomplete="username" placeholder="请输入昵称" required></label><label class="field"><span>密码</span><input name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required></label><button class="btn" type="submit">登录</button><p class="fine-print">还没有账号？ <a href="#register">立即注册</a></p></form></div></div><div class="invite-prompt" hidden><section role="dialog" aria-modal="true" aria-labelledby="invite-title"><button class="invite-close" type="button" aria-label="关闭">×</button><h2 id="invite-title">你有邀请码吗？</h2><p>邀请码不是必填，没有邀请码也可以正常使用安念堂。</p><label><span>邀请码</span><input id="inviteCode" inputmode="numeric" maxlength="6" placeholder="请输入邀请码"></label><small id="inviteError" role="alert"></small><div><button class="invite-skip" type="button">没有邀请码，继续使用</button><button class="invite-confirm" type="button">确认邀请码</button></div></section></div>`;
  const form=document.querySelector('#loginForm'),prompt=document.querySelector('.invite-prompt'),code=document.querySelector('#inviteCode'),error=document.querySelector('#inviteError');
  const accountInput=form.elements.namedItem('nickname');
  const forgot=document.createElement('p');
  forgot.className='fine-print login-forgot';
  forgot.innerHTML='<button type="button">忘记密码？</button><span hidden>若已退出且不记得密码，请重新注册。</span>';
  form.querySelector('.fine-print').before(forgot);
  forgot.querySelector('button').onclick=()=>{forgot.querySelector('span').hidden=!forgot.querySelector('span').hidden};
  const history=document.createElement('div');
  history.className='login-account-history';
  accountInput.closest('.field').after(history);
  const renderLoginHistory=()=>{
    const ids=recentLoginAccounts();
    history.replaceChildren();
    history.hidden=!ids.length;
    if(!ids.length)return;
    const title=document.createElement('p');
    title.textContent='此设备登录过的昵称';
    history.append(title);
    for(const id of ids){
      const item=document.createElement('div');
      item.className='login-account-item';
      const choose=document.createElement('button');
      choose.type='button';
      const savedProfile=window.memorialLocalAuth.profile(id);
      choose.textContent=savedProfile.name;
      choose.onclick=()=>{accountInput.value=savedProfile.name;form.elements.namedItem('password').focus()};
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='login-account-remove';
      remove.textContent='×';
      remove.setAttribute('aria-label',`移除昵称 ${savedProfile.name}`);
      remove.onclick=()=>{localStorage.setItem(loginHistoryKey,JSON.stringify(recentLoginAccounts().filter(entry=>entry!==id)));renderLoginHistory()};
      item.append(choose,remove);
      history.append(item);
    }
  };
  renderLoginHistory();
  prompt.querySelector('h2').textContent='特邀访问权限验证';
  prompt.querySelector('p').textContent='该邀请码用于验证特邀访客身份。完成验证后，可进入特邀主题并访问相应内容；如暂不验证，仍可继续使用普通用户功能。';
  prompt.querySelector('label span').textContent='特邀邀请码';
  prompt.querySelector('.invite-skip').textContent='暂不验证';
  prompt.querySelector('.invite-confirm').textContent='验证并进入';
  const finish=(user,invited)=>{localStorage.setItem('memorial-account',JSON.stringify(user));rememberLoginAccount(user.accountId||user.phone);if(!invited){inviteAccessGranted=false;localStorage.removeItem('memorial-invite-theme');applyInviteTheme();header();location.hash='#home';return}activateInviteAccess();};
  form.onsubmit=async e=>{
    e.preventDefault();
    const f=e.currentTarget,nickname=field(f,'nickname').trim(),password=field(f,'password');
    const message=f.querySelector('#formMessage'),submit=f.querySelector('[type="submit"]');
    message.hidden=true;submit.disabled=true;
    try{
      const special=nickname==='123456'&&password==='123456';
      const user=special?{name:'特邀访客',accountId:'123456',phone:'123456'}:await window.memorialLocalAuth.verify(nickname,password);
      if(!user){message.hidden=false;message.textContent='昵称或密码不正确';return}
      if(!special){finish(user,false);return}
      prompt.hidden=false;prompt.dataset.user=JSON.stringify(user);code.focus();
    }catch(_){message.hidden=false;message.textContent='登录失败，请稍后重试。'}
    finally{submit.disabled=false}
  };
  const currentUser=()=>JSON.parse(prompt.dataset.user);
  document.querySelector('.invite-skip').onclick=()=>finish(currentUser(),false);
  document.querySelector('.invite-close').onclick=()=>finish(currentUser(),false);
  const confirm=prompt.querySelector('.invite-confirm');
  confirm.onclick=()=>{if(inviteTransitionPending||confirm.disabled)return;if(code.value.trim()!=='123456'){error.textContent='邀请码无效，请核对后重新输入。';code.focus();return}confirm.disabled=true;prompt.hidden=true;finish(currentUser(),true)};
}
function changePasswordPage(){
  const user=account();
  if(!user||user.accountId==='123456'){location.hash='#login';return}
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>修改密码</h1><p>昵称 <span id="securityAccount"></span></p></div><form class="form-body" id="changePasswordForm"><div class="message" id="formMessage" hidden></div><label class="field"><span>当前密码</span><input name="current" type="password" autocomplete="current-password" required></label><label class="field"><span>新密码</span><input name="password" type="password" autocomplete="new-password" placeholder="至少 8 位" required></label><label class="field"><span>确认新密码</span><input name="confirm" type="password" autocomplete="new-password" required></label><button class="btn" type="submit">保存新密码</button></form></div></div>`;
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
function createResidentRegistrationNote(){
  const note=document.createElement('details');note.className='resident-note memorial-registration-note';
  note.innerHTML='<summary><span class="resident-note-label">温馨提示</span><strong>居民登记补充说明</strong><span class="resident-note-toggle">查看详情</span></summary><div class="resident-note-body"><h3>居民登记补充说明</h3><p>根据现有居民登记资料，产生前往桃原市的意愿并不意味着最终一定能够完成迁入，死亡本身也不是判定居民资格的唯一条件。部分申请人在现实中死亡后，其登记状态仍长期处于“未完成”，相关纪念馆亦不会生成；只有完成完整迁入流程的人员，才会被正式纳入桃原市居民记录。</p><p>与此同时，在少数福报值较高的个案中，当事人在迁入前曾出现较为特殊的认知与影像记录，例如反复提到“另一个自己”、在镜面或影像中看见与自身相似的人，或认为“那边的自己已经开始生活”。此类现象通常出现在迁入流程后期，目前被视为高福报状态下可能出现的伴随反应。个别记录还显示，当事人所描述的“另一个自己”在性格、选择或行为上与本人并不完全一致，相关情况目前仍缺乏足够案例作进一步说明。</p></div>';
  note.addEventListener('toggle',()=>note.querySelector('.resident-note-toggle').textContent=note.open?'收起详情':'查看详情');
  return note;
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
function create(section='details'){
  if(!account()){location.hash='#register';return}
  const lamp=section==='lantern';
  app.innerHTML=`<div class="page-shell create-page"><div class="create-page-head"><h1>创建纪念馆</h1><p>为逝者建立专属的记忆空间</p></div><div class="create-sections" role="tablist" aria-label="创建纪念馆栏目"><a role="tab" aria-selected="${!lamp}" href="#create">基本资料</a><a role="tab" aria-selected="${lamp}" href="#create/lantern">定制长明灯</a></div><div class="create-section-body">${lamp?'<iframe class="create-lantern-frame" title="定制长明灯" src="lantern.html?v=2" loading="lazy" allow="fullscreen"></iframe>':'<form class="form-body create-form" id="createForm"><label class="field"><span>逝者姓名</span><input name="name" required placeholder="请输入姓名"></label><label class="field"><span>出生日期</span><input name="birth" type="date" required></label><label class="field"><span>逝世日期</span><input name="death" type="date" required></label><label class="field"><span>生平简介</span><textarea name="bio" placeholder="记录值得珍藏的故事"></textarea></label><button class="btn" type="submit">创建纪念馆</button></form>'}</div></div>`;
  if(lamp)return;
  document.querySelector('#createForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,h={id:String(Date.now()),name:f.name.value.trim(),birth:f.birth.value,death:f.death.value,creator:account().name,bio:f.bio.value.trim(),records:[]};localStorage.setItem('memorial-halls',JSON.stringify([...saved(),h]));location.hash='#hall/'+h.id;};
}
function myPage(){
  const user=account();
  if(!user){app.innerHTML='<div class="page-shell my-page"><div class="my-welcome"><h1>我的</h1><p>登录后可查看你创建的纪念馆和账户设置。</p><div class="my-welcome-actions"><a class="btn" href="#login">登录</a><a class="btn btn-outline" href="#register">注册</a></div></div></div>';return}
  const own=saved().filter(h=>h.creator===user.name);
  app.innerHTML=`<div class="page-shell my-page"><div class="my-profile"><div class="my-avatar" aria-hidden="true"></div><div><span class="my-eyebrow">我的安念堂</span><h1 id="myName"></h1><p>让思念有处安放，让记忆继续留存。</p></div></div><div class="my-layout"><main class="my-main"><div class="my-section-title"><div><h2>我创建的纪念馆</h2><p>你在这里保存的生命故事</p></div><a class="btn" href="#create">＋ 创建纪念馆</a></div><div class="my-hall-list" id="myHallList"></div></main><aside class="my-aside"><h2>账户设置</h2><a href="#change-password"><span>修改密码</span><span aria-hidden="true">›</span></a><a href="#logout"><span>退出登录</span><span aria-hidden="true">›</span></a></aside></div></div>`;
  app.querySelector('#myName').textContent=user.name;
  const list=app.querySelector('#myHallList');
  if(!own.length){list.innerHTML='<div class="my-empty"><strong>还没有创建纪念馆</strong><p>建立一处纪念空间，保存关于故人的故事。</p><a href="#create">开始创建 →</a></div>';return}
  own.forEach(h=>{const item=document.createElement('a');item.className='my-hall-item';item.href='#hall/'+encodeURIComponent(h.id);const title=document.createElement('strong');title.textContent=h.name;const meta=document.createElement('small');meta.textContent=[h.birth,h.death].filter(Boolean).join(' — ');const arrow=document.createElement('span');arrow.textContent='进入纪念馆 ›';item.append(title,meta,arrow);list.append(item)});
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
function addPersonalArchive(name,residentNumber){
  const tabs=app.querySelector('.life-tabs');
  tabs.querySelector('span').outerHTML='<button class="personal-archive-tab" type="button" data-life-tab="personal">个人信息留存</button>';
  const pane=document.createElement('div');
  pane.className='life-pane personal-archive-pane';
  pane.dataset.lifePane='personal';
  const rows=[...app.querySelectorAll('.life-profile dl div')].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent]);
  const details=`<div class="personal-archive-details"><h2>个人信息留存</h2><p>以下内容依据纪念馆现有资料留存。</p><dl><div><dt>姓名</dt><dd>${esc(name)}</dd></div>${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></div>`;
  if(!document.body.classList.contains('invite-theme')){
    pane.innerHTML=name==='陈珍珍'
      ?'<div class="personal-archive-details"><a class="personal-archive-folder" href="assets/chen-personal-archive.zip" download="陈珍珍-个人信息留存.zip" aria-label="下载陈珍珍个人信息留存资料，包含四张图片"><span class="personal-archive-folder-icon" aria-hidden="true"></span><span class="personal-archive-folder-copy"><strong>陈珍珍 · 个人资料</strong><small>文件夹　·　4 张图片</small></span><span class="personal-archive-folder-action">下载文件夹 ↓</span></a></div>'
      :details;
  }
  else{
    pane.innerHTML='<div class="personal-archive-gate"><h2>个人信息留存</h2><p>请输入该居民的居民编号，验证后查看留存资料。</p><form><label for="personal-resident-number">居民编号</label><div class="personal-archive-entry"><input id="personal-resident-number" name="residentNumber" type="text" autocomplete="off" spellcheck="false" required><button type="submit">确认查看</button></div><p class="personal-archive-error" role="alert" hidden></p></form></div>';
    pane.querySelector('form').onsubmit=event=>{
      event.preventDefault();
      const value=pane.querySelector('input').value.trim().toUpperCase();
      if(residentNumber&&value===residentNumber){pane.innerHTML=details;return}
      const error=pane.querySelector('.personal-archive-error');
      error.textContent=residentNumber?'居民编号有误，请核对后重试。':'该居民的留存资料暂未开放查询。';
      error.hidden=false;
    };
  }
  app.querySelector('.life-story').append(pane);
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
  const tributes=[['x华','献花','2025年09月25日 20:16'],['xx远','献花','2025年08月02日 07:43'],['x梅','点燃长明灯','2025年04月04日 10:05'],['xx兰','点燃长明灯','2025年03月19日 22:31'],['x宁','献花','2024年12月21日 09:12'],['xx安','献花','2024年10月03日 19:48'],['x林','点燃长明灯','2024年09月18日 14:26'],['x愿','点燃长明灯','2024年09月13日 21:41'],['x愿','献花','2024年09月13日 21:37']];
  const fortuneRecords=[
    {title:'捡垃圾，清理路面',paragraphs:['陈珍珍曾长期在居住地附近清理路边垃圾，捡拾烟头、塑料袋和废纸，并主动清扫楼栋周边的卫生死角。'],verdict:'清净环境，积累微量福报。'},
    {title:'布施蚂蚁',paragraphs:['陈珍珍会定期在楼下角落投放糖水、米粒和饼干碎屑，认为这样是在“照顾微小生命”。','后期她开始频繁提到“它们也有去处”“小东西也要被看见”。'],verdict:'获取福报'},
    {title:'只吃素食',paragraphs:['陈珍珍自某一阶段起开始坚持素食，并在聊天记录中多次表示“减少欲望”“不再沾染血气”会让人更接近平静。','她将节制饮食视为一种“自我净化”。'],verdict:'获取福报'},
    {title:'在妇科医院劝人不要堕胎',paragraphs:['陈珍珍曾多次前往妇科医院附近，与陌生人交谈，劝说对方“留下生命”“不要亲手结束一个可能来到世上的人”。'],verdict:'福报提升'},
    {title:'与抑郁症网友聊天，并劝其前往桃原市',paragraphs:['陈珍珍曾在网络上长期接触情绪低落、厌世或有自毁倾向的网友。她最初以安慰、陪伴和倾听为主，但后期聊天内容逐渐发生变化。她开始频繁提到“桃原市”，并将那里描述成一个“不会再痛苦的地方”、“真正可以结束一切的地方”。'],verdict:'福报已满'}
  ];
  app.innerHTML=`<div class="life-memorial-shell"><aside class="life-profile"><img class="life-portrait" src="assets/chen-zhenzhen-portrait.jpg" alt="陈珍珍"><h1>陈珍珍</h1><p class="life-dates">2004.03.14　—　2024</p><p class="life-wish">愿你在另一处，获得平静。</p><dl><div><dt>性别</dt><dd>女</dd></div><div><dt>出生</dt><dd>2004年3月14日</dd></div><div><dt>籍贯</dt><dd>云阳市</dd></div><div><dt>离世</dt><dd>2024年</dd></div><div><dt>安葬地</dt><dd>云阳市纪念馆</dd></div></dl><button class="life-flower" type="button">✿　献花</button></aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">祭奠记录</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline">${timeline.map(([title,text])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(text)}</p></article>`).join('')}</div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>祭奠记录</h2><p>每一次到访，都让思念有了回声。</p></div><div class="tribute-list">${tributes.map(([name,type,time])=>`<article><div class="tribute-person"><span>${name}</span><b>${type==='献花'?'✿ 献花':'♨ 点燃长明灯'}</b></div><time>${time}</time></article>`).join('')}</div><a class="tribute-action" href="#services">前往祭奠</a></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2><p>那些没有说完的话，仍可以在这里轻轻写下。</p></div><article class="memorial-message"><b>匿名用户</b><p>等等我</p></article></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true" aria-labelledby="flower-confirm-title"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2 id="flower-confirm-title">已献花</h2><p>愿这一束花伴她安眠，也让思念长久芬芳。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  if(document.body.classList.contains('invite-theme')){
    app.querySelectorAll('[data-life-tab="tributes"], [data-life-pane="tributes"] .tribute-heading h2').forEach(label=>label.textContent='福报记录');
    app.querySelector('[data-life-pane="tributes"] .tribute-heading p').textContent='以下为已记录的福报事项。';
    const recordList=app.querySelector('[data-life-pane="tributes"] .tribute-list');
    recordList.classList.add('fortune-record-list');
    recordList.innerHTML=fortuneRecords.map(({title,paragraphs,verdict})=>`<article class="fortune-record"><h3>${esc(title)}</h3>${paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}<p class="fortune-verdict"><strong>系统判定：</strong>${esc(verdict)}</p></article>`).join('');
    app.querySelector('.life-portrait').src='assets/chen-zhenzhen-taoyuan.png?v=2';
    app.querySelector('.life-wish').textContent='祝陈女士在桃原市生活愉快';
    app.querySelector('.life-timeline').innerHTML=taoyuanTimeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('');
    app.querySelector('[data-life-pane="story"]').appendChild(createResidentRegistrationNote());
    const profileRows=app.querySelectorAll('.life-profile dl div');
    profileRows[3].querySelector('dt').textContent='安居';
    profileRows[4].querySelector('dt').textContent='登记地';
    profileRows[4].querySelector('dd').textContent='桃原市纪念馆';
  }
  addPersonalArchive('陈珍珍','TYF03262620240912');
  addMemorialBackLink('陈珍珍');
  document.querySelector('.tribute-action').href='#services/chen-zhenzhen';
  const messagePane=document.querySelector('[data-life-pane="messages"]');
  for(const wish of memorialWishes().reverse()){
    const article=document.createElement('article'),by=document.createElement('b'),message=document.createElement('p'),time=document.createElement('time');
    article.className='memorial-message';by.textContent=wish.by||'普通用户';message.textContent=wish.message||'';time.textContent=wish.at||'';
    article.append(by,message,time);messagePane.insertBefore(article,messagePane.children[1]);
  }
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
function simple(title){app.innerHTML=`<div class="page-shell simple-page"><h1 class="page-heading">${title}</h1><p>相关内容正在整理中。</p><a class="btn" href="#home">返回首页</a></div>`;}
function fortuneExplanation(){app.innerHTML=`<div class="page-shell fortune-page"><header><h1 class="page-heading">福报说明</h1></header><section class="fortune-body"><div class="fortune-copy fortune-copy-light"><p>然世间诸事，虽有顺逆得失，善念善行终有其归。</p><p>有人身处困厄，独力难支。若有人伸手相扶，使其得以渡过难关，此事，可谓善乎？</p><p>有人心怀怨憎，几欲伤人害己。若有人劝其止怒，引其回转，使恶念不再增长，此事，又可谓善乎？</p><p>一切众生，自久远以来，受贪、嗔、痴三毒所扰，常因执念而生烦恼，因烦恼而起争端。若能以慈心待人，以善意解怨，使众生少受一分苦，亦使自身少造一分业。</p><p>故扶其困，是善。解其忧，是慈。劝其止恶，是度。</p><p>善念既生，善行相续，久而积之，是为福报。</p></div><div class="fortune-copy fortune-copy-dark"><p>然世间诸事，并非皆有善恶之明界。</p><p>有人身受重苦，求生不得，求死不能。若有人代其断苦，使其不再受此身之刑，此事，可谓恶乎？</p><p>有人恶业深重，终日伤人造业。若任其存世，则恶业日增；若断其恶行，使其不再害人，此事，又可谓恶乎？</p><p>一切众生，自久远以来，受贪、嗔、痴三毒所缚，妄想颠倒，恶业轮转。众生困于火宅，却不知火宅为苦。</p><p>故止其苦，是救。止其恶，是度。断其业，是慈悲</p></div><div class="fortune-video"><video src="assets/invite-home-v2.mp4" controls preload="none" playsinline></video></div></section></div>`;useCachedFortuneVideo(app.querySelector('.fortune-video video'));}
function route(){
  rememberInviteVideo();applyInviteTheme();header();
  const hash=decodeURIComponent(location.hash.slice(1)||'home');
  const [page,id,tab]=hash.split('/');
  if(page==='hall'&&id==='chen-zhenzhen'&&document.body.classList.contains('invite-theme')&&!window.memorialRegistrationState?.chen){location.hash='#browse';return}
  if(!account()&&(page==='letters'||(page==='services'&&!['chen-zhenzhen','zhang-wenhua'].includes(id)))){location.hash='#login';return}
  if(page==='home'){home();wireHomeBulletins()}
  else if(page==='services'&&!id){location.hash='#create/lantern';return}
  else if(page==='services'){
    const source=['chen-zhenzhen','zhang-wenhua'].includes(id)?`lantern.html?memorial=${id}&v=2`:'lantern.html?v=2';
    app.innerHTML=`<iframe title="云祭服务 · 定制长明灯" src="${source}" style="display:block;width:100%;height:1250px;border:0" allow="fullscreen"></iframe>`;
  }
  else if(page==='articles')bulletinPage(id);
  else if(page==='register')register();
  else if(page==='login')login();
  else if(page==='change-password')changePasswordPage();
  else if(page==='me')myPage();
  else if(page==='browse')browse(id);
  else if(page==='create')create(id);
  else if(page==='hall')hall(id,tab);
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
    ['年轻时期｜离开家乡','成年后，张文华与好友郑秀琴一同离开农村来到云阳市，希望通过工作改变原本的生活。两人随后进入同一家工厂，平日里彼此照应，关系一直很好。'],
    ['工厂时期｜第一次听说桃原市','在工厂宿舍生活期间，一位年长的阿姨曾多次向她们提起“桃原市”，称只要多做好事、积累福报，将来便有机会去往一个没有贫穷和痛苦的地方。张文华起初只把这些话当作长辈的安慰，并没有真正放在心上。'],
    ['工厂事故后｜各自开始生活','后来，那位阿姨在工厂的一次事故中去世。事故发生后，两人都曾再次想起她关于桃原市的说法，但并没有继续追究。离开工厂后，张文华逐渐成家，郑秀琴则在云阳市经营起一家服装店，两人仍一直保持联系。'],
    ['成家以后｜家庭与牵挂','张文华先后有了陈珍珍和郑愿。由于当时的家庭状况，郑愿幼年被送到一位故友的家庭中抚养。张文华一直牵挂着他，也会偶尔带陈珍珍去看望。'],
    ['生活变化后｜旧事再次被提起','郑秀琴的服装店后来因经营不善倒闭，生活陷入低谷。那段时间，她重新提起年轻时听说的“桃原市”，并开始认真相信通过积累福报能够去往那里。张文华虽然起初并不认同，但随着郑秀琴多次提起，也渐渐重新想起工厂时期的往事。'],
    ['2013年｜离世','张文华于云阳市家中离世，享年37岁']
  ];
  app.innerHTML=`<div class="life-memorial-shell"><aside class="life-profile"><img class="life-portrait" src="assets/zhang-wenhua-portrait.png" alt="张文华"><h1>张文华</h1><p class="life-dates">1976.08.17　—　2013.11.03</p><p class="life-wish">愿记忆与思念长存。</p><dl><div><dt>性别</dt><dd>女</dd></div><div><dt>出生</dt><dd>1976年8月17日</dd></div><div><dt>籍贯</dt><dd>云阳</dd></div><div><dt>离世</dt><dd>2013年11月3日</dd></div><div><dt>安葬地</dt><dd>未注明</dd></div></dl><button class="life-flower" type="button">✿　献花</button></aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">祭奠记录</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline">${timeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('')}</div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>祭奠记录</h2><p>每一次到访，都让思念有了回声。</p></div><div class="tribute-list"></div><a class="tribute-action" href="#services/zhang-wenhua">前往祭奠</a></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2><p>那些没有说完的话，仍可以在这里轻轻写下。</p></div></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true" aria-labelledby="flower-confirm-title"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2 id="flower-confirm-title">已献花</h2><p>愿这一束花承载思念，长伴她安眠。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  app.querySelector('.life-profile dl div:last-child dd').textContent='云阳市纪念馆';
  if(document.body.classList.contains('invite-theme')){
    app.querySelector('.life-portrait').src='assets/zhang-wenhua-taoyuan.png?v=2';
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
    tributes.querySelectorAll('article').forEach(record=>{if(record.querySelector('b')?.textContent.includes('献花'))record.remove()});
    app.querySelector('.life-flower')?.remove();
    app.querySelector('.tribute-action')?.remove();
    dialog.remove();
  }
}
function zhengxiuqinMemorial(initialTab='story'){
  const timeline=[
    ['1975年｜出生于云阳','郑秀琴出生于云阳周边农村。家境普通，年轻时便离开家乡来到云阳市谋生，希望靠自己的工作改善生活。'],
    ['年轻时期｜与张文华一同进厂','来到云阳市后，郑秀琴与好友张文华进入同一家服装厂工作。两人住在工厂宿舍，平日彼此照应，关系一直十分亲近。'],
    ['工厂时期｜第一次听说桃原市','在宿舍生活期间，一位年长女工曾多次向她们提起“桃原市”，称那里没有贫穷和痛苦，只要多做好事、积累福报，将来便有机会前往。郑秀琴起初只把这些话当作长辈的安慰，并没有真正相信。'],
    ['工厂时期｜经历风波','工作期间，郑秀琴逐渐察觉厂内部分年轻女工遭到不当对待，并曾私下帮助工友、匿名向有关部门反映情况。那段经历给她留下了很深的影响。此后不久，厂内又发生严重设备事故，一名与她们相熟的女工意外去世。'],
    ['离开工厂｜经营服装店','离开工厂后，郑秀琴留在云阳市生活，并凭借多年积累开了一家小服装店。生意最好的几年里，生活逐渐稳定，她与张文华也一直保持往来。'],
    ['此后｜接下郑愿的生活','故友由于家庭情况，将幼年的郑愿送到郑秀琴家中抚养。郑秀琴一直把他当作自家孩子照顾。'],
    ['事业受挫｜生活重新陷入低谷','后来，郑秀琴的服装店因经营不善逐渐陷入困境，最终停业，并留下了一些债务和尚未结清的员工工资。此后她靠零工维持生活，同时一点点偿还欠款。即便生活并不宽裕，她仍会参与一些志愿活动，也会尽力帮助比自己更困难的人。'],
    ['低谷时期｜重新想起桃原市','生活陷入低谷后，郑秀琴再次想起年轻时在工厂听过的“桃原市”。与过去不同的是，她开始认真相信，只要持续积累福报，或许真的能够去往一个没有痛苦、可以重新开始的地方。她也曾向身边人提起，自己正在完成一件“必须做完的事”。'],
    ['2008年｜离世','2008年5月12日，郑秀琴于云阳市城南区一处出租屋内离世。']
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
  const portrait=dark?'assets/zheng-xiuqin-taoyuan.png':'assets/zheng-xiuqin-portrait.png';
  app.innerHTML=`<div class="life-memorial-shell"><aside class="life-profile"><img class="life-portrait" src="${portrait}" alt="郑秀琴"><h1>郑秀琴</h1><p class="life-dates">1975　—　2008.05.12</p><p class="life-wish">愿记忆与思念长存。</p><dl><div><dt>性别</dt><dd>女</dd></div><div><dt>出生</dt><dd>1975年</dd></div><div><dt>籍贯</dt><dd>云阳</dd></div><div><dt>离世</dt><dd>2008年5月12日</dd></div><div><dt>${dark?'登记地':'安葬地'}</dt><dd>${dark?'桃原市纪念馆':'云阳市纪念馆'}</dd></div></dl>${dark?'':'<button class="life-flower" type="button">✿　献花</button>'}</aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">${dark?'福报记录':'祭奠记录'}</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline">${timeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('')}</div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>${dark?'福报记录':'祭奠记录'}</h2></div><div class="tribute-list"></div></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2></div></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true" aria-labelledby="flower-confirm-title"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2 id="flower-confirm-title">已献花</h2><p>愿这一束花承载思念，长伴她安眠。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  if(dark){
    app.querySelector('.life-timeline').innerHTML=taoyuanTimeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('');
    app.querySelector('.life-dates').textContent='1975　—　';
    app.querySelector('.life-wish').textContent='祝郑女士在桃原市生活愉快';
    const rows=app.querySelectorAll('.life-profile dl div');
    rows[3].querySelector('dt').textContent='现居';
    rows[3].querySelector('dd').textContent='桃原市';
  }
  addMemorialBackLink('郑秀琴');
  app.querySelectorAll('[data-life-tab]').forEach(button=>button.onclick=()=>{app.querySelectorAll('[data-life-tab]').forEach(item=>item.classList.toggle('active',item===button));app.querySelectorAll('[data-life-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.lifePane===button.dataset.lifeTab))});
  if(initialTab!=='story')app.querySelector(`[data-life-tab="${initialTab}"]`)?.click();
  const dialog=app.querySelector('.flower-confirm'),close=()=>dialog.hidden=true;
  if(dark){dialog.remove();return}
  app.querySelector('.life-flower').onclick=()=>{dialog.hidden=false;app.querySelector('.flower-confirm-ok').focus()};
  app.querySelector('.flower-confirm-close').onclick=close;app.querySelector('.flower-confirm-ok').onclick=close;dialog.onclick=e=>{if(e.target===dialog)close()};
}
addEventListener('hashchange',route);route();
