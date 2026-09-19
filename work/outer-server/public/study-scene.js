/* Complete procedural study scene; no original assets are deleted. */
(() => {
 if(new URLSearchParams(parent.location.search).get('scene')!=='study')return;
 const wait=setInterval(()=>{
  if(!window.retroWorkstation)return;
  clearInterval(wait);
  if(new URLSearchParams(parent.location.search).get('assets')==='original')return;
  if(new URLSearchParams(parent.location.search).get('scene')==='workstation')return;
  const T=window.RetroThree,app=window.retroApplication,previous=window.retroWorkstation;
  app.world.environment.bakedModel.getModel().visible=false;
  app.world.decor.bakedModel.getModel().visible=false;
  const keep=['CRT monitor','104-key keyboard','Wired mouse','Mouse cord','Keyboard cord'];
  previous.group.children.forEach(o=>{o.visible=keep.includes(o.name);});
  const scene=new T.Group();scene.name='Unified grey study';app.scene.add(scene);
  const mat=(color,roughness=.85)=>{const m=new T.Standard({color,roughness,emissive:color,emissiveIntensity:.05});m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m;};
  const grey=mat('#868d90'),pale=mat('#b3b8ba'),steel=mat('#50595c'),wood=mat('#535552'),paper=mat('#d8d7ce'),black=mat('#303637');
  app.scene.background=mat('#bfc2c2').color.clone();
  function box(p,n,w,h,d,x,y,z,m=grey){const g=new T.Box(w,h,d,3,3,3),r=Math.min(12,w/4,h/4,d/4),a=g.attributes.position;for(let i=0;i<a.count;i++){const q=new T.Vector(a.getX(i),a.getY(i),a.getZ(i)),c=new T.Vector(Math.max(-w/2+r,Math.min(w/2-r,q.x)),Math.max(-h/2+r,Math.min(h/2-r,q.y)),Math.max(-d/2+r,Math.min(d/2-r,q.z)));q.sub(c).normalize().multiplyScalar(r).add(c);a.setXYZ(i,q.x,q.y,q.z);}g.computeVertexNormals();const mesh=new T.Mesh(g,m);mesh.name=n;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;p.add(mesh);return mesh;}
  function ell(p,n,x,y,z,sx,sy,sz,m=grey,segments=24){const mesh=new T.Mesh(new T.Sphere(1,segments,12),m);mesh.name=n;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;p.add(mesh);return mesh;}
  function rod(p,a,b,r,m=steel){const mid=new T.Vector(...a).add(new T.Vector(...b)).multiplyScalar(.5),delta=new T.Vector(...b).sub(new T.Vector(...a));const o=box(p,'Structural bar',r,r,delta.length(),mid.x,mid.y,mid.z,m);o.quaternion.setFromUnitVectors(new T.Vector(0,0,1),delta.normalize());return o;}
  function tube(p,n,profile,x,y,z,m,segments=40){const v=[],idx=[];profile.forEach(([r,h])=>{for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;v.push(Math.cos(a)*r,h,Math.sin(a)*r);}});for(let i=0;i<profile.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;idx.push(a,b,a+1,b,b+1,a+1);}const g=new T.Buffer();g.setAttribute('position',new T.Attribute(v,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,m);mesh.name=n;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;p.add(mesh);return mesh;}
  function text(p,s,w,h,x,y,z,rx=0,color='#40474b',background=null){const c=document.createElement('canvas');c.width=512;c.height=256;const q=c.getContext('2d');if(background){q.fillStyle=background;q.fillRect(0,0,512,256);}q.fillStyle=color;q.font='bold 64px Georgia';q.textAlign='center';q.textBaseline='middle';q.fillText(s,256,128);const tx=new T.Texture(c);tx.encoding=T.sRGB;tx.needsUpdate=true;const mesh=new T.Mesh(new T.Plane(w,h),new T.Basic({map:tx,transparent:true,depthWrite:false}));mesh.position.set(x,y,z);mesh.rotation.x=rx;p.add(mesh);return mesh;}
  // A single softly lit material palette, with a new floor and desk.
  box(scene,'Ground',700000,40,700000,0,-3370,0,mat('#adb0b0'));
  box(scene,'Solid desktop',6500,150,3000,-300,-525,100,wood);
  for(const x of [-3370,2770])for(const z of [-1210,1400])box(scene,'Square steel leg',150,2760,150,x,-1980,z,steel);
  box(scene,'Rear apron',6180,230,80,-300,-715,-1260,steel);
  for(const x of [-3260,2660])box(scene,'Side apron',80,200,2630,x,-710,90,steel);
  // Left drawer cabinet has real interiors and two independently moving trays.
  box(scene,'Cabinet left',60,1320,1450,-3300,-1230,475,grey);
  box(scene,'Cabinet right',60,1320,1450,-1890,-1230,475,grey);
  box(scene,'Cabinet rear',1440,1320,50,-2595,-1230,-230,grey);
  box(scene,'Cabinet bottom',1440,60,1450,-2595,-1875,475,grey);
  const drawers=[];
  for(let i=0;i<2;i++){
   const drawer=new T.Group();drawer.name=`Drawer ${i+1}`;drawer.position.set(-2595,-875-i*620,420);scene.add(drawer);
   box(drawer,'Drawer front',1350,570,70,0,0,770,grey);
   box(drawer,'Drawer bottom',1290,35,1290,0,-263,100,wood);
   for(const x of [-635,635])box(drawer,'Drawer side',35,465,1290,x,-25,100,grey);
   box(drawer,'Drawer back',1290,465,35,0,-25,-530,grey);
   box(drawer,'Handle',370,35,65,0,30,839,steel);
   for(const x of [-170,170])box(drawer,'Handle mount',30,55,60,x,30,807,steel);
   box(drawer,'Stored notebook',540,55,610,-180,-216,200,paper);
   drawers.push({group:drawer,open:false,anchor:new T.Vector(0,30,849)});
  }
  // Rebuilt low CRT and horizontal computer chassis matching the reference.
  const crt=previous.group.getObjectByName('CRT monitor');
  box(scene,'Desktop computer base',1910,180,1210,0,-357,-190,grey);
  box(scene,'Chassis face',1860,149,35,0,-350,424,pale);
  box(scene,'Floppy drive recess',650,69,12,414,-336,445,steel);
  box(scene,'Floppy slot',480,13,14,390,-328,453,black);
  box(scene,'Eject button',64,16,17,685,-358,455,grey);
  box(scene,'Power key',72,42,15,-735,-338,453,grey);
  ell(scene,'Chassis LED',-650,-337,456,7,7,4,new T.Basic({color:'#9ecb8d'}));
  text(scene,'RETRO / 2001',320,45,-360,-338,455);
  // Mouse pad is separate from the work surface.
  box(scene,'Mouse mat',530,9,660,865,-444,1250,mat('#3e515c'));
  // Office chair: upholstered seat, broad back, column, five-star caster base.
  const chair=new T.Group();chair.name='Office chair';chair.position.set(520,0,2530);chair.rotation.y=-.22;scene.add(chair);
  ell(chair,'Seat cushion',0,-1760,0,660,135,565,mat('#7e6960'));
  box(chair,'Seat support',1020,80,870,0,-1870,0,steel);
  rod(chair,[0,-3240,0],[0,-1850,0],125,steel);
  rod(chair,[0,-1950,370],[0,-920,460],105,steel);
  ell(chair,'Back cushion',0,-1030,455,620,600,120,mat('#7e6960'));
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5,x=Math.cos(a)*720,z=Math.sin(a)*720;rod(chair,[0,-3050,0],[x,-3200,z],95);ell(chair,'Caster',x,-3270,z,90,70,62,black);}
  // Open waste basket with crumpled low-poly paper.
  const bin=new T.Group();bin.name='Wastebasket';bin.position.set(1850,-3320,250);scene.add(bin);
  box(bin,'Bin floor',610,50,610,0,25,0,black);
  for(const x of [-315,315])box(bin,'Bin side',40,900,670,x,465,0,steel);
  for(const z of [-315,315])box(bin,'Bin side',590,900,40,0,465,z,steel);
  for(const x of [-325,325])box(bin,'Bin rim',62,38,705,x,900,0,black);
  for(const z of [-325,325])box(bin,'Bin rim',650,38,62,0,900,z,black);
  [[-150,780,40],[110,820,-80],[35,675,100]].forEach(([x,y,z],i)=>ell(bin,'Crumpled paper',x,y,z,150,140,145,paper,5));
  ell(scene,'Discarded paper',2340,-3250,700,140,110,125,paper,5);
  // Desk lamp with an actual warm spotlight and a button on its base.
  const lamp=new T.Group();lamp.name='Interactive desk lamp';lamp.position.set(-2590,-447,-755);scene.add(lamp);
  ell(lamp,'Lamp base',0,35,0,330,40,260,steel);
  rod(lamp,[0,45,0],[0,780,-80],48);
  rod(lamp,[0,780,-80],[320,1250,50],48);
  ell(lamp,'Elbow joint',0,780,-80,80,80,60,grey);
  const shadeMat=mat('#657273');shadeMat.side=2;
  tube(lamp,'Open lamp shade',[[240,0],[240,20],[110,255],[0,270]],320,1000,50,shadeMat);
  const bulb=ell(lamp,'Warm bulb',320,1050,50,80,40,80,new T.Standard({color:'#f4ead0',emissive:'#ffc779',emissiveIntensity:0}));
  const switchMesh=box(lamp,'Lamp toggle switch',100,30,72,115,76,126,pale);
  const spot=new T.Spot('#ffdba0',0,3500,.80,.65,1);spot.position.set(-2270,570,-705);spot.target.position.set(-2070,-447,400);spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.0004;scene.add(spot);scene.add(spot.target);
  let lampOn=false;
  function toggleLamp(){lampOn=!lampOn;spot.intensity=lampOn?3.8:0;bulb.material.emissiveIntensity=lampOn?2:0;switchMesh.rotation.x=lampOn?-.16:.16;lampButton.setAttribute('aria-pressed',String(lampOn));}
  // Books stacked beside the lamp, and handwritten open exercise books.
  const colors=['#667d80','#7a615d','#8b8873'];
  for(let i=0;i<3;i++){const b=new T.Group();b.position.set(-1740,-432+i*105,-790);b.rotation.y=.07*(i-1);scene.add(b);box(b,'Book pages',600,75,700,0,40,0,paper);for(const y of [0,83])box(b,'Book cover',635,12,735,0,y,0,mat(colors[i]));box(b,'Book spine',18,95,735,-310,40,0,mat(colors[i]));}
  function exercise(x,z,rot){const g=new T.Group();g.name='Open exercise book';g.position.set(x,-438,z);g.rotation.y=rot;scene.add(g);box(g,'Open cover',1170,9,740,0,0,0,mat('#817b70'));for(const side of [-1,1]){box(g,'Open page',567,9,709,side*291,10,0,paper);for(let i=0;i<12;i++)box(g,'Ruled line',487,1,2,side*291,16,-289+i*48,mat('#a2a8aa'));for(let i=0;i<7;i++)box(g,'Pencil writing',110+(i%3)*58,1,3,side*291-60,17,-281+i*48,mat('#737777'));}box(g,'Fold',6,11,710,0,10,0,grey);}
  exercise(-2220,610,-.20);exercise(-1380,1110,.11);
  rod(scene,[-2860,-418,1140],[-2100,-418,1250],14,mat('#ac8b52'));
  // Right-side binders and an opened red cola can.
  for(let i=0;i<3;i++){const f=new T.Group();f.position.set(1810+i*245,-447,-620);f.rotation.z=(i===0?.08:0);scene.add(f);box(f,'Folder paper',170,890,650,0,465,0,paper);for(const x of [-99,99])box(f,'Folder cover',20,950,720,x,475,0,mat(['#5b666d','#66615d','#738080'][i]));box(f,'Folder spine',210,950,20,0,475,355,mat(['#5b666d','#66615d','#738080'][i]));text(f,'ARCHIVE',150,52,0,650,367);box(f,'Spine label',118,230,2,0,435,367,paper);ell(f,'Binder finger hole',0,145,369,40,40,3,black);}
  const can=new T.Group();can.name='Opened cola can';can.position.set(2250,-447,1060);scene.add(can);
  tube(can,'Red aluminium body',[[0,0],[110,0],[124,25],[131,60],[131,405],[114,443],[0,443]],0,0,0,mat('#943d3b',.35));
  tube(can,'Can rim',[[108,443],[121,443],[124,454],[110,459],[108,443]],0,0,0,pale);
  ell(can,'Open drinking hole',0,448,45,43,3,65,black);
  const tab=tube(can,'Raised pull tab',[[24,0],[37,0],[37,7],[24,7],[24,0]],0,455,-32,pale,24);tab.scale.z=1.5;tab.rotation.x=-.22;
  text(can,'Cola',204,174,0,255,132,0,'#eee6d9');
  text(can,'CLASSIC',150,44,0,112,133,0,'#eee6d9');
  // Shadow receiving ground, all new opaque assets share the same lighting.
  previous.group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  app.renderer.instance.shadowMap.enabled=true;app.renderer.instance.shadowMap.type=3;
  const sun=new T.Directional('#fff8ed',1.25);sun.position.set(-6000,9500,5500);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6500,right:6500,top:6500,bottom:-6500,near:100,far:23000});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0002;sun.shadow.normalBias=8;sun.shadow.radius=5;sun.shadow.blurSamples=12;scene.add(sun);
  const fill=new T.Directional('#dce6ef',.65);fill.position.set(5000,5000,-4000);scene.add(fill);
  // Projected accessible hit targets track their physical switches and handles.
  const layer=document.createElement('div');layer.id='study-controls';document.body.appendChild(layer);
  const targets=[];
  function hit(label,parent,anchor,action,w,h){const b=document.createElement('button');b.setAttribute('aria-label',label);b.title=label;Object.assign(b.style,{position:'fixed',width:w+'px',height:h+'px',background:'transparent',border:'0',borderRadius:'5px',cursor:'pointer',zIndex:'25',padding:'0'});b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('mousedown',e=>e.stopPropagation());b.addEventListener('click',e=>{e.stopPropagation();action();});b.addEventListener('mouseenter',()=>b.style.outline='1px solid #f1e8c0aa');b.addEventListener('mouseleave',()=>b.style.outline='');layer.appendChild(b);targets.push({b,parent,anchor});return b;}
  const lampButton=hit('台灯开关',lamp,new T.Vector(115,91,126),toggleLamp,38,32);lampButton.setAttribute('aria-pressed','false');
  drawers.forEach((d,i)=>{d.button=hit(`开合第${i+1}个抽屉`,d.group,d.anchor,()=>{d.open=!d.open;d.button.setAttribute('aria-expanded',String(d.open));},76,35);d.button.setAttribute('aria-expanded','false');});
  const monitor=app.camera.keyframes.monitor;if(monitor.origin)monitor.origin.y=450;
  const idle=app.camera.keyframes.idle;idle.origin.set(-8500,5200,12500);idle.position.copy(idle.origin);idle.focalPoint.set(-300,-1100,200);idle.update=()=>{};
  sun.shadow.radius=18;sun.shadow.blurSamples=16;
  const cleanUI=document.createElement('style');cleanUI.textContent='body:not(.pixel-loading) #ui-app{visibility:hidden}';document.head.appendChild(cleanUI);
  function update(){for(const d of drawers)d.group.position.z+=(420+(d.open?980:0)-d.group.position.z)*.12;for(const t of targets){const p=t.parent.localToWorld(t.anchor.clone()).project(app.camera.instance);t.b.style.left=(p.x*.5+.5)*innerWidth-parseFloat(t.b.style.width)/2+'px';t.b.style.top=(-p.y*.5+.5)*innerHeight-parseFloat(t.b.style.height)/2+'px';t.b.style.display=(p.z<1&&p.z>-1&&!document.body.classList.contains('pixel-loading'))?'block':'none';}requestAnimationFrame(update);}update();
  window.studyScene={group:scene,drawers,toggleLamp,get lampOn(){return lampOn;},lampButton};
 },50);
})();
