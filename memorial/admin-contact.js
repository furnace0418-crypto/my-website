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
        deliver([kind==='missing'?'您要补全哪位居民的信息？请输入姓名。':'您要更正哪位居民的信息？请输入姓名。'],()=>showResidentNameForm(kind));
      };
      actions.querySelector('.admin-topic-buttons').appendChild(button);
    }
  };
  const showResidentNameForm=kind=>{
    actions.innerHTML='<form class="admin-code-form admin-name-form"><label for="adminResidentName">居民姓名</label><div><input id="adminResidentName" name="residentName" maxlength="30" autocomplete="off" placeholder="请输入居民姓名" required><button type="submit">下一步</button></div></form>';
    const form=actions.querySelector('form');
    form.onsubmit=event=>{
      event.preventDefault();
      const residentName=form.elements.residentName.value.trim();
      if(!residentName)return;
      appendMessage('visitor',residentName);
      deliver([`在继续登记前，请问您与${residentName}是什么关系？`],()=>showRelationshipChoices(kind,residentName));
    };
    form.elements.residentName.focus();
  };
  const showRelationshipChoices=(kind,residentName)=>{
    actions.innerHTML='<p class="admin-action-prompt"></p><div class="admin-topic-buttons"></div>';
    actions.querySelector('.admin-action-prompt').textContent=`请选择您与${residentName}的关系`;
    for(const label of ['家属','朋友','同学','其他']){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{
        appendMessage('visitor',label);
        if(label==='家属'){
          deliver([kind==='missing'?'请填写待登记居民的基本资料与亲属信息。':'请填写需要勘误的居民资料。','父亲或母亲信息至少填写一位；不确定的其他内容可以暂时留空。'],()=>showRegistrationForm(kind,residentName));
        }else{
          deliver(['抱歉，居民登记目前仅供家属办理。请重新选择需要咨询的服务。'],showTopics);
        }
      };
      actions.querySelector('.admin-topic-buttons').appendChild(button);
    }
  };
  const showRegistrationForm=(kind,residentName)=>{
    host.classList.add('has-form');
    actions.innerHTML=`<form class="admin-registration-form"><h3>${kind==='missing'?'居民信息补全':'居民信息勘误'}</h3><div class="admin-registration-fields"><label>姓名<input name="residentName" autocomplete="off" required></label><label>性别<select name="gender" required><option value="">请选择</option><option value="女">女</option><option value="男">男</option><option value="其他">其他</option></select></label><label>居民编号<input name="residentCode" autocomplete="off" required></label><div class="admin-form-section">亲属关系 <small>父亲或母亲至少填写一位</small></div><label>父亲<input name="father" autocomplete="off"></label><label class="admin-checkbox-label" data-parent-resident="father" hidden>父亲是否为桃原市居民<input type="checkbox" name="fatherIsTaoyuanResident" value="是"></label><label>母亲<input name="mother" autocomplete="off"></label><label class="admin-checkbox-label" data-parent-resident="mother" hidden>母亲是否为桃原市居民<input type="checkbox" name="motherIsTaoyuanResident" value="是"></label><label>与父亲／母亲关系<select name="parentRelation" required><option value="">请选择</option><option value="女儿">女儿</option><option value="儿子">儿子</option><option value="其他">其他</option></select></label><label>迁入时间<input name="moveInDate" type="date" required></label>${kind==='missing'?'':'<label class="wide">更正内容与依据<textarea name="notes" rows="3" required></textarea></label>'}</div><button type="button">保存登记</button></form>`;
    requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight});
    const form=actions.querySelector('form');
    form.elements.residentName.value=residentName;
    const father=form.elements.father;
    const mother=form.elements.mother;
    const syncParentResident=(input,parent)=>{
      const row=form.querySelector(`[data-parent-resident="${parent}"]`);
      row.hidden=!input.value.trim();
      if(row.hidden)row.querySelector('input').checked=false;
    };
    father.addEventListener('input',()=>syncParentResident(father,'father'));
    mother.addEventListener('input',()=>syncParentResident(mother,'mother'));
    form.onsubmit=event=>event.preventDefault();
  };
  deliver(['您好，您想咨询什么问题？'],showTopics);
}
