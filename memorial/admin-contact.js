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
  const deliver=async(messages,next)=>{
    actions.replaceChildren();
    for(const message of messages){
      const typing=document.createElement('div');
      typing.className='admin-chat-row from-admin admin-typing';
      typing.innerHTML=`${avatar}<div class="admin-message" aria-label="管理员正在输入"><i></i><i></i><i></i></div>`;
      log.appendChild(typing);
      log.scrollTop=log.scrollHeight;
      await new Promise(resolve=>setTimeout(resolve,650));
      if(!host.isConnected)return;
      typing.remove();
      appendMessage('admin',message);
      await new Promise(resolve=>setTimeout(resolve,180));
    }
    if(host.isConnected)next?.();
  };
  const showTopics=()=>{
    actions.innerHTML='<p class="admin-action-prompt">请选择咨询事项</p><div class="admin-topic-buttons"></div>';
    const choices=actions.querySelector('.admin-topic-buttons');
    for(const [label,answer] of topics){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{
        appendMessage('visitor',label);
        if(answer==='registration'){
          deliver(['当前业务繁忙。','办理居民登记，请先输入对应的管理员编号。'],showCodeForm);
        }else{
          deliver(['当前业务繁忙。',answer],showTopics);
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
        deliver(['编号暂未匹配，请核对后重新输入。'],showCodeForm);
        return;
      }
      deliver(['居民登记用于补全或更正纪念馆中的居民资料。请按照已掌握的记录填写；暂时无法确认的内容可注明待核实。','这次居民登记，您需要办理什么？'],showRegistrationChoices);
    };
    form.elements.code.focus();
  };
  const showRegistrationChoices=()=>{
    actions.innerHTML='<p class="admin-action-prompt">请选择登记事项</p><div class="admin-topic-buttons"></div>';
    for(const [label,kind] of [['信息缺失','missing'],['信息勘误','correction']]){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{
        appendMessage('visitor',label);
        deliver([kind==='missing'?'请填写待登记居民的基本资料与亲属信息。':'请填写需要勘误的居民资料。','父亲或母亲信息至少填写一位；不确定的其他内容可以暂时留空。'],()=>showRegistrationForm(kind));
      };
      actions.querySelector('.admin-topic-buttons').appendChild(button);
    }
  };
  const showRegistrationForm=kind=>{
    host.classList.add('has-form');
    actions.innerHTML=`<form class="admin-registration-form"><h3>${kind==='missing'?'居民信息补全':'居民信息勘误'}</h3><div class="admin-registration-fields"><label>姓名<input name="residentName" autocomplete="off" required></label><label>性别<select name="gender" required><option value="">请选择</option><option value="女">女</option><option value="男">男</option><option value="其他">其他</option></select></label><label>居民编号<input name="residentCode" autocomplete="off" required></label><div class="admin-form-section">亲属关系 <small>父亲或母亲至少填写一位</small></div><label>父亲<input name="father" autocomplete="off"></label><label>母亲<input name="mother" autocomplete="off"></label><label>与父亲／母亲关系<select name="parentRelation" required><option value="">请选择</option><option value="女儿">女儿</option><option value="儿子">儿子</option><option value="其他">其他</option></select></label><label class="admin-checkbox-label">母亲是否为桃原市居民<input type="checkbox" name="motherIsTaoyuanResident" value="是"></label><label>迁入时间<input name="moveInDate" type="date" required></label><label class="wide">${kind==='missing'?'备注（选填）':'更正内容与依据'}<textarea name="notes" rows="3" placeholder="如有需要补充的信息，请填写" ${kind==='missing'?'':'required'}></textarea></label></div><p class="admin-form-hint">父亲或母亲至少填写一位；提交的信息会先保存为本机草稿。</p><button type="submit">保存登记草稿</button></form>`;
    requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight});
    const form=actions.querySelector('form');
    const father=form.elements.father;
    const mother=form.elements.mother;
    const validateParent=()=>{
      const missing=!father.value.trim()&&!mother.value.trim();
      father.setCustomValidity(missing?'父亲或母亲至少填写一位':'');
      return !missing;
    };
    father.addEventListener('input',validateParent);
    mother.addEventListener('input',validateParent);
    form.onsubmit=event=>{
      event.preventDefault();
      if(!validateParent()){father.reportValidity();return}
      const entry={kind,administrator:'48270619',createdAt:new Date().toISOString(),motherIsTaoyuanResident:'否',...Object.fromEntries(new FormData(form))};
      try{const saved=JSON.parse(localStorage.getItem('memorial-registration-drafts')||'[]');localStorage.setItem('memorial-registration-drafts',JSON.stringify([entry,...saved].slice(0,10)))}catch(_){}
      appendMessage('visitor',kind==='missing'?'提交信息缺失表':'提交信息勘误表');
      host.classList.remove('has-form');
      deliver(['登记资料已保存为本机草稿，后续仍需管理员核对。'],showTopics);
    };
  };
  deliver(['您好，您想咨询什么问题？'],showTopics);
}
