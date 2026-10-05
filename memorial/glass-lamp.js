/* Embossed volumetric glass / polished brass. Dedicated Three.js r160 renderer. */
(() => {
  'use strict';
  const T = window.THREE, $ = id => document.getElementById(id), host = $('viewport');
  const memorialId=new URLSearchParams(location.search).get('memorial');
  const dedicated=['chen-zhenzhen','zhang-wenhua'].includes(memorialId);
  document.body.classList.toggle('memorial-lantern',dedicated);
  $('memorialWishForm').hidden=!dedicated;
  $('backToTributes').hidden=!dedicated;
  $('backToTributes').onclick=()=>{
    try{parent.location.hash=`#hall/${memorialId}/tributes`}
    catch(_){parent.postMessage({type:'memorial-return'},'*')}
  };
  const FIXED_METAL_COLOR = '#b57a36';
  const defaults = {base:'round', shade:'amber', shadeColor:'#ffffff', brightness:1, baseSize:1, baseHeight:1, wish:''};
  const formerDefaultColors = new Set(['#eeb768','#d9d8d4','#dbaeae','#b8a4a0']);
  const shadeStyles={
    amber:{name:'琥珀玻璃灯',description:'琥珀曲腹 · 清透暖光',roughness:.19,transmission:.97,bump:0,profile:[[.40,0],[.52,.035],[.64,.10],[.72,.20],[.755,.32],[.72,.44],[.61,.55],[.43,.66],[.30,.76],[.275,.89],[.29,1]]},
    smoke:{name:'旋纹水晶灯',description:'圆腹旋纹 · 澄澈透光',roughness:.12,transmission:.95,bump:0,profile:[[.45,0],[.58,.04],[.69,.14],[.78,.28],[.81,.46],[.77,.63],[.63,.78],[.39,.89],[.34,.96],[.35,1]]},
    hammered:{name:'切面水晶杯灯',description:'细腰广口 · 晶莹切面',roughness:.1,transmission:.96,bump:0,profile:[[.24,0],[.27,.07],[.32,.17],[.44,.32],[.61,.51],[.78,.70],[.94,.87],[1.02,.96],[1.05,1]]},
    lattice:{name:'素面琉璃宫灯',description:'八棱宫灯 · 清透素面',roughness:.08,transmission:.94,bump:0,profile:[[.39,0],[.50,.035],[.62,.13],[.68,.22],[.68,.48],[.68,.66],[.54,.77],[.36,.88],[.35,1]]},
    cloud:{name:'柔雾磨砂灯',description:'矮钵轮廓 · 柔雾透光',roughness:.76,transmission:.58,bump:.009,profile:[[.43,0],[.55,.04],[.67,.12],[.76,.28],[.79,.47],[.76,.65],[.68,.82],[.66,.94],[.69,1]]}
  };
  let state = {...defaults,base:memorialId==='zhang-wenhua'?'lotus':defaults.base,shade:memorialId==='zhang-wenhua'?'amber':dedicated?'cloud':defaults.shade}, lit = !dedicated, rotating = false, model, flame, glow, frame, stopped = false;
  let goldMaterial, blackMaterial, glassMaterial, wickMaterial, glassShader;
  let burn = lit?1:0, lastTime = null, lampConfirmTimer = null;
  if(!dedicated)try {
    const saved = JSON.parse(localStorage.getItem('annian-glass-lamp-v2') || 'null');
    for (const key in defaults) if (saved && typeof saved[key] === typeof defaults[key]) state[key] = saved[key];
  } catch (_) {}
  state.brightness=Math.max(.2,Math.min(1,state.brightness));
  for (const key of ['baseSize','baseHeight']) state[key] = Math.max(.2,Math.min(2,state[key]));
  if(state.shade==='lotus')state.shade='hammered';
  if(state.shade==='ribbed')state.shade='smoke';
  if(!shadeStyles[state.shade])state.shade=defaults.shade;
  if(formerDefaultColors.has(state.shadeColor.toLowerCase()))state.shadeColor=defaults.shadeColor;
  const shadeColors = {[state.shade]:state.shadeColor};
  let renderer;
  try { renderer = new T.WebGLRenderer({antialias:true}); }
  catch (_) { $('status').textContent='无法启动 3D 展示，请开启浏览器硬件加速。'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new T.Scene(); scene.background=new T.Color('#050403');
  scene.fog=new T.Fog(0x100c08,16,30);
  // A closed room, not a black sky dome: visible plaster and a continuous floor.
  const enclosure=new T.Mesh(new T.BoxGeometry(22,14,22),new T.MeshStandardMaterial({color:0x302820,roughness:.94,metalness:0,emissive:0x21180e,emissiveIntensity:.48,side:T.BackSide}));
  enclosure.position.y=6.98;enclosure.receiveShadow=true;
  scene.add(enclosure);
  const camera=new T.PerspectiveCamera(36,1,.08,40);
  const controls=new T.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.enablePan=false;
  controls.enableZoom=false;
  controls.minDistance=3.3; controls.maxDistance=8; controls.minPolarAngle=.8; controls.maxPolarAngle=Math.PI*.47;
  controls.autoRotateSpeed=.5;
  function resetView(){camera.position.set(3.5,2.5,6.3);controls.target.set(0,1.55,0);controls.update();}
  resetView();
  // Narrow HDR cards create structured reflections, not flat ambient illumination.
  const studio=new T.Scene(); studio.background=new T.Color(.002,.001,.0005);
  for(const [x,y,z,w,h,p,warm] of [[-3,2,2,.48,3,3,0],[3,1,-2,.32,2,2.5,1],[0,3,-1,2,.18,1.8,1],[0,.5,3,.8,.12,2.5,1]]){
    const card=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(p,p*(warm?.58:.88),p*(warm?.22:.65)),side:T.DoubleSide}));
    card.position.set(x,y,z);card.lookAt(0,1,0);studio.add(card);
  }
  const pmrem=new T.PMREMGenerator(renderer), environment=pmrem.fromScene(studio,.09);
  pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  // A dim room fill remains when the candle is out, so walls never disappear.
  scene.add(new T.HemisphereLight(0xb8a48b,0x43362a,.38));
  scene.add(new T.AmbientLight(0xc8b69e,.17));
  const light=new T.PointLight(0xffbf69,9,30,2);
  // Approximate candle bounce below the tray; it fades with the same flame.
  const bounce=new T.PointLight(0xffbb70,0,8,2);scene.add(bounce);
  // The point light is inside the shade; its real-time floor shadow made a huge jagged disc.
  light.castShadow=false;scene.add(light);
  const floor=new T.Mesh(new T.PlaneGeometry(22,22),new T.MeshStandardMaterial({color:0x282018,roughness:.55,metalness:.08,emissive:0x171009,emissiveIntensity:.28}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=false;scene.add(floor);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;
  const shadowCtx=shadowCanvas.getContext('2d'),shadowFade=shadowCtx.createRadialGradient(128,128,14,128,128,128);
  shadowFade.addColorStop(0,'rgba(0,0,0,.55)');shadowFade.addColorStop(.38,'rgba(0,0,0,.34)');shadowFade.addColorStop(1,'rgba(0,0,0,0)');
  shadowCtx.fillStyle=shadowFade;shadowCtx.fillRect(0,0,256,256);
  const contactShadowMap=new T.CanvasTexture(shadowCanvas);
  const contactShadow=new T.Mesh(new T.PlaneGeometry(3.5,3.5),new T.MeshBasicMaterial({map:contactShadowMap,transparent:true,depthWrite:false,opacity:.72}));
  contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=.004;scene.add(contactShadow);
  const skirting=new T.Group();
  const trimMaterial=new T.MeshStandardMaterial({color:0x21160d,roughness:.65,emissive:0x160e08,emissiveIntensity:.08});
  for(let i=0;i<4;i++){const trim=new T.Mesh(new T.BoxGeometry(22,.11,.045),trimMaterial);const angle=i*Math.PI/2;trim.position.set(Math.sin(angle)*10.96,.055,Math.cos(angle)*10.96);trim.rotation.y=angle;trim.receiveShadow=true;skirting.add(trim);}
  scene.add(skirting);
  // Five relief maps share one texture pair, but each shade has its own geometry and ornament.
  const reliefCanvas=document.createElement('canvas');reliefCanvas.width=reliefCanvas.height=512;
  const ctx=reliefCanvas.getContext('2d');ctx.fillStyle='#606060';ctx.fillRect(0,0,512,512);
  ctx.lineCap='round';ctx.lineJoin='round';
  const bump=new T.CanvasTexture(reliefCanvas);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(3,1.5);bump.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const transmissionCanvas=document.createElement('canvas');transmissionCanvas.width=transmissionCanvas.height=512;
  const tc=transmissionCanvas.getContext('2d');
  const transmissionMap=new T.CanvasTexture(transmissionCanvas);transmissionMap.wrapS=transmissionMap.wrapT=T.RepeatWrapping;transmissionMap.repeat.copy(bump.repeat);transmissionMap.anisotropy=bump.anisotropy;
  function drawRelief(style){
    ctx.fillStyle='#606060';ctx.fillRect(0,0,512,512);
    if(style==='cloud'){
      // Fine, low-contrast grain reads as ground glass rather than a drawn motif.
      for(let y=0;y<512;y+=2)for(let x=0;x<512;x+=2){
        const tileX=Math.min(x,510-x),tileY=Math.min(y,510-y);
        const grain=((tileX*73+tileY*151+(tileX*tileY)%97)*37)%37;
        const value=103+grain;
        ctx.fillStyle=`rgb(${value},${value},${value})`;ctx.fillRect(x,y,2,2);
      }
    }
    // The circumference must contain an integer number of repeats or the UV seam splits the ornament.
    bump.repeat.set(2,1);
    transmissionMap.repeat.copy(bump.repeat);
    const pixels=ctx.getImageData(0,0,512,512);
    for(let i=0;i<pixels.data.length;i+=4){const relief=Math.max(0,(pixels.data[i]-96)/159);const value=style==='cloud'?226:Math.round(255-relief*90);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;}
    tc.putImageData(pixels,0,0);bump.needsUpdate=true;transmissionMap.needsUpdate=true;
  }
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const gc=glowCanvas.getContext('2d'), grad=gc.createRadialGradient(64,64,0,64,64,64);
  grad.addColorStop(0,'rgba(255,242,191,1)');grad.addColorStop(.15,'rgba(255,186,65,.6)');grad.addColorStop(1,'rgba(255,140,20,0)');gc.fillStyle=grad;gc.fillRect(0,0,128,128);
  const glowMap=new T.CanvasTexture(glowCanvas);
  function clearModel(){if(!model)return;const materials=new Set();model.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());scene.remove(model);}
  function build(){
    clearModel();model=new T.Group();scene.add(model);
    glassShader=null;
    drawRelief(state.shade);
    // r160 converts sRGB picker colors itself; a second conversion crushed metal to brown.
    const gold=goldMaterial=new T.MeshPhysicalMaterial({color:FIXED_METAL_COLOR,metalness:1,roughness:.14,clearcoat:.25,clearcoatRoughness:.1,envMap:environment.texture,envMapIntensity:.8});
    const black=blackMaterial=new T.MeshPhysicalMaterial({color:0x25211c,metalness:.86,roughness:.12,clearcoat:1,clearcoatRoughness:.055,envMap:environment.texture,envMapIntensity:1});
    // The warm color comes from absorption and the candle, never an emissive shell.
    const finish=shadeStyles[state.shade];
    const glass=glassMaterial=new T.MeshPhysicalMaterial({color:0xffffff,attenuationColor:new T.Color(state.shadeColor),attenuationDistance:state.shade==='lattice'?1.8:state.shade==='amber'||state.shade==='hammered'?1.6:1.1,thickness:state.shade==='lattice'?.095:.07,ior:state.shade==='lattice'||state.shade==='hammered'?1.55:1.48,metalness:0,roughness:finish.roughness,transmission:finish.transmission,transmissionMap:state.shade==='lattice'||state.shade==='amber'||state.shade==='hammered'?null:transmissionMap,transparent:false,opacity:1,depthWrite:true,envMap:environment.texture,envMapIntensity:state.shade==='lattice'||state.shade==='hammered'?1.55:1.2,bumpMap:finish.bump?bump:null,bumpScale:finish.bump,clearcoat:state.shade==='cloud'?.08:.3,clearcoatRoughness:.14,flatShading:state.shade==='lattice'||state.shade==='hammered',side:T.FrontSide});
    // A restrained localized scattering approximation, added to (not replacing)
    // physical transmission. No uniform emissive coating on the whole shade.
    glass.onBeforeCompile=shader=>{
      shader.uniforms.candleScatter={value:burn*state.brightness};
      shader.uniforms.shadeHeight={value:state.shade==='hammered'?1.3:state.shade==='cloud'?1.35:state.shade==='smoke'?1.6:1.77};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float lampHeight;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlampHeight = position.y;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float lampHeight;\nuniform float candleScatter;\nuniform float shadeHeight;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat scatterFalloff = exp(-pow((lampHeight / shadeHeight - 0.26) * 3.8, 2.0));\ntotalEmissiveRadiance += attenuationColor * vec3(1.0, 0.65, 0.3) * scatterFalloff * candleScatter * 0.22;');
      glassShader=shader;
    };
    function mesh(geometry,material,y=0,shadow=true){const m=new T.Mesh(geometry,material);m.position.y=y;m.castShadow=shadow;m.receiveShadow=shadow;model.add(m);return m;}
    function lathe(points,material,y=0,segments=128,shadow=true){
      const geometry=new T.LatheGeometry(points.map(([r,h])=>new T.Vector2(r,h)),segments);
      // Explicitly weld shading across the duplicated UV seam.
      const normals=geometry.attributes.normal,n=points.length;
      for(let j=0;j<n;j++){const a=j,b=segments*n+j;const normal=new T.Vector3().fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,normal.x,normal.y,normal.z);normals.setXYZ(b,normal.x,normal.y,normal.z);}
      return mesh(geometry,material,y,shadow);
    }
    function ring(r,y,t=.017){const m=mesh(new T.TorusGeometry(r,t,12,128),gold,y);m.rotation.x=Math.PI/2;return m;}
    const s=state.baseSize,bh=state.baseHeight,segments=state.base==='hex'?6:128;
    lathe([[0,0],[.66*s,0],[.72*s,.035],[.73*s,.08],[.71*s,.12],[.65*s,.16],[.56*s,.20],[.34*s,.235],[0,.235]],black,.025,segments);
    ring(.715*s,.085,.018);ring(.64*s,.188,.012);
    let stem= .78*bh*(state.base==='tall'?1.2:1);
    lathe([[0,0],[.23,0],[.24,.04],[.19,.09],[.13,.14],[.12,stem-.12],[.17,stem-.06],[.22,stem],[0,stem]],black,.23);
    ring(.22,.27,.025);ring(.16,.38,.018);ring(.185,.23+stem-.045,.019);
    if(state.base==='lotus')for(let i=0;i<12;i++){const p=mesh(new T.SphereGeometry(.15,16,12),gold,.24);p.scale.set(1,.3,1.9);p.position.x=Math.sin(i*Math.PI/6)*.36*s;p.position.z=Math.cos(i*Math.PI/6)*.36*s;p.rotation.y=i*Math.PI/6;}
    const tray=.23+stem;
    lathe([[0,0],[.58,0],[.64,.045],[.65,.075],[.61,.10],[.48,.12],[0,.12]],gold,tray);
    ring(.62,tray-.035,.012);ring(.55,tray-.08,.014);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const bar=mesh(new T.BoxGeometry(.026,.08,.09),gold,tray-.02);bar.position.x=Math.sin(a)*.56;bar.position.z=Math.cos(a)*.56;bar.rotation.y=a;}
    const bottom=tray+.115, h=state.shade==='hammered'?1.3:state.shade==='cloud'?1.35:state.shade==='smoke'?1.6:1.77, w=1;
    // Each preset changes the silhouette as well as the embossed glass pattern.
    const profile=shadeStyles[state.shade].profile;
    // A closed wall cross-section supplies an outer skin, inner skin and actual rim.
    // FrontSide culling avoids the overlapping double-sided faces of the old shell.
    const spline=new T.SplineCurve(profile.map(([r,y])=>new T.Vector2(r*w,y*h)));
    const outer=spline.getPoints(88).map(p=>[p.x,p.y]);
    const inner=outer.map(([r,y])=>[Math.max(.04,r-.035),y]).reverse();
    const shell=outer.concat(inner,[outer[0]]);
    const shade=lathe(shell,glass,bottom,state.shade==='lattice'?8:state.shade==='hammered'?12:192,false);
    if(state.shade==='smoke'){
      // Raised spiral flutes follow the round body; the inner wall moves only slightly,
      // so the relief reads as varying glass thickness rather than a warped tube.
      const positions=shade.geometry.attributes.position;
      const smoothstep=(a,b,value)=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);};
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),z=positions.getZ(i),y=positions.getY(i);
        const height=y/h;
        const envelope=smoothstep(.025,.18,height)*(1-smoothstep(.78,.98,height));
        const ridge=Math.pow((1+Math.cos(6*Math.atan2(z,x)+12*height))*.5,2.5);
        const wall=i%shell.length<outer.length?1:.22;
        const radius=Math.hypot(x,z),offset=.12*envelope*(ridge-.3)*wall;
        positions.setXYZ(i,x*(radius+offset)/radius,y,z*(radius+offset)/radius);
      }
      positions.needsUpdate=true;
      shade.geometry.computeVertexNormals();
      const normals=shade.geometry.attributes.normal,n=shell.length,segments=192;
      for(let j=0;j<n;j++){
        const a=j,b=segments*n+j;
        const normal=new T.Vector3().fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).normalize();
        normals.setXYZ(a,normal.x,normal.y,normal.z);normals.setXYZ(b,normal.x,normal.y,normal.z);
      }
    }
    // Map both walls by physical height, not the index of the closed profile.
    const shadeUV=shade.geometry.attributes.uv,shadePosition=shade.geometry.attributes.position;
    for(let i=0;i<shadeUV.count;i++)shadeUV.setY(i,shadePosition.getY(i)/h);
    shadeUV.needsUpdate=true;
    if(state.shade==='lattice'||state.shade==='hammered'){
      const sides=state.shade==='lattice'?8:12;
      const facetedRim=(radius,y,t)=>{const rim=mesh(new T.TorusGeometry(radius,t,10,sides),gold,y);rim.rotation.x=Math.PI/2;};
      facetedRim(profile[0][0]*w,bottom,.013);
      facetedRim(profile[profile.length-1][0]*w,bottom+h,.01);
    }else{
      ring(profile[0][0]*w,bottom,.013);ring(profile[profile.length-1][0]*w,bottom+h,.01);
    }
    const wax=new T.MeshStandardMaterial({color:0xf3d7a1,roughness:.8});
    mesh(new T.CylinderGeometry(.09,.10,.34,32),wax,bottom+.17);
    wickMaterial=new T.MeshStandardMaterial({color:0x27170c,emissive:0xff4208,emissiveIntensity:0});
    mesh(new T.CylinderGeometry(.008,.009,.04,8),wickMaterial,bottom+.35);
    // Opaque emissive source is included in the transmission render target.
    flame=mesh(new T.SphereGeometry(1,24,24),new T.MeshBasicMaterial({color:new T.Color(4.5,2.2,.65)}),bottom+.43,false);flame.scale.set(.045,.11,.045);
    flame.userData.wickY=bottom+.36;
    glow=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:0xffc77a,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}));glow.position.copy(flame.position);glow.scale.set(.7,.85,1);glow.visible=lit;model.add(glow);
    light.position.copy(flame.position);
    bounce.position.set(0,Math.max(.35,tray-.18),.25);
    updateLight(0);
    for(const key in defaults){if($(key))$(key).value=state[key];if($(key+'Out'))$(key+'Out').textContent=Math.round(state[key]*100)+'%';}
    document.querySelectorAll('[data-shade]').forEach(b=>{const selected=b.dataset.shade===state.shade;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    $('styleName').textContent=shadeStyles[state.shade].name;
    $('styleDescription').textContent=shadeStyles[state.shade].description+' · 暖烛微光';
    document.querySelectorAll('[data-base]').forEach(b=>{b.classList.toggle('active',b.dataset.base===state.base);b.setAttribute('aria-pressed',String(b.dataset.base===state.base));});$('wishDisplay').textContent=state.wish;
  }
  function resize(){const b=host.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setSize(b.width,b.height);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);build();resize();
  function updateLight(t){
    const eased=burn*burn*(3-2*burn), flicker=1+Math.sin(t*.008)*.035+Math.sin(t*.019)*.018;
    const energy=eased*state.brightness*flicker;
    light.intensity=14*energy;
    bounce.intensity=1.4*energy;
    flame.visible=glow.visible=burn>.001;
    flame.scale.set(.045*Math.sqrt(eased),.11*eased*flicker,.045*Math.sqrt(eased));
    flame.position.y=flame.userData.wickY+.075*eased;
    glow.position.copy(flame.position);
    flame.material.opacity=Math.min(1,burn*3);
    glow.material.opacity=.25*energy;
    wickMaterial.emissiveIntensity=lit?eased*.45:Math.sin(burn*Math.PI)*.9;
    goldMaterial.envMapIntensity=.08+.95*energy;
    blackMaterial.envMapIntensity=.08+1.2*energy;
    glassMaterial.envMapIntensity=.08+1.2*energy;
    if(glassShader)glassShader.uniforms.candleScatter.value=energy;
  }
  function animate(t){if(stopped)return;frame=requestAnimationFrame(animate);const dt=lastTime===null?0:Math.min((t-lastTime)/1000,.1);lastTime=t;const previousBurn=burn;burn=lit?Math.min(1,burn+dt/1.6):Math.max(0,burn-dt/1.3);if(previousBurn!==burn&&(burn===0||burn===1))$('status').textContent=lit?'烛光已点亮。':'烛火已熄灭。';if(dedicated&&lit&&previousBurn<1&&burn===1&&!lampConfirmTimer)lampConfirmTimer=setTimeout(()=>{if(stopped)return;$('lampConfirm').hidden=false;$('lampConfirmOk').focus()},1000);controls.autoRotate=rotating;controls.update();updateLight(t);renderer.render(scene,camera);}
  frame=requestAnimationFrame(animate);
  document.querySelectorAll('[data-shade]').forEach(b=>b.onclick=()=>{shadeColors[state.shade]=state.shadeColor;state.shade=b.dataset.shade;state.shadeColor=shadeColors[state.shade]||defaults.shadeColor;build();});
  document.querySelectorAll('[data-base]').forEach(b=>b.onclick=()=>{state.base=b.dataset.base;build();});
  for(const key of ['baseSize','baseHeight'])$(key).oninput=()=>{state[key]=+$(key).value;build();};
  // Do not rebuild or reset the native color picker while it is open.
  const changeGlassColor=()=>{state.shadeColor=$('shadeColor').value;shadeColors[state.shade]=state.shadeColor;glassMaterial.attenuationColor.set(state.shadeColor);};
  $('shadeColor').oninput=changeGlassColor;$('shadeColor').onchange=changeGlassColor;
  $('brightness').oninput=()=>{state.brightness=+$('brightness').value;$('brightnessOut').textContent=Math.round(state.brightness*100)+'%';};
  $('wish').oninput=()=>{$('wishDisplay').textContent=state.wish=$('wish').value;};
  $('rotate').onclick=()=>{rotating=!rotating;$('rotate').textContent=rotating?'暂停旋转':'自动旋转';$('rotate').setAttribute('aria-pressed',String(rotating));};
  function lightButton(){$('light').textContent=dedicated?(lit?'已点灯':'点灯'):(lit?'熄灯':'点灯');$('light').disabled=dedicated&&lit;$('light').setAttribute('aria-pressed',String(lit));}
  lightButton();
  const closeLampConfirm=()=>{$('lampConfirm').hidden=true};
  $('lampConfirmClose').onclick=closeLampConfirm;
  $('lampConfirmOk').onclick=closeLampConfirm;
  $('lampConfirm').onclick=event=>{if(event.target===$('lampConfirm'))closeLampConfirm()};
  $('light').onclick=()=>{
    if(dedicated&&lit)return;
    lit=!lit;lightButton();$('status').textContent=lit?'烛芯正在点燃……':'火苗正在熄灭……';
    if(dedicated&&lit){
      try{parent.memorialLampBridge.recordLamp(memorialId)}
      catch(_){parent.postMessage({type:'memorial-offering',offering:'lamp'},'*')}
    }
  };
  $('memorialWishForm').onsubmit=event=>{
    event.preventDefault();
    if(!dedicated)return;
    const input=$('memorialWish'),message=input.value.trim();
    if(!message)return;
    parent.postMessage({type:'memorial-wish',message},location.origin==='null'?'*':location.origin);
    input.value='';$('status').hidden=false;$('status').textContent='心愿已送至留言板。';
  };
  $('reset').onclick=()=>{state={...defaults,base:memorialId==='zhang-wenhua'?'lotus':defaults.base,shade:memorialId==='zhang-wenhua'?'amber':dedicated?'cloud':defaults.shade};for(const shade in shadeColors)delete shadeColors[shade];shadeColors[state.shade]=state.shadeColor;lit=!dedicated;lightButton();build();};
  $('save').onclick=()=>{try{localStorage.setItem('annian-glass-lamp-v2',JSON.stringify(state));$('status').textContent='已保存这盏灯与寄语。';}catch(_){$('status').textContent='浏览器未允许保存。';}};
  addEventListener('pagehide',()=>{stopped=true;clearTimeout(lampConfirmTimer);cancelAnimationFrame(frame);observer.disconnect();controls.dispose();clearModel();bump.dispose();transmissionMap.dispose();glowMap.dispose();contactShadowMap.dispose();contactShadow.geometry.dispose();contactShadow.material.dispose();environment.dispose();floor.geometry.dispose();floor.material.dispose();enclosure.geometry.dispose();enclosure.material.dispose();skirting.children.forEach(o=>o.geometry.dispose());trimMaterial.dispose();renderer.dispose();});
})();
