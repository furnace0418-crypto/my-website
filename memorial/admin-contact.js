function renderAdminContact(host){
  const topics=[
    ['居民登记','居民登记请准备居民姓名、拟登记纪念馆及相关资料。资料核对后，管理员会继续处理登记事宜。'],
    ['纪念馆资料','如需补充或更正资料，请说明纪念馆名称、需要调整的内容及可供核对的依据。'],
    ['平台使用','如遇页面或功能问题，请记录操作步骤和出现问题的页面，方便管理员排查。'],
    ['其他问题','如是其他事项，请整理问题的简要经过与相关资料，再联系管理员说明。']
  ];
  host.innerHTML='<div class="admin-chat-log" role="log" aria-live="polite"><div class="admin-message from-admin"><b>管理员服务</b><p>您好。请先输入管理员编号，再选择需要咨询的事项。</p></div></div><form class="admin-code-form"><label for="adminContactCode">管理员编号</label><div><input id="adminContactCode" name="code" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="请输入编号" required><button type="submit">继续</button></div></form><div class="admin-topic-choices" hidden><p>您想咨询什么？</p><div class="admin-topic-buttons"></div></div>';
  const log=host.querySelector('.admin-chat-log');
  const appendMessage=(who,message)=>{
    const item=document.createElement('div');item.className=`admin-message from-${who}`;
    if(who==='admin'){const name=document.createElement('b');name.textContent='管理员服务';item.appendChild(name)}
    const body=document.createElement('p');body.textContent=message;item.appendChild(body);log.appendChild(item);
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
