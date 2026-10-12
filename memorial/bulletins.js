const memorialBulletins=[
  {id:'launch',title:'关于安念堂公益纪念平台正式上线的公告',date:'2024-04-01',intro:'为妥善保存生命故事，方便亲友寄托思念，福善文化研究会发起的安念堂公益纪念平台即日起正式上线。',sections:[
    ['一、让平凡的生命留下记录','每个人的一生，都有值得被记住的片段。平台将以人物生平、家庭影像和亲友留言为基础，为逝者建立可以持续整理的纪念空间。无论事迹大小、经历长短，都应得到认真、平等的对待。'],
    ['二、以简朴的方式表达思念','亲友可通过网上献花、点亮长明灯、书写寄语等方式参与纪念。我们倡导量力而行、重情轻物，不以纪念形式的多少衡量感情深浅，也不以公开展示代替真实的关怀。'],
    ['三、共同维护安静的纪念环境','提交资料前，请核对姓名、时间及人物关系，并征得相关家属同意。涉及他人隐私的内容应作适当处理。如发现记载有误或资料归属存在争议，请联系平台管理员核实。'],
    ['四、关于后续资料整理','平台上线初期，部分人物档案仍在补充与校对。研究会将分批整理已收到的资料，并根据亲友反馈修订记载。感谢每一位愿意提供文字、照片和口述记忆的参与者。']
  ]},
  {id:'qingming',title:'清明节网络祭祀倡议书',date:'2024-03-28',intro:'春回大地，清明将至。思念不因距离而减，敬意也不必借繁重的仪式表达。福善文化研究会向各位市民及平台使用者发出如下倡议。',sections:[
    ['一、以文明方式寄托哀思','提倡以一束鲜花、一段文字、一盏长明灯纪念故人。选择网络祭祀时，请保持真诚与克制，让纪念回到对生命的尊重与对往事的珍惜。'],
    ['二、以真实记忆传承家风','与家人一起回忆故人的生活，整理一张老照片，记下一段常被提起的故事。比起铺张的排场，那些具体而朴素的记忆，更能让后辈理解家人曾经走过的路。'],
    ['三、以体谅之心对待他人','每个人表达哀伤的方式不同。请尊重亲友是否公开纪念、是否参与留言的选择，不攀比祭祀形式，不催促他人走出悲伤，也不以自己的感受评判他人的思念。'],
    ['四、让关怀延续到日常','纪念故人，也请照顾仍在身边的人。多一次问候，多一分耐心，在力所能及之处扶困助人。愿清明的思念化为日常生活中的善意，让温情有所延续。']
  ]},
  {id:'review',title:'关于纪念馆内容审核与管理的说明',date:'2024-02-15',intro:'纪念馆保存的是个人经历，也是亲友共同珍视的记忆。为减少误记、冒名与不当公开，现就资料提交及内容管理作如下说明。',sections:[
    ['一、资料应当真实、清楚','人物姓名、重要时间、家庭关系及生平经历，应以家属确认的资料为依据。无法核实的口述内容，请注明讲述者及记录来源；对尚有分歧的细节，不宜作确定性表述。'],
    ['二、公开范围应当适当','上传照片、书信与其他材料前，请确认具有使用权限。身份证件号码、住址、联系方式及未成年人相关信息，不应直接公开。与纪念主题无关的私人细节，也请谨慎处理。'],
    ['三、留言应当尊重逝者与亲友','平台不接受辱骂、冒名、广告以及未经证实的指控。对可能引发争议的内容，管理员可暂缓展示并联系提交者核实；对明显不当的内容，可作隐藏或移除处理。'],
    ['四、更正与补充的处理','如需更正已公开的记载，请向管理员说明对应纪念馆、具体段落及更正依据。资料尚未核对完成时，部分内容可能暂不展示。审核是对记载负责，并非对一个人生命价值的评判。']
  ]},
  {id:'plan',title:'福善文化研究会2024年工作计划',date:'2024-01-20',intro:'新的一年，研究会将围绕生命故事保存、文明纪念倡导与日常公益实践，逐步推进以下工作。各项资料整理以尊重本人及家属意愿为前提。',sections:[
    ['一、建设公益纪念平台','完成安念堂平台的基础建设与资料整理流程，逐步完善人物纪念、线上寄语及内容校对功能。优先保证记载清楚、使用方便，让不同年龄的亲友都能参与。'],
    ['二、开展城市记忆整理','征集普通家庭的老照片、生活手记及口述故事，记录城市变迁中的个人经历。整理过程中保留资料出处，对不宜公开的材料单独处理，不以征集之名强求捐赠。'],
    ['三、倡导文明纪念与邻里互助','结合清明等时节开展文明祭祀倡议，鼓励简朴纪念。同时关注日常生活中可以落实的小事，提倡关心独居长者、体谅困境中的家庭，将善意落实为具体行动。'],
    ['四、定期回顾与持续修订','年内分阶段汇总平台反馈与资料整理情况，修订不够清楚的说明，补充遗漏的记载。研究会将以审慎、持续的方式推进工作，珍惜参与者的信任与托付。']
  ]}
];

function wireHomeBulletins(){
  const panel=app.querySelector('.notice-panel');
  if(!panel)return;
  panel.querySelector('h2').innerHTML='<span>︽</span> 资讯 <span>︾</span>';
  panel.querySelector('.section-heading p').textContent='研究会公告、平台说明与纪念文化';
  panel.querySelector('ul').innerHTML=memorialBulletins.map(item=>`<li><a href="#articles/${item.id}">${esc(item.title)}</a><time datetime="${item.date}">${item.date}</time></li>`).join('');
  const more=document.createElement('a');more.className='bulletin-home-more';more.href='#articles';more.textContent='阅览全部资讯 · 福报说明 →';panel.appendChild(more);
}

function bulletinPage(id='launch'){
  const selected=memorialBulletins.find(item=>item.id===id)||memorialBulletins[0];
  const fortune=id==='fortune';
  let fortuneBody;
  if(fortune){fortuneExplanation();fortuneBody=app.querySelector('.fortune-body')}
  app.innerHTML=`<div class="page-shell bulletin-page"><div class="bulletin-layout"><nav class="bulletin-sidebar" aria-label="资讯选择"><h2>研究会公告</h2>${memorialBulletins.map(item=>`<a href="#articles/${item.id}" ${!fortune&&item.id===selected.id?'aria-current="page"':''}><span>${esc(item.title)}</span><time datetime="${item.date}">${item.date}</time></a>`).join('')}<h2 class="bulletin-subheading">纪念文化</h2><a href="#articles/fortune" ${fortune?'aria-current="page"':''}><span>福报说明</span><small>善念与善行</small></a></nav><article class="bulletin-reader" aria-labelledby="bulletin-title"><header class="bulletin-article-header"><p>${fortune?'纪念文化':'研究会公告'}</p><h2 id="bulletin-title">${fortune?'福报说明':esc(selected.title)}</h2><div>福善文化研究会${fortune?'':`<span>发布于 <time datetime="${selected.date}">${selected.date.replaceAll('-','.')}</time></span>`}</div></header><div class="bulletin-article-body">${fortune?'':`<p class="bulletin-intro">${esc(selected.intro)}</p>${selected.sections.map(([title,body])=>`<section><h3>${esc(title)}</h3><p>${esc(body)}</p></section>`).join('')}<footer class="bulletin-signature"><p>福善文化研究会</p><time datetime="${selected.date}">${selected.date.replaceAll('-','.')}</time></footer>`}</div></article></div></div>`;
  if(fortuneBody)app.querySelector('.bulletin-article-body').appendChild(fortuneBody);
}
