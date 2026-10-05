const app=document.querySelector('#app');
const navigation=performance.getEntriesByType?.('navigation')?.[0];
if(navigation?.type==='reload'||(!navigation&&performance.navigation?.type===1)){
  history.replaceState(null,'',location.pathname+location.search+'#home');
}
let pendingBrowseQuery='';
let inviteAccessGranted=false;
const saved=()=>JSON.parse(localStorage.getItem('memorial-halls')||'[]');
const previousAccount=JSON.parse(localStorage.getItem('memorial-account')||'null');
if(previousAccount&&previousAccount.phone!=='123456'&&!localStorage.getItem('memorial-registered-account'))localStorage.setItem('memorial-registered-account',JSON.stringify(previousAccount));
localStorage.removeItem('memorial-account');
localStorage.removeItem('memorial-invite-theme');
const account=()=>JSON.parse(localStorage.getItem('memorial-account')||'null');
const registeredAccount=()=>JSON.parse(localStorage.getItem('memorial-registered-account')||'null');
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
const halls=()=>[zhenzhen,zhangwenhua,demo,...saved()];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(form,name)=>form.elements.namedItem(name).value;
const dateText=()=>new Date().toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const offeringKey='chen-zhenzhen-offerings';
try{localStorage.removeItem(offeringKey)}catch(_){}
let offeringState={};
const offerings=()=>offeringState;
const saveOffering=type=>(offeringState={...offeringState,[type]:true});
let zhangOfferingState={};
window.memorialLampBridge={recordLamp:id=>{if(id==='zhang-wenhua')zhangOfferingState={...zhangOfferingState,lamp:true};else saveOffering('lamp')}};
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
  inviteAccessGranted=true;
  localStorage.setItem('memorial-invite-theme','1');
  inviteVideoDelayUntil=performance.now()+2350;
  playInviteGlitchSound();
  setTimeout(()=>{playInviteEntryFx();applyInviteTheme();if(location.hash==='#home')route();else location.hash='#home'},950);
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
  prompt.querySelector('.invite-confirm').onclick=()=>{if(code.value.trim()!=='123456'){error.textContent='邀请码无效，请核对后重新输入。';code.focus();return}close();activateInviteAccess()};
  prompt.onclick=e=>{if(e.target===prompt)close()};
  code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();prompt.querySelector('.invite-confirm').click()}};
  code.focus();
}
function header(){
  const user=account(),name=document.querySelector('#accountName'),exit=document.querySelector('#exitLink'),login=document.querySelector('.account-login'),articlesLink=document.querySelector('#articlesLink');
  const signedIn=Boolean(user),darkTheme=document.body.classList.contains('invite-theme');
  if(name)name.textContent=signedIn?(darkTheme?'特邀访客':'普通用户'):'登录';
  if(exit)exit.hidden=!user;
  if(articlesLink)articlesLink.textContent='福报说明';
  if(login){login.href=signedIn?'#':'#login';login.title=signedIn?(darkTheme?'切换至普通用户主题':inviteAccessGranted?'切换至特邀访客主题':'验证特邀访问权限'):'';login.onclick=signedIn?(event=>{event.preventDefault();if(darkTheme||inviteAccessGranted)toggleInviteTheme();else showInviteVerification()}):null;}
}
function home(){app.innerHTML=`<section class="invite-hero-copy"><h1>欢迎来到桃原市</h1><p>安念堂由福善文化研究会发起，致力于保存城市记忆，传承生命故事，<br>让每一份思念都有安放之地。</p><form class="hero-search" action="#browse"><span>⌕</span><input aria-label="搜索逝者" placeholder="输入姓名，追忆故人"><button type="submit">搜索</button><small class="hero-search-error" hidden></small></form></section><section class="portal-hero"><div class="portal-hero-inner"><h1>为逝者留名，为思念留处</h1><p>安念堂由福善文化研究会发起，致力于保存城市记忆，传承生命故事，<br>让每一份思念都有安放之地。</p><form class="hero-search" action="#browse"><span>⌕</span><input aria-label="搜索逝者" placeholder="输入姓名，追忆故人"><button type="submit">搜索</button><small class="hero-search-error" hidden></small></form></div></section><section class="portal-main"><div class="platform-intro section-heading"><h2><span>︽</span> 平台简介 <span>︾</span></h2><p>安念堂是面向社会的公益性网络纪念平台。<br>我们以数字化的方式，保存逝者生平事迹，传承家族记忆，倡导文明祭祀，弘扬中华优秀传统文化，<br>让思念跨越时空，让记忆生生不息。</p></div><div class="values portal-values"><article class="value-card"><div class="value-icon"><img src="assets/value-civilized-rites.png" alt=""></div><div><h3>文明祭祀</h3><p>摒弃传统祭祀的陋习，用绿色环保的方式寄托哀思，减少资源消耗和环境污染。</p></div></article><article class="value-card"><div class="value-icon"><img src="assets/value-across-time.png" alt=""></div><div><h3>跨越时空</h3><p>无论身在何处，都能随时缅怀逝者，打破地域限制，让思念不再受距离阻隔。</p></div></article><article class="value-card"><div class="value-icon"><img src="assets/value-memory-legacy.png" alt=""></div><div><h3>记忆传承</h3><p>记录逝者生平事迹，构建家族记忆档案，让后人能够了解先辈故事。</p></div></article></div><div class="portal-lower"><section class="service-panel"><div class="section-heading"><h2><span>︽</span> 服务介绍 <span>︾</span></h2><p>以科技传递思念，用文化守护记忆</p></div><div class="service-grid"><a href="#create"><b>⌂</b><strong>创建纪念馆</strong><span>为逝者建立一处永恒的纪念空间</span></a><a href="#browse"><b>❀</b><strong>网上献花</strong><span>以花寄情，遥表思念</span></a><a href="#services"><b>♨</b><strong>点亮长明灯</strong><span>一盏微光，长照思念</span></a><a href="#letters"><b>▤</b><strong>留言寄思</strong><span>写下你想对他说的话</span></a><a href="#letters"><b>✉</b><strong>时空信箱</strong><span>给逝去的亲人写一封信</span></a></div></section><aside class="notice-panel"><div class="section-heading"><h2><span>︽</span> 研究会公告 <span>︾</span></h2><p>发布公益纪念项目动态与文明祭祀倡议</p></div><ul><li><span>关于安念堂公益纪念平台正式上线的公告</span><time>2024-04-01</time></li><li><span>清明节网络祭祀倡议书</span><time>2024-03-28</time></li><li><span>关于纪念馆内容审核与管理的说明</span><time>2024-02-15</time></li><li><span>福善文化研究会2024年工作计划</span><time>2024-01-20</time></li></ul></aside></div><section class="about-panel"><div class="section-heading"><h2><span>︽</span> 关于我们 <span>︾</span></h2><p>让城市记住每一个平凡而珍贵的生命</p></div><div class="about-copy"><p>安念堂是福善文化研究会发起的公益纪念项目。我们关注生命故事的保存与家族记忆的传承，希望借助温和、庄重的数字方式，为每一份思念提供长久安放的空间。</p><p>平台倡导文明、节俭、绿色的纪念方式，并持续整理地方人物故事、家庭影像与口述资料，让普通人的生命经历也能被认真记录、被后人看见。</p></div></section></section>`;document.querySelectorAll('.hero-search').forEach(form=>form.onsubmit=e=>{e.preventDefault();const q=e.currentTarget.querySelector('input').value.trim(),error=e.currentTarget.querySelector('.hero-search-error');if(!q){error.textContent='请输入要搜索的姓名';error.hidden=false;return}const found=halls().filter(h=>h.name.includes(q));if(!found.length){error.textContent='未找到相关纪念馆';error.hidden=false;return}error.hidden=true;pendingBrowseQuery=q;location.hash='#browse'});}
function register(){
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>用户注册</h1><p>创建账号，开启云端缅怀之旅</p></div><form class="form-body" id="registerForm"><div class="message" id="formMessage" hidden></div><label class="field"><span>账号</span><input name="accountId" autocomplete="username" placeholder="请输入账号" required></label><label class="field"><span>密码</span><input name="password" type="password" inputmode="numeric" autocomplete="new-password" placeholder="请输入六位数字密码" minlength="6" maxlength="6" pattern="[0-9]{6}" title="请输入六位数字密码" required></label><label class="field"><span>确认密码</span><input name="confirm" type="password" inputmode="numeric" autocomplete="new-password" placeholder="请再次输入六位数字密码" minlength="6" maxlength="6" pattern="[0-9]{6}" title="请输入六位数字密码" required></label><label class="check"><input type="checkbox" name="terms" required>我已阅读并同意用户协议和隐私政策</label><button class="btn" type="submit">注册</button><p class="fine-print">已有账号？ <a href="#login">立即登录</a></p></form></div></div>`;
  const registerForm=document.querySelector('#registerForm');
  registerForm.noValidate=true;
  const fieldHint=input=>{
    const hint=document.createElement('div');
    hint.className='message field-hint';hint.setAttribute('role','alert');hint.hidden=true;
    input.closest('.field').after(hint);
    input.addEventListener('input',()=>{if(/^[0-9]{6}$/.test(input.value))hint.hidden=true});
    return hint;
  };
  const passwordHint=fieldHint(registerForm.elements.namedItem('password'));
  const confirmHint=fieldHint(registerForm.elements.namedItem('confirm'));
  registerForm.onsubmit=e=>{
    e.preventDefault();
    const form=e.currentTarget,message=document.querySelector('#formMessage');
    const accountId=field(form,'accountId').trim(),password=field(form,'password'),confirm=field(form,'confirm');
    message.hidden=true;passwordHint.hidden=true;confirmHint.hidden=true;
    if(!accountId){message.textContent='请输入账号';message.hidden=false;form.elements.namedItem('accountId').focus();return}
    if(!/^[0-9]{6}$/.test(password)){passwordHint.textContent='请输入六位数字密码';passwordHint.hidden=false;form.elements.namedItem('password').focus();return}
    if(!/^[0-9]{6}$/.test(confirm)){confirmHint.textContent='请再次输入六位数字密码';confirmHint.hidden=false;form.elements.namedItem('confirm').focus();return}
    if(password!==confirm){confirmHint.textContent='两次密码输入不一致';confirmHint.hidden=false;form.elements.namedItem('confirm').focus();return}
    if(!form.elements.namedItem('terms').checked){message.textContent='请先阅读并同意用户协议和隐私政策';message.hidden=false;return}
    const user={name:accountId,accountId,password};
    localStorage.setItem('memorial-registered-account',JSON.stringify(user));
    localStorage.setItem('memorial-account',JSON.stringify(user));
    header();location.hash='#home';
  };
}
function playInviteGlitchSound(){
  const audio=new Audio('assets/invite-jumpscare.mp3');
  audio.preload='auto';audio.volume=.9;audio.currentTime=0;
  audio.play().catch(()=>{});
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
  app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>用户登录</h1><p>回到安念堂，继续珍藏记忆</p></div><form class="form-body" id="loginForm"><div class="message" id="formMessage" hidden></div><label class="field"><span>账号</span><input name="accountId" autocomplete="username" placeholder="请输入账号" required></label><label class="field"><span>密码</span><input name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required></label><button class="btn" type="submit">登录</button><p class="fine-print">还没有账号？ <a href="#register">立即注册</a></p></form></div></div><div class="invite-prompt" hidden><section role="dialog" aria-modal="true" aria-labelledby="invite-title"><button class="invite-close" type="button" aria-label="关闭">×</button><h2 id="invite-title">你有邀请码吗？</h2><p>邀请码不是必填，没有邀请码也可以正常使用安念堂。</p><label><span>邀请码</span><input id="inviteCode" inputmode="numeric" maxlength="6" placeholder="请输入邀请码"></label><small id="inviteError" role="alert"></small><div><button class="invite-skip" type="button">没有邀请码，继续使用</button><button class="invite-confirm" type="button">确认邀请码</button></div></section></div>`;
  const form=document.querySelector('#loginForm'),prompt=document.querySelector('.invite-prompt'),code=document.querySelector('#inviteCode'),error=document.querySelector('#inviteError');
  prompt.querySelector('h2').textContent='特邀访问权限验证';
  prompt.querySelector('p').textContent='该邀请码用于验证特邀访客身份。完成验证后，可进入特邀主题并访问相应内容；如暂不验证，仍可继续使用普通用户功能。';
  prompt.querySelector('label span').textContent='特邀邀请码';
  prompt.querySelector('.invite-skip').textContent='暂不验证';
  prompt.querySelector('.invite-confirm').textContent='验证并进入';
  const finish=(user,invited)=>{localStorage.setItem('memorial-account',JSON.stringify(user));if(!invited){inviteAccessGranted=false;localStorage.removeItem('memorial-invite-theme');applyInviteTheme();header();location.hash='#home';return}activateInviteAccess();};
  form.onsubmit=e=>{e.preventDefault();const f=e.currentTarget,u=registeredAccount(),accountId=field(f,'accountId').trim(),password=field(f,'password'),special=accountId==='123456'&&password==='123456',valid=special||(u&&accountId===(u.accountId||u.phone)&&password===u.password);if(!valid){const m=document.querySelector('#formMessage');m.hidden=false;m.textContent='账号或密码不正确';return}if(!special){finish(u,false);return}const user={name:'特邀访客',accountId:'123456',phone:'123456',password:'123456'};prompt.hidden=false;prompt.dataset.user=JSON.stringify(user);code.focus();};
  const currentUser=()=>JSON.parse(prompt.dataset.user);
  document.querySelector('.invite-skip').onclick=()=>finish(currentUser(),false);
  document.querySelector('.invite-close').onclick=()=>finish(currentUser(),false);
  document.querySelector('.invite-confirm').onclick=()=>{if(code.value.trim()!=='123456'){error.textContent='邀请码无效，请核对后重新输入。';code.focus();return}finish(currentUser(),true)};
}
function browse(query=''){
  app.innerHTML=`<div class="page-shell"><h1 class="page-heading">浏览纪念馆</h1><form class="browse-tools" id="hallSearchForm"><svg class="browse-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><input class="search-input" id="hallSearch" placeholder="搜索逝者姓名"><button class="btn btn-gold" type="submit">搜索</button></form><div class="memorial-grid" id="hallGrid"></div></div>`;
  const grid=app.querySelector('#hallGrid'),input=app.querySelector('#hallSearch');
  input.value=query||pendingBrowseQuery;
  pendingBrowseQuery='';
  function draw(){
    const q=input.value.trim();
    if(!q){grid.innerHTML='<div class="empty">请输入故人姓名进行搜索</div>';return}
    const found=halls().filter(h=>h.name.includes(q));
    grid.innerHTML=found.length?found.map(h=>{const featured=['chen-zhenzhen','zhang-wenhua'].includes(h.id);const coverClass=h.id==='chen-zhenzhen'?' chen-cover':h.id==='zhang-wenhua'?' zhang-cover':'';return `<article class="memorial-card${featured?' featured-memorial':''}"><div class="memorial-cover${coverClass}">${featured?'':'☾'}</div><div class="memorial-card-body"><h2>${esc(h.name)}</h2><p>${esc(h.birth)} - ${esc(h.death)}</p><p>创建者: ${esc(h.creator)}</p><a class="btn btn-gold" href="#hall/${encodeURIComponent(h.id)}">${featured?'进入纪念馆':'❤ 进行祭祀'}</a></div></article>`}).join(''):'<div class="empty">没有找到相关纪念馆</div>';
  }
  app.querySelector('#hallSearchForm').onsubmit=e=>{e.preventDefault();draw()};
  draw();
}
function create(){if(!account()){location.hash='#register';return}app.innerHTML=`<div class="page-shell"><div class="panel form-panel"><div class="form-heading"><h1>创建纪念馆</h1><p>为逝者建立专属的记忆空间</p></div><form class="form-body" id="createForm"><label class="field"><span>逝者姓名</span><input name="name" required placeholder="请输入姓名"></label><label class="field"><span>出生日期</span><input name="birth" type="date" required></label><label class="field"><span>逝世日期</span><input name="death" type="date" required></label><label class="field"><span>生平简介</span><textarea name="bio" placeholder="记录值得珍藏的故事"></textarea></label><button class="btn" type="submit">创建纪念馆</button></form></div></div>`;document.querySelector('#createForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,h={id:String(Date.now()),name:f.name.value.trim(),birth:f.birth.value,death:f.death.value,creator:account().name,bio:f.bio.value.trim(),records:[]};localStorage.setItem('memorial-halls',JSON.stringify([...saved(),h]));location.hash='#hall/'+h.id;};}
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
  const tributes=[['x华','献花','2025年09月25日 20:16'],['xx远','点燃长明灯','2025年07月14日 08:42'],['x梅','献花','2025年04月04日 10:05'],['xx兰','点燃长明灯','2025年01月29日 17:31'],['x宁','献花','2024年12月21日 09:12'],['xx安','点燃长明灯','2024年10月03日 19:48'],['x林','献花','2024年09月18日 14:26']];
  app.innerHTML=`<div class="life-memorial-shell"><aside class="life-profile"><img class="life-portrait" src="assets/chen-zhenzhen-portrait.jpg" alt="陈珍珍"><h1>陈珍珍</h1><p class="life-dates">2004.03.14　—　2024</p><p class="life-wish">愿你在另一处，获得平静。</p><dl><div><dt>性别</dt><dd>女</dd></div><div><dt>出生</dt><dd>2004年3月14日</dd></div><div><dt>籍贯</dt><dd>云阳市</dd></div><div><dt>离世</dt><dd>2024年</dd></div><div><dt>安葬地</dt><dd>云阳市纪念馆</dd></div></dl><button class="life-flower" type="button">✿　献花</button></aside><section class="life-story"><nav class="life-tabs" aria-label="纪念馆栏目"><button class="active" data-life-tab="story">过往记事</button><button data-life-tab="tributes">祭奠记录</button><button data-life-tab="messages">留言板</button><span>／ 生者记忆 · 让爱延续 ／</span></nav><div class="life-pane active" data-life-pane="story"><div class="life-timeline">${timeline.map(([title,text])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(text)}</p></article>`).join('')}</div></div><div class="life-pane" data-life-pane="tributes"><div class="tribute-heading"><h2>祭奠记录</h2><p>每一次到访，都让思念有了回声。</p></div><div class="tribute-list">${tributes.map(([name,type,time])=>`<article><div class="tribute-person"><span>${name}</span><b>${type==='献花'?'✿ 献花':'♨ 点燃长明灯'}</b></div><time>${time}</time></article>`).join('')}</div><a class="tribute-action" href="#services">前往祭奠</a></div><div class="life-pane" data-life-pane="messages"><div class="tribute-heading"><h2>留言板</h2><p>那些没有说完的话，仍可以在这里轻轻写下。</p></div><article class="memorial-message"><b>◇◇</b><p>愿你在另一个世界，不再为生活奔波。</p><time>2025年09月20日</time></article><article class="memorial-message"><b>✧✧✧</b><p>我们记得你，也会好好生活。</p><time>2025年09月14日</time></article></div></section></div><div class="flower-confirm" hidden><section role="dialog" aria-modal="true" aria-labelledby="flower-confirm-title"><button class="flower-confirm-close" type="button" aria-label="关闭">×</button><div class="flower-confirm-icon">✿</div><h2 id="flower-confirm-title">已献花</h2><p>愿这一束花伴她安眠，也让思念长久芬芳。</p><button class="flower-confirm-ok" type="button">确定</button></section></div>`;
  if(document.body.classList.contains('invite-theme')){
    app.querySelector('.life-portrait').src='assets/chen-zhenzhen-taoyuan.png';
    app.querySelector('.life-wish').textContent='祝陈女士在桃原市生活愉快';
    app.querySelector('.life-timeline').innerHTML=taoyuanTimeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('');
    const profileRows=app.querySelectorAll('.life-profile dl div');
    profileRows[3].querySelector('dt').textContent='安居';
    profileRows[4].querySelector('dt').textContent='登记地';
    profileRows[4].querySelector('dd').textContent='桃原市纪念馆';
  }
  addMemorialBackLink('陈珍珍');
  document.querySelector('.tribute-action').href='#services/chen-zhenzhen';
  const messagePane=document.querySelector('[data-life-pane="messages"]');
  for(const wish of memorialWishes().reverse()){
    const article=document.createElement('article'),by=document.createElement('b'),message=document.createElement('p'),time=document.createElement('time');
    article.className='memorial-message';by.textContent=wish.by||'普通用户';message.textContent=wish.message||'';time.textContent=wish.at||'';
    article.append(by,message,time);messagePane.insertBefore(article,messagePane.children[1]);
  }
  document.querySelectorAll('[data-life-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-life-tab]').forEach(item=>item.classList.toggle('active',item===button));document.querySelectorAll('[data-life-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.lifePane===button.dataset.lifeTab));});
  if(initialTab!=='story')document.querySelector(`[data-life-tab="${initialTab}"]`)?.click();
  const offeringNotice=document.createElement('div');offeringNotice.className='offering-notice';offeringNotice.setAttribute('role','status');offeringNotice.textContent=offeringText(offerings());offeringNotice.hidden=!offerings().flower&&!offerings().lamp;document.querySelector('.life-story').prepend(offeringNotice);
  const flowerConfirm=document.querySelector('.flower-confirm');
  const closeFlowerConfirm=()=>{flowerConfirm.hidden=true};
  document.querySelector('.life-flower').onclick=()=>{offeringNotice.textContent=offeringText(saveOffering('flower'));offeringNotice.hidden=false;flowerConfirm.hidden=false;document.querySelector('.flower-confirm-ok').focus()};
  document.querySelector('.flower-confirm-close').onclick=closeFlowerConfirm;
  document.querySelector('.flower-confirm-ok').onclick=closeFlowerConfirm;
  flowerConfirm.onclick=e=>{if(e.target===flowerConfirm)closeFlowerConfirm()};
}
function hall(id,tab){if(id==='chen-zhenzhen'){zhenzhenMemorial(tab);return}if(id==='zhang-wenhua'){zhangwenhuaMemorial(tab);return}const h=halls().find(x=>x.id===id);if(!h){browse();return}app.innerHTML=`<div class="page-shell"><div class="panel"><div class="detail-head"><div class="portrait">☾</div><div><h1>${esc(h.name)}</h1><p>${esc(h.birth)} - ${esc(h.death)}　创建者: ${esc(h.creator)}</p><div class="rite-actions"><button data-rite="点烛">🕯 点烛</button><button data-rite="上香">♨ 上香</button><button data-rite="献花">🌿 献花</button></div></div></div><div class="detail-content"><h2>生平简介</h2><p class="bio">${esc(h.bio||'暂无生平简介')}</p><h2>祭祀记录</h2><div id="recordList"></div><form id="messageForm"><label class="field"><span>留下思念</span><textarea name="message" placeholder="写下想说的话" required></textarea></label><button class="btn" type="submit">发表留言</button></form></div></div></div>`;const list=document.querySelector('#recordList');function records(){list.innerHTML=h.records.length?h.records.map(r=>`<article class="record"><div class="record-top"><span><b>${esc(r.by)}</b>　${esc(r.type)}</span><time>${esc(r.at)}</time></div><p>${esc(r.text)}</p></article>`).join(''):'<p class="empty">尚无祭祀记录</p>'}records();function add(type,text){h.records.unshift({type,by:account()?.name||'访客',at:dateText(),text});if(h.id!=='demo'){localStorage.setItem('memorial-halls',JSON.stringify(saved().map(x=>x.id===h.id?h:x)))}records()}document.querySelectorAll('[data-rite]').forEach(b=>b.onclick=()=>{const t=b.dataset.rite;add(t,({点烛:'点燃了一支蜡烛，照亮前路',上香:'献上了一炷香，寄托哀思',献花:'献上了一束花，表达怀念'})[t])});document.querySelector('#messageForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;add('留言',f.message.value.trim());f.reset()};}
function simple(title){app.innerHTML=`<div class="page-shell simple-page"><h1 class="page-heading">${title}</h1><p>相关内容正在整理中。</p><a class="btn" href="#home">返回首页</a></div>`;}
function fortuneExplanation(){app.innerHTML=`<div class="page-shell fortune-page"><header><h1 class="page-heading">福报说明</h1></header><section class="fortune-body"><div class="fortune-copy fortune-copy-light"><p>然世间诸事，虽有顺逆得失，善念善行终有其归。</p><p>有人身处困厄，独力难支。若有人伸手相扶，使其得以渡过难关，此事，可谓善乎？</p><p>有人心怀怨憎，几欲伤人害己。若有人劝其止怒，引其回转，使恶念不再增长，此事，又可谓善乎？</p><p>一切众生，自久远以来，受贪、嗔、痴三毒所扰，常因执念而生烦恼，因烦恼而起争端。若能以慈心待人，以善意解怨，使众生少受一分苦，亦使自身少造一分业。</p><p>故扶其困，是善。解其忧，是慈。劝其止恶，是度。</p><p>善念既生，善行相续，久而积之，是为福报。</p></div><div class="fortune-copy fortune-copy-dark"><p>然世间诸事，并非皆有善恶之明界。</p><p>有人身受重苦，求生不得，求死不能。若有人代其断苦，使其不再受此身之刑，此事，可谓恶乎？</p><p>有人恶业深重，终日伤人造业。若任其存世，则恶业日增；若断其恶行，使其不再害人，此事，又可谓恶乎？</p><p>一切众生，自久远以来，受贪、嗔、痴三毒所缚，妄想颠倒，恶业轮转。众生困于火宅，却不知火宅为苦。</p><p>故止其苦，是救。止其恶，是度。断其业，是慈悲</p></div><div class="fortune-video"><video src="assets/invite-home.mp4" controls preload="metadata" playsinline></video></div></section></div>`;}
function route(){
  rememberInviteVideo();applyInviteTheme();header();
  const hash=decodeURIComponent(location.hash.slice(1)||'home');
  const [page,id,tab]=hash.split('/');
  if(!account()&&['letters','articles','services'].includes(page)){location.hash='#login';return}
  if(page==='home')home();
  else if(page==='services'){
    const source=['chen-zhenzhen','zhang-wenhua'].includes(id)?`lantern.html?memorial=${id}`:'lantern.html';
    app.innerHTML=`<iframe title="云祭服务 · 定制长明灯" src="${source}" style="display:block;width:100%;height:1250px;border:0" allow="fullscreen"></iframe>`;
  }
  else if(page==='articles')fortuneExplanation();
  else if(page==='register')register();
  else if(page==='login')login();
  else if(page==='browse')browse(id);
  else if(page==='create')create();
  else if(page==='hall')hall(id,tab);
  else if(page==='logout'){inviteAccessGranted=false;localStorage.removeItem('memorial-account');localStorage.removeItem('memorial-invite-theme');applyInviteTheme();location.hash='#home';return}
  else simple(({help:'帮助中心',agreement:'用户协议',privacy:'隐私政策'})[page]||'页面不存在');
  applyOfferingIcons();
  decoratePortalFrames();
  scrollTo(0,0);
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
    app.querySelector('.life-portrait').src='assets/zhang-wenhua-taoyuan.png';
    app.querySelector('.life-wish').textContent='祝张女士在桃原市生活愉快';
    app.querySelector('.life-timeline').innerHTML=taoyuanTimeline.map(([title,body])=>`<article><i></i><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('');
    const profileRows=app.querySelectorAll('.life-profile dl div');
    profileRows[3].querySelector('dt').textContent='安居';
    profileRows[4].querySelector('dt').textContent='登记地';
    profileRows[4].querySelector('dd').textContent='桃原市纪念馆';
  }
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
}
addEventListener('hashchange',route);route();
