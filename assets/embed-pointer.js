// Forward pointer presence only to the local 3D parent, without intercepting clicks.
(() => {
 if(parent===window || !new URLSearchParams(location.search).has('embedded'))return;
 const target=new URL(location.href);target.port='3000';
 function send(inside,event){if(inside)parent.postMessage({type:'mousemove',clientX:event.clientX,clientY:event.clientY},target.origin);}
 document.addEventListener('pointermove',e=>send(true,e),{passive:true});
 document.documentElement.addEventListener('pointerleave',e=>send(false,e),{passive:true});
})();
