function renderAdminContact(host){
  const avatar='<span class="admin-avatar" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="14" r="7"/><path d="M7 35c.6-8 5.3-13 13-13s12.4 5 13 13"/></svg></span>';
  const topics=[
    ['居民登记','registration'],
    ['纪念馆资料','如需补充或更正资料，请说明纪念馆名称、需要调整的内容及可供核对的依据。'],
    ['平台使用','如遇页面或功能问题，请记录操作步骤和出现问题的页面，方便管理员排查。'],
    ['其他问题','如是其他事项，请整理问题的简要经过与相关资料，再联系管理员说明。']
  ];
  host.innerHTML=`<div class="admin-chat-header">${avatar}<div><strong>管理员服务</strong><small>在线咨询</small></div><span class="admin-chat-indicator" aria-hidden="true"></span></div><div class="admin-chat-log" role="log" aria-live="polite"></div><div class="admin-chat-actions"></div>`;
  const log=host.querySelector('.admin-chat-log');
  const appendMessage=(who,message)=>{
    const row=document.createElement('div');row.className=`admin-chat-row from-${who}`;
    if(who==='admin')row.innerHTML=avatar;
    const item=document.createElement('div');item.className='admin-message';
    const body=document.createElement('p');body.textContent=message;item.appendChild(body);row.appendChild(item);log.appendChild(row);
    log.scrollTop=log.scrollHeight;
  };
  const actions=host.querySelector('.admin-chat-actions');
  const showTopics=()=>{
    actions.innerHTML='<p class="admin-action-prompt">请选择咨询事项</p><div class="admin-topic-buttons"></div>';
    const choices=actions.querySelector('.admin-topic-buttons');
    for(const [label,answer] of topics){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{
        appendMessage('visitor',label);
        if(answer==='registration'){
          appendMessage('admin','当前业务繁忙。办理居民登记，请先输入对应的管理员编号。');
          showCodeForm();
        }else{
          appendMessage('admin',answer);
          showTopics();
        }
      };
      choices.appendChild(button);
    }
  };
  const showCodeForm=()=>{
    actions.innerHTML='<form class="admin-code-form"><label for="adminContactCode">管理员编号</label><div><input id="adminContactCode" name="code" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="输入八位编号" required><button type="submit">确认编号</button></div></form>';
    const form=actions.querySelector('form');
    form.onsubmit=event=>{
      event.preventDefault();
      const value=form.elements.code.value.trim();
      appendMessage('visitor',value);
      if(value!=='48270619'){
        appendMessage('admin','编号暂未匹配，请核对后重新输入。');
        form.elements.code.select();
        return;
      }
      appendMessage('admin','居民登记用于补全或更正纪念馆中的居民资料。请按照已掌握的记录填写；暂时无法确认的内容可注明待核实。');
      appendMessage('admin','这次居民登记，您需要办理什么？');
      showRegistrationChoices();
    };
    form.elements.code.focus();
  };
  const showRegistrationChoices=()=>{
    actions.innerHTML='<p class="admin-action-prompt">请选择登记事项</p><div class="admin-topic-buttons"></div>';
    for(const [label,kind] of [['信息缺失','missing'],['信息勘误','correction']]){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{
        appendMessage('visitor',label);
        appendMessage('admin',kind==='missing'?'请填写缺失的居民信息。场域与居民编号如尚未确定，可在备注中说明；提交后还需核对资料。':'请填写现有记录与需要更正的内容，并在备注中说明依据；提交后还需核对资料。');
        showRegistrationForm(kind);
      };
      actions.querySelector('.admin-topic-buttons').appendChild(button);
    }
  };
  const showRegistrationForm=kind=>{
    host.classList.add('has-form');
    actions.innerHTML=`<form class="admin-registration-form"><h3>${kind==='missing'?'居民信息补全':'居民信息勘误'}</h3><div class="admin-registration-fields"><label>管理员编号<input name="administrator" value="48270619" readonly></label><label>场域编号<input name="areaCode" placeholder="如尚未确认，可填写待核实"></label><label>所在区域<select name="region"><option value="未确认">未确认</option><option value="A 级场域">A 级场域</option><option value="B 级场域">B 级场域</option><option value="C 级场域">C 级场域</option></select></label><label>待登记居民编号<input name="residentCode" placeholder="如尚未分配，可填写待核实"></label><label>居民姓名<input name="residentName" placeholder="如已知，请填写"></label><label>当前状态<select name="status"><option value="待核实">待核实</option><option value="稳定">稳定</option><option value="其他">其他</option></select></label><label>是否仍回应原姓名<select name="respondsToName"><option value="无法确认">无法确认</option><option value="是">是</option><option value="否">否</option></select></label><label class="wide">${kind==='missing'?'备注':'更正内容与依据'}<textarea name="notes" rows="4" placeholder="请说明已掌握的信息" required></textarea></label></div><p class="admin-form-hint">不确定的信息请注明待核实，资料仍需管理员核对。</p><button type="submit">保存登记草稿</button></form>`;
    requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight});
    const form=actions.querySelector('form');
    form.onsubmit=event=>{
      event.preventDefault();
      const entry={kind,createdAt:new Date().toISOString(),...Object.fromEntries(new FormData(form))};
      try{const saved=JSON.parse(localStorage.getItem('memorial-registration-drafts')||'[]');localStorage.setItem('memorial-registration-drafts',JSON.stringify([entry,...saved].slice(0,10)))}catch(_){}
      appendMessage('visitor',kind==='missing'?'提交信息缺失表':'提交信息勘误表');
      appendMessage('admin','登记资料已保存为本机草稿，后续仍需管理员核对。');
      host.classList.remove('has-form');
      showTopics();
    };
  };
  appendMessage('admin','您好，您想咨询什么问题？');
  showTopics();
}
