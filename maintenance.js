(() => {
  // Start loading during desktop boot; never reveal the menu in a fallback font.
  let pixelFontReady;
  function preparePixelFont() {
    if (!pixelFontReady) pixelFontReady = document.fonts.load('24px MaintenancePixel', '私人资料').then(fonts => {
      if (!fonts.length) throw new Error('Maintenance font unavailable');
    }).catch(error => { pixelFontReady = null; throw error; });
    return pixelFontReady;
  }
  preparePixelFont().catch(() => {});
  // Available narrative files in the private archive.
  const files = [
    {name:'留言.txt',folder:'文字资料',key:'message',text:true,body:"如果你看到这里，我应该已经到桃原市了。\n在那里，我可以重新开始，把过去没能实现的事情一点点补回来。那些遗憾、错过的人，还有一直没能过上的生活，也许终于都可以重新来一次。\n所以不用替我难过。\n如果你愿意，帮我在安念堂建一个纪念馆吧。\n就当替过去的我留个位置。\n毕竟从这里以后，应该就是另一段人生了。"},
    {name:'离婚协议书.png',folder:'影像资料',key:'agreement',image:'assets/documents/private-divorce-agreement.png'},
    {name:'照片 1.png', folder:'影像资料', image:'assets/documents/private-photo-1.png'},
    {name:'城北区住宅火灾新闻.jpeg', folder:'新闻剪报', key:'news', image:'assets/documents/private-news-1.jpeg'},
    {name:'陈珍珍死亡事件_补充调查情况说明.pdf', folder:'调查资料', pdf:'assets/documents/chen-supplementary-investigation.pdf'},
    {name:'音频节点 1.mp3', folder:'音频资料', audio:'assets/sounds/private-audio-node-1.mp3?v=20261017-2'},
    {name:'维护说明.txt', folder:'系统文件', body:'本机维护程序 — 使用说明\n版本 0.1 / 本地会话\n\n[01] 加密文件\n列出受保护目录中的可用资料。选择文件夹后，请核对文件清单，再执行“显示到桌面”。原始资料保持只读。\n\n[02] 桌面显示\n显示操作仅对当前会话有效。返回桌面后可双击文件夹查看内容；重新载入系统后，相关项目恢复隐藏。新闻剪报使用独立目录。\n\n[03] 系统检查\n系统状态与运行诊断用于检查本机会话和资源载入情况。会话日志记录本次维护操作。\n\n[04] 操作按键\n方向键：选择项目    Enter：确认\nEsc：返回上一层    F10：保存设置并退出\n\n[05] 退出维护\n选择“保存设置并返回桌面”保留显示设置；选择“不保存并返回桌面”放弃本次设置变更。退出不关闭原有桌面窗口。'}
  ];
  const bundle={name:'私人资料',key:'private-folder',folder:'文件夹'};
  const bundleFiles=()=>files.filter(file=>file.folder!=='新闻剪报'&&(file.image||file.pdf||file.audio||file.text));
  function openPrivateFolder(){
    const id='private-folder';if(document.querySelector(`[data-app="${id}"]`)){openApp(id);return;}
    apps[id]={title:'私人资料',path:'桌面\\私人资料'};openApp(id);
    const win=document.querySelector(`[data-app="${id}"]`);win.classList.add('private-folder-window');
    explorerNodes[id]={title:'私人资料',path:'桌面\\私人资料',items:bundleFiles().map(file=>({name:file.name,type:file.text?'txt':file.pdf?'pdf':file.audio?'audio':'jpeg',detail:file.text?'文本文档':file.pdf?'PDF 文档':file.audio?'MPEG 音频':'PNG 图像'}))};
    setupFileExplorerWindow(win,id);win._explorerRender(id);
    const buttons=win.querySelectorAll('.explorer-item');
    buttons.forEach((button,index)=>{
      const clean=button.cloneNode(true);button.replaceWith(clean);
      const file=bundleFiles()[index],glyph=clean.querySelector('.explorer-item-icon');
      if(!file.text)glyph.style.backgroundImage=`url("${file.pdf?'assets/icons/file-pdf-32.svg':file.audio?'assets/icons/private-audio-transparent.png':'assets/icons/file-jpeg-32.svg'}")`;
      clean.onclick=()=>{win.querySelectorAll('.explorer-item').forEach(item=>item.classList.toggle('selected',item===clean));};
      clean.ondblclick=()=>window.openPrivateMaintenance(null,file);
      clean.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();window.openPrivateMaintenance(null,file);}};
    });
    win.querySelectorAll('[data-explorer-action]').forEach(button=>{button.disabled=true;});
    win.querySelector('.statusbar span').textContent=`${bundleFiles().length} 个对象`;
  }
  window.openPrivateDesktopFile=key=>{if(key===bundle.key){openPrivateFolder();return;}const file=files.find(file=>file.key===key||(!file.key&&['pdf','audio','image'].includes(key)&&file[key]));if(file)window.openPrivateMaintenance(null,file);};
  window.openPrivateMaintenance = function(onExit, desktopFile=null) {
    if(desktopFile?.text){openExplorerTextFile({name:desktopFile.name,content:desktopFile.body});return;}
    if(desktopFile?.image){openPhotoViewer({name:desktopFile.name,src:desktopFile.image,source:'私人资料'});return;}
    if(!desktopFile&&document.querySelector('#private-maintenance')) return;
    const appId=desktopFile?(desktopFile.key?'private-'+desktopFile.key:desktopFile.pdf?'private-pdf':desktopFile.image?'private-image':'private-audio'):null;
    if(appId&&document.querySelector(`[data-app="${appId}"]`)){openApp(appId);return;}
    const previous = document.activeElement;
    const root = document.createElement('section'); root.id=desktopFile?'desktop-'+appId:'private-maintenance'; root.className='maintenance booting';
    root.tabIndex=-1; root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true'); root.setAttribute('aria-label','郑愿私人维护终端');
    const desktop=document.querySelector('#desktop'), wasInert=desktop.inert;
    let hostWindow=null,closeObserver=null;
    if(desktopFile){
      apps[appId]={title:desktopFile.name+' - '+(desktopFile.pdf?'PDF 阅读器':desktopFile.image?'图片查看器':'音频播放器'),path:'桌面\\'+desktopFile.name};openApp(appId);
      hostWindow=document.querySelector(`[data-app="${appId}"]`);hostWindow.classList.add('private-file-window');
      hostWindow.style.width=Math.min(1000,innerWidth-40)+'px';hostWindow.style.height=Math.min(760,innerHeight-80)+'px';hostWindow.style.left='20px';hostWindow.style.top='20px';
      if(desktopFile.audio){hostWindow.style.width=Math.min(600,innerWidth-40)+'px';hostWindow.style.height=Math.min(390,innerHeight-80)+'px';hostWindow.classList.add('classic-audio-window');}
      hostWindow.querySelector('.window-content').replaceChildren(root);root.removeAttribute('aria-modal');
      closeObserver=new MutationObserver(()=>{if(!hostWindow.isConnected){disposePlayer();closeObserver.disconnect();}});closeObserver.observe(hostWindow.parentNode,{childList:true});
    }else{desktop.inert=true;document.body.appendChild(root);}root.focus();
    let closed=false, screen='boot', selected=0, timer, saved={scanlines:true}, disposePlayer=()=>{};
    try { const value=JSON.parse(localStorage.getItem('retroMaintenanceSettings')); if(typeof value?.scanlines==='boolean') saved=value; } catch {}
    let settings={...saved}; const logs=['Z-PATTERN / 已验证','桌面会话 / 已挂起','私人资料索引 / 已载入'];
    const escapeHtml = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function exit(save=false) {
      if(closed)return;
      if(save) {try {localStorage.setItem('retroMaintenanceSettings',JSON.stringify(settings));} catch {showText('设置未保存','浏览器存储不可用。\n请返回主菜单，选择不保存并返回桌面。');return;}}
      closed=true; disposePlayer();closeObserver?.disconnect(); clearTimeout(timer); root.remove();if(hostWindow)closeWindow(hostWindow);else desktop.inert=wasInert; onExit?.();
      if(previous?.isConnected) previous.focus();
    }
    function frame(title, content, help) {
      disposePlayer(); disposePlayer=()=>{};
      if(desktopFile){root.className='maintenance desktop-file-viewer';root.innerHTML=content;return;}
      root.className='maintenance'+(settings.scanlines?' scanlines':'');
      root.innerHTML=`<header>ZHENG YUAN PRIVATE MAINTENANCE <span>REV 0.1</span></header><div class="maintenance-frame"><div class="maintenance-heading">${escapeHtml(title)}<span>LOCAL SESSION / 本机会话</span></div><main>${content}</main><footer><span>↑ ↓ ← → 选择　 Enter 打开</span><span>Esc 返回　 F10 保存并退出</span></footer><div class="maintenance-help">${escapeHtml(help)}</div></div><div class="maintenance-bottom">USER: 郑愿　 /　 ACCESS: PRIVATE<span>网页内置维护环境</span></div>`;
    }
    let actions=[];
    function bindActions() {
      const buttons=[...root.querySelectorAll('[data-maint-action]')];
      buttons.forEach((button,index)=>{
        button.addEventListener('focus',()=>{selected=index;buttons.forEach((b,i)=>b.classList.toggle('active',i===index));});
        button.addEventListener('click',()=>actions[index]?.());
      });
      selected=0; buttons[0]?.focus();
    }
    const item=(label,index)=>`<button type="button" data-maint-action="${index}"><span>►</span> ${escapeHtml(label)}</button>`;
    function main() {
      screen='main';
      frame('内置维护程序 / MAIN MENU',`<div class="maintenance-columns"><nav>${item('加密文件 / ENCRYPTED FILES',0)}${item('系统状态 / SYSTEM STATUS',1)}${item('运行诊断 / DIAGNOSTICS',2)}${item('会话日志 / SESSION LOG',3)}</nav><nav>${item('显示设置 / DISPLAY SETUP',4)}${item('使用说明 / HELP',5)}${item('保存设置并返回桌面',6)}${item('不保存并返回桌面',7)}</nav></div>`, '选择一个项目。鼠标和键盘均可操作；退出后保留原桌面与窗口。');
      actions=[showFiles,showStatus,diagnose,()=>showText('会话日志',logs.join('\n')),showSettings,()=>showText('使用说明',files.find(file=>file.name==='维护说明.txt').body),()=>exit(true),()=>exit(false)];bindActions();
    }
    function showText(title,text,back=main) {
      screen='detail';frame(title,`<div class="maintenance-text"><pre>${escapeHtml(text)}</pre>${item('返回',0)}</div>`,'只读视图 / Esc 返回上一层');
      actions=[back];root._back=back;bindActions();
    }
    function showFiles() {
      if(desktopFile){exit();return;}
      const regular=[bundle,...files.filter(file=>file.body&&!file.text)];
      screen='files';frame('郑愿 / 私人资料',`<div class="maintenance-files"><div class="maintenance-path">Z:\\PRIVATE\\　 [READ ONLY]</div>${regular.map((file,i)=>item(`${file.name}　 [${file.folder}]`,i)).join('')}<hr>${item('新闻剪报 / NEWS CLIPPINGS',regular.length)}${item('返回主菜单',regular.length+1)}<p></p></div>`,'');
      root.querySelector('.maintenance-files p').textContent='隐藏文件可显示到桌面，返回桌面后双击打开。';
      root.querySelector('.maintenance-help').textContent='Enter 选择文件夹；刷新后桌面中的隐藏资料会重新隐藏。';
      actions=regular.map(file=>()=>file===bundle?showVisibility(file):showText(file.name,file.body,showFiles));actions.push(showNews,main);root._back=main;bindActions();
    }
    function showNews(){screen='files';frame('私人资料 / 新闻剪报',`<div class="maintenance-files"><div class="maintenance-path">Z:\\PRIVATE\\NEWS\\</div>${item('城北区住宅火灾新闻.jpeg',0)}${item('返回私人资料',1)}</div>`,'新闻剪报单独存放。');actions=[()=>showVisibility(files.find(file=>file.key==='news')),showFiles];root._back=showFiles;bindActions();}
    function showVisibility(file,message=''){
      const key=file.key||(file.pdf?'pdf':file.image?'image':'audio'),visible=window.isPrivateFileOnDesktop?.(key);
      screen='visibility';root._back=showFiles;
      frame('隐藏文件 / DESKTOP VISIBILITY',`<div class="maintenance-text"><pre>${escapeHtml(file.name)}\n\n桌面状态：${visible?'已显示在桌面':'隐藏'}\n\n${escapeHtml(message||'文件保留在私人资料中。显示后可从桌面双击打开。')}</pre>${visible?'':item('显示到桌面',0)}${item('返回私人资料',visible?0:1)}</div>`,'这里只改变桌面可见性，不移动或删除原文件。');
      const reveal=()=>{try{window.showPrivateFileOnDesktop(key,file.name);showVisibility(file,'已显示到桌面，退出维护界面后即可打开。');}catch{showVisibility(file,'无法保存显示状态，请检查浏览器存储设置后重试。');}};
      if(file===bundle){
        const pre=root.querySelector('.maintenance-text pre');
        pre.outerHTML=`<section class="maintenance-manifest"><div class="manifest-kicker">PROTECTED DIRECTORY / 受保护目录</div><h2>私人资料 <small>${bundleFiles().length} FILES</small></h2><div class="manifest-status">桌面状态 <strong>${visible?'已显示':'隐藏'}</strong></div><ol>${bundleFiles().map((entry,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span><b>${escapeHtml(entry.name)}</b><small>${entry.text?'TXT':entry.pdf?'PDF':entry.audio?'AUDIO':'IMAGE'}</small></li>`).join('')}</ol><p>${escapeHtml(message||(visible?'文件夹已显示在桌面。退出维护程序后即可访问。':'是否将以上文件以文件夹形式显示到桌面？'))}</p></section>`;
      }
      actions=visible?[showFiles]:[reveal,showFiles];bindActions();
    }
    function showPdf(file) {
      screen='pdf';
      frame('私人资料 / DOCUMENT READER',`<section class="maintenance-pdf case-pdf-window" aria-label="PDF 阅读器"><div class="maintenance-pdf-title">${escapeHtml(file.name)} — PDF 阅读器 <button type="button" data-close aria-label="关闭阅读器">×</button></div><div class="toolbar"><button type="button" data-prev>上一页</button><span class="case-pdf-page-count"></span><button type="button" data-next>下一页</button><button type="button" data-out aria-label="缩小">－</button><output>100%</output><button type="button" data-in aria-label="放大">＋</button><button type="button" data-fit>适合宽度</button></div><div class="case-pdf-viewport" tabindex="0" aria-label="文档页面"><img class="case-pdf-page" alt=""></div><div class="maintenance-pdf-status" role="status">只读文档</div></section>`,'Esc 关闭阅读器并返回私人资料；可翻页、缩放与滚动阅读。');
      root._back=showFiles;
      const viewer=root.querySelector('.maintenance-pdf'),page=viewer.querySelector('img'),viewport=viewer.querySelector('.case-pdf-viewport'),status=viewer.querySelector('[role=status]');
      let number=1,zoom=1;
      const updateZoom=()=>{page.style.width=Math.round(760*zoom)+'px';viewer.querySelector('output').textContent=Math.round(zoom*100)+'%';};
      const updatePage=()=>{page.src=`assets/documents/chen-supplementary-page-${number}.jpg`;page.alt=`${file.name} 第 ${number} 页，共 3 页`;viewer.querySelector('.case-pdf-page-count').textContent=`第 ${number} 页 / 共 3 页`;viewer.querySelector('[data-prev]').disabled=number===1;viewer.querySelector('[data-next]').disabled=number===3;viewport.scrollTop=0;status.textContent='正在载入页面…';};
      page.onload=()=>{status.textContent='只读　'+file.name;};page.onerror=()=>{status.textContent='页面载入失败，请关闭后重试。';};
      viewer.querySelector('[data-close]').onclick=showFiles;
      viewer.querySelector('[data-prev]').onclick=()=>{if(number>1){number--;updatePage();}};
      viewer.querySelector('[data-next]').onclick=()=>{if(number<3){number++;updatePage();}};
      viewer.querySelector('[data-out]').onclick=()=>{zoom=Math.max(.4,zoom-.2);updateZoom();};
      viewer.querySelector('[data-in]').onclick=()=>{zoom=Math.min(3,zoom+.2);updateZoom();};
      viewer.querySelector('[data-fit]').onclick=()=>{zoom=Math.max(.2,(viewport.clientWidth-36)/760);updateZoom();viewport.scrollLeft=0;};
      updatePage();updateZoom();viewer.querySelector('[data-close]').focus();
    }
    function showImage(file){
      screen='pdf';root._back=showFiles;
      frame('图片查看器',`<section class="maintenance-pdf"><div class="toolbar"><button type="button" data-fit>适合窗口</button><button type="button" data-original>原始大小</button><button type="button" data-close>关闭图片</button></div><div class="private-image-viewport" tabindex="0"><img src="${escapeHtml(file.image)}" alt="${escapeHtml(file.name)}"></div><div class="maintenance-pdf-status" role="status">正在载入图片…</div></section>`,'');
      const img=root.querySelector('img'),status=root.querySelector('[role=status]');
      img.onload=()=>{status.textContent=`${file.name}　 ${img.naturalWidth} × ${img.naturalHeight}　只读`;};img.onerror=()=>{status.textContent='图片载入失败，请关闭后重试。';};
      root.querySelector('[data-fit]').onclick=()=>img.classList.remove('original');root.querySelector('[data-original]').onclick=()=>img.classList.add('original');root.querySelector('[data-close]').onclick=showFiles;root.querySelector('[data-fit]').focus();
    }
    function showAudio(file) {
      screen='audio';
      frame('私人资料 / AUDIO ARCHIVE',`<div class="maintenance-text"><div class="maintenance-path">Z:\\PRIVATE\\AUDIO\\　 [READ ONLY]</div><section class="private-player" aria-label="复古音频播放器"><div class="private-player-title">ZY AUDIO PLAYER <span>LOCAL FILE / 01</span></div><div class="private-player-lcd"><div class="private-player-track">01. ${escapeHtml(file.name)}</div><div class="private-player-clock">00:00 <small>/ --:--</small></div><div class="private-player-status" role="status">正在读取音频…</div></div><label class="private-player-seek">播放进度<input aria-label="播放进度" type="range" min="0" max="100" step="0.1" value="0" disabled></label><div class="private-player-controls"><button type="button" data-play disabled>▶ 播放</button><button type="button" data-stop disabled>■ 停止</button><button type="button" data-mute aria-pressed="false">♪ 静音</button></div><label class="private-player-volume">VOLUME <input aria-label="音量" type="range" min="0" max="100" value="80"><output>80%</output></label><div class="private-player-bottom">MPEG AUDIO　 /　 PRIVATE RECORDING</div></section><div class="private-player-return">${item('返回私人资料',0)}</div></div>`,'空格播放 / 暂停；方向键调节已选滑块；Esc 返回并停止播放。');
      actions=[showFiles];root._back=showFiles;bindActions();
      const player=root.querySelector('.private-player'), audio=new Audio(file.audio);
      player.querySelector('.private-player-title').textContent='媒体播放器';
      player.querySelector('.private-player-bottom').textContent='音频文件　 ·　 MPEG Audio';
      audio.preload='metadata';audio.volume=.8;
      const play=player.querySelector('[data-play]'),stop=player.querySelector('[data-stop]'),mute=player.querySelector('[data-mute]'),seek=player.querySelector('.private-player-seek input'),volume=player.querySelector('.private-player-volume input'),status=player.querySelector('[role=status]');
      let disposed=false;
      const time=value=>Number.isFinite(value)?`${Math.floor(value/60).toString().padStart(2,'0')}:${Math.floor(value%60).toString().padStart(2,'0')}`:'--:--';
      const update=()=>{player.querySelector('.private-player-clock').innerHTML=`${time(audio.currentTime)} <small>/ ${time(audio.duration)}</small>`;if(Number.isFinite(audio.duration)&&audio.duration>0){seek.disabled=false;seek.max=audio.duration;seek.value=audio.currentTime;}play.textContent=audio.paused?'▶ 播放':'Ⅱ 暂停';};
      const toggle=async()=>{if(!audio.paused){audio.pause();return;}try{await audio.play();}catch{if(!disposed)status.textContent='播放未能开始，请重试。';}};
      audio.addEventListener('loadedmetadata',()=>{play.disabled=false;stop.disabled=false;status.textContent='READY / 就绪';update();});
      audio.addEventListener('timeupdate',update);
      audio.addEventListener('play',()=>{status.textContent='PLAYING / 播放中';update();});
      audio.addEventListener('pause',()=>{status.textContent='PAUSED / 已暂停';update();});
      audio.addEventListener('ended',()=>{status.textContent='END / 播放完毕';update();});
      audio.addEventListener('error',()=>{if(disposed)return;status.textContent='音频读取失败，请返回后重试。';play.disabled=stop.disabled=seek.disabled=true;});
      play.onclick=toggle;stop.onclick=()=>{audio.pause();audio.currentTime=0;update();status.textContent='STOPPED / 已停止';};
      seek.oninput=()=>{audio.currentTime=Number(seek.value);update();};
      volume.oninput=()=>{audio.volume=Number(volume.value)/100;player.querySelector('output').textContent=volume.value+'%';};
      mute.onclick=()=>{audio.muted=!audio.muted;mute.setAttribute('aria-pressed',String(audio.muted));mute.textContent=audio.muted?'♪ 取消静音':'♪ 静音';};
      disposePlayer=()=>{disposed=true;audio.pause();audio.removeAttribute('src');audio.load();};
      play.focus();
    }
    function showStatus() {
      showText('系统状态 / SYSTEM STATUS',`会话用户        郑愿\n维护入口        Z-PATTERN\n页面尺寸        ${innerWidth} × ${innerHeight}\n桌面图标        ${desktop.querySelectorAll('.desktop-icon').length}\n打开的窗口      ${desktop.querySelectorAll('.retro-window').length}\n浏览器联网提示  ${navigator.onLine?'在线（不代表目标网站可访问）':'离线'}\n资料索引        ${files.length} 个文件\n\n以上为当前网页状态，不是物理电脑硬件信息。`);
    }
    function diagnose() {
      let storage='不可用';const key='retroMaintenanceProbe';
      try { localStorage.setItem(key,'ok');storage=localStorage.getItem(key)==='ok'?'正常':'读写不一致';localStorage.removeItem(key); } catch {}
      const results=[`桌面容器        ${desktop.isConnected?'PASS':'FAIL'}`,`资料索引        ${files.every(file=>file.name&&(file.body||file.audio||file.pdf||file.image))?'PASS':'FAIL'}`,`本地存储        ${storage}`,`图标布局        ${desktop.querySelectorAll('.desktop-icon').length} 个对象`];
      logs.push('诊断 / '+new Date().toLocaleTimeString('zh-CN')+' / 本地存储：'+storage);
      showText('诊断结果 / DIAGNOSTICS',results.join('\n')+'\n\n诊断完成。未修改桌面文件。');
    }
    function showSettings() {
      screen='settings'; frame('显示设置 / DISPLAY SETUP',`<div class="maintenance-text">${item('扫描线效果　['+(settings.scanlines?'开启':'关闭')+']',0)}${item('恢复默认显示设置',1)}${item('返回主菜单',2)}<p>设置仅影响本维护界面。F10 保存并返回桌面。</p></div>`,'Enter 切换选项；不保存退出时放弃本次设置更改。');
      actions=[()=>{settings.scanlines=!settings.scanlines;showSettings();},()=>{settings.scanlines=true;showSettings();},main];root._back=main;bindActions();
    }
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(screen==='main'||screen==='boot')exit(false);else(root._back||main)();return;}
      if(event.key==='F10'){event.preventDefault();event.stopPropagation();exit(true);return;}
      if(screen==='audio'||screen==='pdf'){
        if(event.key==='Tab'){const controls=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')];event.preventDefault();const index=controls.indexOf(document.activeElement);controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length]?.focus();}
        if(event.key===' '&&event.target.tagName!=='BUTTON'&&event.target.tagName!=='INPUT'){event.preventDefault();root.querySelector('[data-play]')?.click();}
        event.stopPropagation();return;
      }
      const buttons=[...root.querySelectorAll('[data-maint-action]')];
      if(event.key==='Tab'){event.preventDefault();buttons[(selected+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();return;}
      if(event.key.startsWith('Arrow')){event.preventDefault();event.stopPropagation();let step=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:event.key==='ArrowLeft'?-4:4;if(screen!=='main')step=step<0?-1:1;buttons[(selected+step+buttons.length)%buttons.length]?.focus();}
    });
    if(desktopFile){if(desktopFile.pdf)showPdf(desktopFile);else if(desktopFile.image)showImage(desktopFile);else showAudio(desktopFile);}else {
      root.style.background='#000080';
      root.innerHTML='<div style="font:20px/1.6 monospace">LOADING DISPLAY RESOURCES...</div>';
      preparePixelFont().then(() => {
        if (closed || !root.isConnected) return;
        root.style.background=''; main();
      }).catch(() => {
        if (closed || !root.isConnected) return;
        root.innerHTML='<div style="font:20px/1.6 monospace">DISPLAY RESOURCE LOAD FAILED.<br>Press Esc to return and retry.</div>';
      });
    }
  };
})();

