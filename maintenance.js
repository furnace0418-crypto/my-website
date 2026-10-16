(() => {
  // Fictional narrative files: replace these placeholders when story content is ready.
  const files = [
    {name:'个人记录.txt', folder:'私人文档', body:'[内容待补充]\n\n这里预留郑愿自己的记录。\n正式剧情尚未写入。'},
    {name:'未发送的信.txt', folder:'私人文档', body:'[内容待补充]\n\n这里预留一封未发送的信。\n收件人和正文待确定。'},
    {name:'照片索引.txt', folder:'影像资料', body:'[内容待补充]\n\n尚未导入照片。\n这里将列出郑愿保存的私人影像。'},
    {name:'维护说明.txt', folder:'系统文件', body:'ZHENG YUAN / PRIVATE MAINTENANCE\n\n入口：桌面图标排列为 Z。\n返回：主菜单按 Esc，或选择返回桌面。\n\n此界面为网页内的隐藏维护终端。\n诊断只读取当前网页状态，不访问真实硬件。\n文件区域目前使用剧情占位内容。'}
  ];
  window.openPrivateMaintenance = function(onExit) {
    if(document.querySelector('#private-maintenance')) return;
    const previous = document.activeElement;
    const root = document.createElement('section'); root.id='private-maintenance'; root.className='maintenance booting';
    root.tabIndex=-1; root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true'); root.setAttribute('aria-label','郑愿私人维护终端');
    const desktop=document.querySelector('#desktop'), wasInert=desktop.inert; desktop.inert=true;
    document.body.appendChild(root); root.focus();
    let closed=false, screen='boot', selected=0, timer, saved={scanlines:true};
    try { const value=JSON.parse(localStorage.getItem('retroMaintenanceSettings')); if(typeof value?.scanlines==='boolean') saved=value; } catch {}
    let settings={...saved}; const logs=['Z-PATTERN / 已验证','桌面会话 / 已挂起','私人资料索引 / 已载入'];
    const escapeHtml = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function exit(save=false) {
      if(closed)return;
      if(save) {try {localStorage.setItem('retroMaintenanceSettings',JSON.stringify(settings));} catch {showText('设置未保存','浏览器存储不可用。\n请返回主菜单，选择不保存并返回桌面。');return;}}
      closed=true; clearTimeout(timer); root.remove(); desktop.inert=wasInert; onExit?.();
      if(previous?.isConnected) previous.focus();
    }
    function frame(title, content, help) {
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
      frame('内置维护程序 / MAIN MENU',`<div class="maintenance-columns"><nav>${item('私人资料 / PRIVATE FILES',0)}${item('系统状态 / SYSTEM STATUS',1)}${item('运行诊断 / DIAGNOSTICS',2)}${item('会话日志 / SESSION LOG',3)}</nav><nav>${item('显示设置 / DISPLAY SETUP',4)}${item('使用说明 / HELP',5)}${item('保存设置并返回桌面',6)}${item('不保存并返回桌面',7)}</nav></div>`, '选择一个项目。鼠标和键盘均可操作；退出后保留原桌面与窗口。');
      actions=[showFiles,showStatus,diagnose,()=>showText('会话日志',logs.join('\n')),showSettings,()=>showText('使用说明',files[3].body),()=>exit(true),()=>exit(false)];bindActions();
    }
    function showText(title,text,back=main) {
      screen='detail';frame(title,`<div class="maintenance-text"><pre>${escapeHtml(text)}</pre>${item('返回',0)}</div>`,'只读视图 / Esc 返回上一层');
      actions=[back];root._back=back;bindActions();
    }
    function showFiles() {
      screen='files';frame('郑愿 / 私人资料',`<div class="maintenance-files"><div class="maintenance-path">Z:\\PRIVATE\\　 [READ ONLY]</div>${files.map((file,i)=>item(`${file.name}　 [${file.folder}]`,i)).join('')}${item('返回主菜单',files.length)}<p>资料入口已建立 · 剧情内容待补充</p></div>`,'Enter 阅读文件；此隐藏入口不等同于真实加密存储，请勿放入真实敏感资料。');
      actions=files.map(file=>()=>showText(file.name,file.body,showFiles));actions.push(main);root._back=main;bindActions();
    }
    function showStatus() {
      showText('系统状态 / SYSTEM STATUS',`会话用户        郑愿\n维护入口        Z-PATTERN\n页面尺寸        ${innerWidth} × ${innerHeight}\n桌面图标        ${desktop.querySelectorAll('.desktop-icon').length}\n打开的窗口      ${desktop.querySelectorAll('.retro-window').length}\n浏览器联网提示  ${navigator.onLine?'在线（不代表目标网站可访问）':'离线'}\n资料索引        ${files.length} 个文件\n\n以上为当前网页状态，不是物理电脑硬件信息。`);
    }
    function diagnose() {
      let storage='不可用';const key='retroMaintenanceProbe';
      try { localStorage.setItem(key,'ok');storage=localStorage.getItem(key)==='ok'?'正常':'读写不一致';localStorage.removeItem(key); } catch {}
      const results=[`桌面容器        ${desktop.isConnected?'PASS':'FAIL'}`,`资料索引        ${files.length===4?'PASS':'FAIL'}`,`本地存储        ${storage}`,`图标布局        ${desktop.querySelectorAll('.desktop-icon').length} 个对象`];
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
      const buttons=[...root.querySelectorAll('[data-maint-action]')];
      if(event.key==='Tab'){event.preventDefault();buttons[(selected+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();return;}
      if(event.key.startsWith('Arrow')){event.preventDefault();event.stopPropagation();let step=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:event.key==='ArrowLeft'?-4:4;if(screen!=='main')step=step<0?-1:1;buttons[(selected+step+buttons.length)%buttons.length]?.focus();}
    });
    main();
  };
})();
