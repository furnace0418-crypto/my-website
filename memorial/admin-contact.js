function renderAdminContact(host){
  const avatar='<span class="admin-avatar" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="14" r="7"/><path d="M7 35c.6-8 5.3-13 13-13s12.4 5 13 13"/></svg></span>';
  const topics=[
    ['居民登记','居民登记请准备居民姓名、拟登记纪念馆及相关资料。资料核对后，管理员会继续处理登记事宜。'],
    ['纪念馆资料','如需补充或更正资料，请说明纪念馆名称、需要调整的内容及可供核对的依据。'],
    ['平台使用','如遇页面或功能问题，请记录操作步骤和出现问题的页面，方便管理员排查。'],
    ['其他问题','如是其他事项，请整理问题的简要经过与相关资料，再联系管理员说明。']
  ];
  host.innerHTML=`<div class="admin-chat-header">${avatar}<div><strong>管理员服务</strong><small>在线咨询</small></div><span class="admin-chat-indicator" aria-hidden="true"></span></div><div class="admin-chat-log" role="log" aria-live="polite"><div class="admin-chat-row from-admin">${avatar}<div class="admin-message"><p>您好，请先输入管理员编号。</p></div></div></div><form class="admin-code-form"><label for="adminContactCode">管理员编号</label><div><input id="adminContactCode" name="code" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="请输入编号" required><button type="submit">继续</button></div></form><div class="admin-topic-choices" hidden><p>请选择咨询事项</p><div class="admin-topic-buttons"></div></div>`;
  const log=host.querySelector('.admin-chat-log');
  const appendMessage=(who,message)=>{
    const row=document.createElement('div');row.className=`admin-chat-row from-${who}`;
    if(who==='admin')row.innerHTML=avatar;
    const item=document.createElement('div');item.className='admin-message';
    const body=document.createElement('p');body.textContent=message;item.appendChild(body);row.appendChild(item);log.appendChild(row);
    log.scrollTop=log.scrollHeight;
  };
  host.querySelector('.admin-code-form').onsubmit=event=>{
    event.preventDefault();
    const value=event.currentTarget.elements.code.value.trim();
    if(!value)return;
    appendMessage('visitor','已提交管理员编号');
    event.currentTarget.hidden=true;
    appendMessage('admin','已收到。您想咨询什么？');
    host.querySelector('.admin-topic-choices').hidden=false;
  };
  const choices=host.querySelector('.admin-topic-buttons');
  for(const [label,answer] of topics){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.onclick=()=>{appendMessage('visitor',label);appendMessage('admin',answer)};
    choices.appendChild(button);
  }
}
