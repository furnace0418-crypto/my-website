let adminChatSession=null;
let adminCompletionMessage=null;
let adminNoticeAudio=null;
function armAdminNoticeAudio(){
  try{
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return;
    adminNoticeAudio ||= new AudioContextClass();
    adminNoticeAudio.resume().catch(()=>{});
  }catch(_){}
}
function playAdminNoticeAudio(){
  if(!adminNoticeAudio)return;
  adminNoticeAudio.resume().then(()=>{
    const start=adminNoticeAudio.currentTime;
    for(const [frequency,offset] of [[660,0],[880,.16]]){
      const tone=adminNoticeAudio.createOscillator(),volume=adminNoticeAudio.createGain();
      tone.type='sine';tone.frequency.value=frequency;
      volume.gain.setValueAtTime(.001,start+offset);
      volume.gain.linearRampToValueAtTime(.08,start+offset+.025);
      volume.gain.exponentialRampToValueAtTime(.001,start+offset+.38);
      tone.connect(volume).connect(adminNoticeAudio.destination);
      tone.start(start+offset);tone.stop(start+offset+.4);
    }
  }).catch(()=>{});
}
localStorage.removeItem('memorial-chen-registration-unlocked');
localStorage.removeItem('memorial-chen-registration-complete');
localStorage.removeItem('memorial-chen-registration-ready-at');
const registrationOwner=()=>{try{const user=JSON.parse(localStorage.getItem('memorial-account')||'null');return user&&!user.guest&&user.accountId!=='guest-invite'?(user.accountId||user.phone||null):null;}catch(_){return null;}};
const registrationKey=id=>`memorial-resident-registration-v1-${id}`;
const registrationRecord=id=>{try{return id?JSON.parse(localStorage.getItem(registrationKey(id))||'{}'):{};}catch(_){return {};}};
window.memorialRegistrationState={get chen(){const value=registrationRecord(registrationOwner());return value.chen===true||(Number.isFinite(value.readyAt)&&Date.now()>=value.readyAt);}};
let registrationSessionOwner;
window.syncMemorialRegistration=function(){
  const id=registrationOwner();if(id===registrationSessionOwner)return;
  registrationSessionOwner=id;clearTimeout(chenRegistrationTimer);adminChatSession=null;adminCompletionMessage=null;
  document.querySelector('.chen-registration-complete-dialog')?.remove();
  const value=registrationRecord(id);
  if(id&&value.readyAt&&!value.chen){if(Date.now()>=value.readyAt)localStorage.setItem(registrationKey(id),JSON.stringify({chen:true}));else chenRegistrationTimer=setTimeout(()=>finishChenRegistration(id),value.readyAt-Date.now());}
};
let chenRegistrationTimer;
function finishChenRegistration(id=registrationOwner()){
  if(!id)return;
  localStorage.setItem(registrationKey(id),JSON.stringify({chen:true}));
  if(registrationOwner()!==id)return;
  adminCompletionMessage?.('登记核验已完成。陈珍珍的纪念馆现已开放查询。');
  playAdminNoticeAudio();
  document.querySelector('.chen-registration-complete-dialog')?.remove();
  const overlay=document.createElement('div');
  overlay.className='chen-registration-complete-dialog';
  overlay.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="chen-registration-complete-title"><div class="chen-registration-dialog-head"><span class="admin-avatar" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="14" r="7"/><path d="M7 35c.6-8 5.3-13 13-13s12.4 5 13 13"/></svg></span><span>管理员服务</span><button type="button" class="chen-registration-dialog-close" aria-label="关闭通知">×</button></div><div class="chen-registration-dialog-body"><span class="chen-registration-dialog-icon" aria-hidden="true">✓</span><h2 id="chen-registration-complete-title">居民登记已完成</h2><p>陈珍珍的纪念馆现已开放查询。</p><button type="button" class="chen-registration-dialog-ok">知道了</button></div></section>';
  overlay.querySelectorAll('button').forEach(button=>button.onclick=()=>overlay.remove());
  document.body.append(overlay);
  overlay.querySelector('.chen-registration-dialog-ok').focus();
}
function scheduleChenRegistrationCompletion(readyAt=Date.now()+10000){
  const id=registrationOwner();if(!id)return;
  localStorage.setItem(registrationKey(id),JSON.stringify({chen:false,readyAt}));
  clearTimeout(chenRegistrationTimer);
  chenRegistrationTimer=setTimeout(()=>finishChenRegistration(id),Math.max(0,readyAt-Date.now()));
}
function renderAdminContact(host){
  window.syncMemorialRegistration();
  if(adminChatSession){
    host.replaceWith(adminChatSession);
    requestAnimationFrame(()=>{const log=adminChatSession.querySelector('.admin-chat-log');log.scrollTop=log.scrollHeight});
    return;
  }
  adminChatSession=host;
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
  adminCompletionMessage=message=>appendMessage('admin',message);
  const actions=host.querySelector('.admin-chat-actions');
  let flowVersion=0;
  const deliver=async(messages,next)=>{
    const version=++flowVersion;
    actions.replaceChildren();
    for(const message of messages){
      const typing=document.createElement('div');
      typing.className='admin-chat-row from-admin admin-typing';
      typing.innerHTML=`${avatar}<div class="admin-message" aria-label="管理员正在输入"><i></i><i></i><i></i></div>`;
      log.appendChild(typing);
      log.scrollTop=log.scrollHeight;
      await new Promise(resolve=>setTimeout(resolve,650));
      typing.remove();
      if(version!==flowVersion)return;
      appendMessage('admin',message);
      await new Promise(resolve=>setTimeout(resolve,180));
      if(version!==flowVersion)return;
    }
    next?.();
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
    form.onsubmit=async event=>{
      event.preventDefault();
      const value=form.elements.code.value.trim();
      appendMessage('visitor',value);
      const button=form.querySelector('button[type="submit"]');
      button.disabled=true;
      const version=flowVersion;
      let valid=false;
      try{valid=await window.memorialGateVerify('admin',{code:value})}
      catch(_){if(version===flowVersion)deliver(['验证暂时不可用，请稍后重试。'],showCodeForm);return}
      if(version!==flowVersion)return;
      if(!valid){
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
        if(kind==='correction'){deliver(['当前业务繁忙，信息勘误服务暂时无法办理，请稍后再试。'],showRegistrationChoices);return;}
        deliver(['您要补全哪位居民的信息？请输入姓名。'],()=>showResidentNameForm(kind));
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
      const replies=residentName==='陈珍珍'
        ?['系统已检索到陈珍珍的资料。\n根据现有记录，其生前福报已达到登记要求\n但该居民的部分登记资料在归档过程中缺失，目前纪念馆信息尚未完整建立。\n请补全相关居民资料后继续登记。',`在继续登记前，请问您与${residentName}是什么关系？`]
        :[`在继续登记前，请问您与${residentName}是什么关系？`];
      deliver(replies,()=>showRelationshipChoices(kind,residentName));
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
    actions.innerHTML=`<form class="admin-registration-form"><h3>${kind==='missing'?'居民信息补全':'居民信息勘误'}</h3><div class="admin-registration-fields"><label>姓名<input name="residentName" autocomplete="off" required></label><label>性别<select name="gender" required><option value="">请选择</option><option value="女">女</option><option value="男">男</option><option value="其他">其他</option></select></label><label>居民编号<input name="residentCode" autocomplete="off" required></label><div class="admin-form-section">亲属关系 <small>父亲或母亲至少填写一位</small></div><label>父亲<input name="father" autocomplete="off"></label><label class="admin-checkbox-label" data-parent-resident="father" hidden>父亲是否为桃原市居民<input type="checkbox" name="fatherIsTaoyuanResident" value="是"></label><label>母亲<input name="mother" autocomplete="off"></label><label class="admin-checkbox-label" data-parent-resident="mother" hidden>母亲是否为桃原市居民<input type="checkbox" name="motherIsTaoyuanResident" value="是"></label><div class="admin-field-row"><span>与父亲／母亲关系</span><div class="admin-relation-select"><button type="button" class="admin-relation-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="adminRelationOptions"><span>请选择</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg></button><div class="admin-relation-menu" id="adminRelationOptions" role="listbox" aria-label="与父亲或母亲关系" hidden><button type="button" role="option" data-relation="女儿" aria-selected="false">女儿</button><button type="button" role="option" data-relation="儿子" aria-selected="false">儿子</button><button type="button" role="option" data-relation="其他" aria-selected="false">其他</button></div><input type="hidden" name="parentRelation"></div></div><div class="admin-field-row"><span>迁入时间</span><div class="admin-date-picker"><div class="admin-date-input-wrap"><input name="moveInDate" type="text" inputmode="numeric" autocomplete="off" placeholder="年 / 月 / 日"><button type="button" class="admin-calendar-toggle" aria-label="打开日历" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M17 14h1M7 18h2M12 18h2"/></svg></button></div><div class="admin-calendar-panel" hidden><div class="admin-calendar-header"><button type="button" data-month-step="-1" aria-label="上个月">‹</button><div class="admin-calendar-title"><button type="button" class="admin-calendar-year-toggle" aria-label="选择年份"></button><strong class="admin-calendar-month-label"></strong></div><button type="button" data-month-step="1" aria-label="下个月">›</button></div><div class="admin-calendar-year-panel" hidden><div class="admin-calendar-decade"><button type="button" data-decade-step="-1" aria-label="上十年">‹</button><span></span><button type="button" data-decade-step="1" aria-label="下十年">›</button></div><div class="admin-calendar-years"></div></div><div class="admin-calendar-month-panel"><div class="admin-calendar-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="admin-calendar-days"></div></div></div></div></div>${kind==='missing'?'':'<label class="wide">更正内容与依据<textarea name="notes" rows="3" required></textarea></label>'}</div><button type="button">保存登记</button></form>`;
    requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight});
    const form=actions.querySelector('form');
    const genderRow=document.createElement('div');
    genderRow.className='admin-field-row';
    genderRow.innerHTML='<span>性别</span><div class="admin-relation-select admin-gender-select"><button type="button" class="admin-relation-trigger admin-gender-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="adminGenderOptions"><span>请选择</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg></button><div class="admin-relation-menu admin-gender-menu" id="adminGenderOptions" role="listbox" aria-label="性别" hidden><button type="button" role="option" data-gender="女" aria-selected="false">女</button><button type="button" role="option" data-gender="男" aria-selected="false">男</button><button type="button" role="option" data-gender="其他" aria-selected="false">其他</button></div><input type="hidden" name="gender"></div>';
    form.elements.gender.closest('label').replaceWith(genderRow);
    const gender=form.elements.gender;
    const genderTrigger=genderRow.querySelector('.admin-gender-trigger');
    const genderMenu=genderRow.querySelector('.admin-gender-menu');
    const closeGenderMenu=()=>{genderMenu.hidden=true;genderTrigger.setAttribute('aria-expanded','false')};
    genderTrigger.onclick=()=>{genderMenu.hidden=!genderMenu.hidden;genderTrigger.setAttribute('aria-expanded',String(!genderMenu.hidden));if(!genderMenu.hidden)(genderMenu.querySelector('[aria-selected="true"]')||genderMenu.querySelector('[data-gender]'))?.focus()};
    genderRow.querySelectorAll('[data-gender]').forEach(button=>button.onclick=()=>{gender.value=button.dataset.gender;genderTrigger.querySelector('span').textContent=gender.value;genderRow.querySelectorAll('[data-gender]').forEach(choice=>choice.setAttribute('aria-selected',String(choice===button)));closeGenderMenu();genderTrigger.focus()});
    genderTrigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='Enter'||event.key===' '){event.preventDefault();genderMenu.hidden=false;genderTrigger.setAttribute('aria-expanded','true');(genderMenu.querySelector('[aria-selected="true"]')||genderMenu.querySelector('[data-gender]'))?.focus()}});
    genderMenu.addEventListener('keydown',event=>{const options=[...genderMenu.querySelectorAll('[data-gender]')],index=options.indexOf(document.activeElement);if(event.key==='Escape'){closeGenderMenu();genderTrigger.focus()}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[(index+(event.key==='ArrowDown'?1:options.length-1))%options.length].focus()}});
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
    const relation=form.elements.parentRelation;
    const relationTrigger=form.querySelector('.admin-relation-select:not(.admin-gender-select) .admin-relation-trigger');
    const relationMenu=form.querySelector('.admin-relation-select:not(.admin-gender-select) .admin-relation-menu');
    const closeRelationMenu=()=>{relationMenu.hidden=true;relationTrigger.setAttribute('aria-expanded','false')};
    relationTrigger.onclick=()=>{
      relationMenu.hidden=!relationMenu.hidden;
      relationTrigger.setAttribute('aria-expanded',String(!relationMenu.hidden));
      if(!relationMenu.hidden)(relationMenu.querySelector('[aria-selected="true"]')||relationMenu.querySelector('[data-relation]'))?.focus();
    };
    form.querySelectorAll('[data-relation]').forEach(button=>button.onclick=()=>{
      relation.value=button.dataset.relation;
      relationTrigger.querySelector('span').textContent=relation.value;
      form.querySelectorAll('[data-relation]').forEach(choice=>choice.setAttribute('aria-selected',String(choice===button)));
      closeRelationMenu();relationTrigger.focus();
    });
    relationTrigger.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'||event.key==='Enter'||event.key===' '){event.preventDefault();relationMenu.hidden=false;relationTrigger.setAttribute('aria-expanded','true');(relationMenu.querySelector('[aria-selected="true"]')||relationMenu.querySelector('[data-relation]'))?.focus()}
    });
    relationMenu.addEventListener('keydown',event=>{
      const options=[...relationMenu.querySelectorAll('[data-relation]')];
      const index=options.indexOf(document.activeElement);
      if(event.key==='Escape'){closeRelationMenu();relationTrigger.focus()}
      else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[(index+(event.key==='ArrowDown'?1:options.length-1))%options.length].focus()}
    });
    const dateInput=form.elements.moveInDate;
    const calendar=form.querySelector('.admin-calendar-panel');
    const calendarToggle=form.querySelector('.admin-calendar-toggle');
    const yearToggle=form.querySelector('.admin-calendar-year-toggle');
    const monthLabel=form.querySelector('.admin-calendar-month-label');
    const yearPanel=form.querySelector('.admin-calendar-year-panel');
    const monthPanel=form.querySelector('.admin-calendar-month-panel');
    const decadeLabel=form.querySelector('.admin-calendar-decade span');
    const yearChoices=form.querySelector('.admin-calendar-years');
    const days=form.querySelector('.admin-calendar-days');
    let calendarYear=new Date().getFullYear(),calendarMonth=new Date().getMonth()+1;
    let decadeStart=Math.floor(calendarYear/10)*10;
    const parseDate=()=>{
      const match=dateInput.value.trim().match(/^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})(?:日)?$/);
      if(!match)return null;
      const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
      const date=new Date(year,month-1,day);
      return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?{year,month,day}:null;
    };
    const formatDate=({year,month,day})=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const renderCalendar=()=>{
      yearToggle.textContent=`${calendarYear}年`;monthLabel.textContent=`${calendarMonth}月`;
      days.replaceChildren();
      const leading=(new Date(calendarYear,calendarMonth-1,1).getDay()+6)%7;
      for(let i=0;i<leading;i++)days.appendChild(document.createElement('span'));
      const count=new Date(calendarYear,calendarMonth,0).getDate();
      const selected=parseDate();
      for(let day=1;day<=count;day++){
        const button=document.createElement('button');button.type='button';button.textContent=day;
        button.setAttribute('aria-label',`${calendarYear}年${calendarMonth}月${day}日`);
        if(selected?.year===calendarYear&&selected.month===calendarMonth&&selected.day===day)button.setAttribute('aria-current','date');
        button.onclick=()=>{dateInput.value=formatDate({year:calendarYear,month:calendarMonth,day});calendar.hidden=true;calendarToggle.setAttribute('aria-expanded','false');calendarToggle.focus()};
        days.appendChild(button);
      }
    };
    const renderYears=()=>{
      decadeLabel.textContent=`${decadeStart}—${decadeStart+9}`;
      yearChoices.replaceChildren();
      for(let year=decadeStart;year<decadeStart+10;year++){
        const button=document.createElement('button');button.type='button';button.textContent=year;
        if(year===calendarYear)button.setAttribute('aria-current','date');
        button.onclick=()=>{calendarYear=year;yearPanel.hidden=true;monthPanel.hidden=false;renderCalendar()};
        yearChoices.appendChild(button);
      }
    };
    calendarToggle.onclick=()=>{
      calendar.hidden=!calendar.hidden;
      calendarToggle.setAttribute('aria-expanded',String(!calendar.hidden));
      if(!calendar.hidden){const selected=parseDate();if(selected){calendarYear=selected.year;calendarMonth=selected.month}yearPanel.hidden=true;monthPanel.hidden=false;renderCalendar()}
    };
    yearToggle.onclick=()=>{yearPanel.hidden=!yearPanel.hidden;monthPanel.hidden=!yearPanel.hidden;decadeStart=Math.floor(calendarYear/10)*10;if(!yearPanel.hidden)renderYears()};
    form.querySelectorAll('[data-decade-step]').forEach(button=>button.onclick=()=>{decadeStart+=Number(button.dataset.decadeStep)*10;renderYears()});
    form.querySelectorAll('[data-month-step]').forEach(button=>button.onclick=()=>{
      const date=new Date(calendarYear,calendarMonth-1+Number(button.dataset.monthStep),1);
      calendarYear=date.getFullYear();calendarMonth=date.getMonth()+1;yearPanel.hidden=true;monthPanel.hidden=false;renderCalendar();
    });
    dateInput.addEventListener('blur',()=>{const selected=parseDate();if(selected)dateInput.value=formatDate(selected)});
    calendar.addEventListener('keydown',event=>{if(event.key==='Escape'){calendar.hidden=true;calendarToggle.setAttribute('aria-expanded','false');calendarToggle.focus()}});
    const feedback=document.createElement('p');
    feedback.className='admin-registration-feedback';feedback.setAttribute('role','status');feedback.hidden=true;
    form.appendChild(feedback);
    const saveButton=form.querySelector(':scope > button');
    saveButton.onclick=async()=>{
      if(saveButton.disabled)return;
      const version=flowVersion;
      saveButton.disabled=true;
      feedback.hidden=false;
      let correct=false;
      try{
        const date=parseDate();
        correct=kind==='missing'&&await window.memorialGateVerify('registration',{
          name:form.elements.residentName.value,
          gender:form.elements.gender.value,
          code:form.elements.residentCode.value,
          father:father.value,
          mother:mother.value,
          motherIsTaoyuanResident:form.elements.motherIsTaoyuanResident.checked,
          relation:relation.value,
          year:date?.year,month:date?.month,day:date?.day
        });
      }catch(_){if(version!==flowVersion)return;feedback.textContent='验证暂时不可用，请稍后重试。';feedback.dataset.state='error';saveButton.disabled=false;return}
      if(version!==flowVersion)return;
      if(!correct){feedback.textContent='信息有误，请核对后重试。';feedback.dataset.state='error';saveButton.disabled=false;return}
      feedback.textContent='登记资料已提交，正在核验，请稍候。';
      feedback.dataset.state='success';
      host.classList.remove('has-form');
      actions.replaceChildren();
      const summary=document.createElement('div');
      summary.className='admin-chat-row from-visitor';
      summary.innerHTML='<div class="admin-message admin-registration-summary"><small>已提交登记资料</small><strong>陈珍珍</strong><span>信息补全 · 待核验</span></div>';
      log.append(summary);log.scrollTop=log.scrollHeight;
      deliver(['已收到登记资料，正在核验，请稍后。']);
      armAdminNoticeAudio();
      scheduleChenRegistrationCompletion();
    };
    form.onsubmit=event=>event.preventDefault();
  };
  deliver(['您好，您想咨询什么问题？'],showTopics);
}

