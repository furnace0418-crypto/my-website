(() => {
  let started=null,frame=0,overlay=null;
  const active=()=>document.body.classList.contains('invite-theme')&&document.querySelector('.return-path-page');
  function reset(){
    cancelAnimationFrame(frame);frame=0;started=null;
    overlay?.remove();overlay=null;
    document.documentElement.style.removeProperty('--return-path-dwell');
  }
  function tick(now){
    if(!active()){reset();return;}
    if(started===null)started=now;
    document.documentElement.style.setProperty('--return-path-dwell',String(Math.min(1,(now-started)/30000)));
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    if(!active()){reset();return;}
    if(frame)return;
    overlay=document.createElement('div');overlay.className='return-path-vignette';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
    frame=requestAnimationFrame(tick);
  }
  new MutationObserver(sync).observe(document.querySelector('#app'),{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{if(!/^#articles\/return-path-/.test(location.hash))reset();});
  document.addEventListener('click',event=>{
    const link=event.target.closest('a');
    if(link&&!/^#articles\/return-path-/.test(link.getAttribute('href')||''))reset();
  });
  sync();
})();

