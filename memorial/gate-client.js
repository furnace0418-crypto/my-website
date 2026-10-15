window.memorialGateVerify=async function(kind,payload={}){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch('https://dwoyvvleadefmdzehyum.supabase.co/functions/v1/memorial-gate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({kind,...payload}),
      signal:controller.signal
    });
    if(!response.ok)throw new Error('验证服务暂时不可用');
    const data=await response.json();
    return data.valid===true;
  }finally{clearTimeout(timeout)}
};
