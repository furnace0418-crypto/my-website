/* Restores the original assets, correcting their import unit mismatch only. */
(() => {
 const requested=new URLSearchParams(parent.location.search).get('scene');
 if(['study','workstation'].includes(requested))return;
 const wait=setInterval(()=>{
  const app=window.retroApplication;
  if(!app?.world?.monitorScreen)return;
  clearInterval(wait);
  const model=app.world.computerSetup.bakedModel.getModel();
  // Computer geometry is authored at 1/100 the scale of the decor/environment.
  model.scale.setScalar(100);model.visible=true;model.updateMatrixWorld(true);
  app.world.environment.bakedModel.getModel().visible=true;
  app.world.decor.bakedModel.getModel().visible=true;
  window.originalSceneRestored={computer:model,screen:app.world.monitorScreen};
  // The nested desktop is a separate origin. Give its document a content version so
  // an already-cached iframe cannot keep showing outdated news/template text.
  const camera=app.camera;
  const cameraEase=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const baseTransition=camera.transition.bind(camera);
  let deskTransitionAllowed=false;
  camera.transition=(name,...args)=>{
   const state=camera.targetKeyframe||camera.currentKeyframe;
   if(name==='desk'&&state==='idle'&&!deskTransitionAllowed)return;
   return baseTransition(name,...args);
  };
  const moveToDesk=duration=>{deskTransitionAllowed=true;camera.transition('desk',duration,cameraEase);deskTransitionAllowed=false;};
  function overDeskTop(x,y){
   const points=[[-3500,-430,-1450],[3200,-430,-1450],[3200,-430,1600],[-3500,-430,1600]].map(([a,b,c])=>{
    const p=new window.RetroThree.Vector(a,b,c).project(camera.instance);
    return[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];
   });
   let sign=0;
   for(let i=0;i<4;i++){
    const a=points[i],b=points[(i+1)%4],cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
    if(Math.abs(cross)<.01)continue;
    if(sign&&Math.sign(cross)!==sign)return false;
    sign=Math.sign(cross);
   }
   return true;
  }
  const desktopFrame=app.cssScene.children[0]?.element?.querySelector('iframe');
  if(desktopFrame){
   const desktopUrl=new URL(desktopFrame.src);
   if(desktopUrl.searchParams.get('contentVersion')!=='20260926-5'){
    desktopUrl.searchParams.set('contentVersion','20260926-5');
    desktopFrame.src=desktopUrl.toString();
   }
   // At wide and desk distance the first screen click advances the camera only;
   // the embedded desktop becomes interactive after the monitor view is reached.
   const screenActivator=document.createElement('button');
   screenActivator.type='button';screenActivator.setAttribute('aria-label','靠近电脑屏幕');
   Object.assign(screenActivator.style,{position:'absolute',inset:'0',zIndex:'5',border:'0',padding:'0',background:'transparent',cursor:'zoom-in'});
   desktopFrame.parentElement.appendChild(screenActivator);
   for(const type of ['pointerdown','mousedown'])screenActivator.addEventListener(type,e=>e.stopPropagation());
   screenActivator.addEventListener('click',e=>{
    e.stopPropagation();
    if(app.camera.freeCam)return;
    const state=app.camera.targetKeyframe||app.camera.currentKeyframe;
    if(state==='idle')moveToDesk(1050);
    else if(state==='desk')camera.transition('monitor',900,cameraEase);
   });
   const syncScreenActivator=()=>{
    const state=app.camera.targetKeyframe||app.camera.currentKeyframe;
    screenActivator.style.pointerEvents=state==='monitor'||document.body.classList.contains('pixel-loading')?'none':'auto';
    requestAnimationFrame(syncScreenActivator);
   };syncScreenActivator();
  }
  const originalTrigger=camera.trigger.bind(camera);
  camera.trigger=(name,...args)=>{
   if(name==='enterMonitor'||name==='leftMonitor')return;
   return originalTrigger(name,...args);
  };
  if(!window.whiteComputerEnabled){
   const screen=app.world.monitorScreen;
   // The full monitor face remains clickable, but pointer proximity no longer
   // changes the camera.
   function inside(x,y){
    const sideMargin=275,topMargin=90,bottomMargin=50;
    const left=-screen.screenSize.x/2-sideMargin,right=screen.screenSize.x/2+sideMargin;
    const top=screen.screenSize.y/2+topMargin,bottom=-screen.screenSize.y/2-bottomMargin;
    const corners=[[left,bottom],[right,bottom],[right,top],[left,top]].map(([a,b])=>{
     const p=new window.RetroThree.Vector(a,b,0);
     p.applyEuler(screen.rotation).add(screen.position).project(camera.instance);
     return [(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];
    });
    let sign=0;
    for(let i=0;i<4;i++){
     const a=corners[i],b=corners[(i+1)%4],cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
     if(Math.abs(cross)<.01)continue;
     if(sign&&Math.sign(cross)!==sign)return false;
     sign=Math.sign(cross);
    }
    return true;
   }
   document.addEventListener('mousedown',e=>{
    if(e.button!==0||e.target.closest?.('#custom-fixed-controls,button,input')||document.body.classList.contains('pixel-loading')||camera.freeCam)return;
    const state=camera.targetKeyframe||camera.currentKeyframe;
    if(state==='idle'&&overDeskTop(e.clientX,e.clientY)){e.stopImmediatePropagation();moveToDesk(1050);}
    else if(state==='desk'&&inside(e.clientX,e.clientY)){e.stopImmediatePropagation();camera.transition('monitor',900,cameraEase);}
    else if(state==='monitor'){e.stopImmediatePropagation();moveToDesk(900);}
   },true);
  }
 },50);
})();

/* Procedural Three.js workstation. Original GLBs remain untouched. */
(() => {
  const requestedScene=new URLSearchParams(parent.location.search).get('scene');
  if(!['workstation','study'].includes(requestedScene))return;
  const timer = setInterval(() => {
    const app = window.retroApplication;
    const T = window.RetroThree;
    if (!T || !app?.world?.monitorScreen) return;
    clearInterval(timer);
    let original = false;
    try { original = new URLSearchParams(parent.location.search).get('assets') === 'original'; } catch (_) {}
    const group = new T.Group();
    group.name = 'Retro workstation • 2001';
    const oldComputer = app.world.computerSetup.bakedModel.getModel();
    const cup = app.world.decor.bakedModel.getModel().getObjectByName('coffee');
    const binders = ['binder_1','binder_2'].map(name=>app.world.decor.bakedModel.getModel().getObjectByName(name)).filter(Boolean);
    const steam = app.world.coffeeSteam.model.mesh;
    const screen = app.world.monitorScreen;
    const screenOrigin = screen.position.clone();
    const screenParts = app.scene.children.filter(mesh=>mesh.isMesh && mesh.geometry?.type==='PlaneGeometry' && mesh.position.z>=250 && mesh.position.z<=355 && mesh.position.y>=430 && mesh.position.y<=1470).map(mesh=>({mesh,position:mesh.position.clone()}));
    const cssParts = app.cssScene.children.map(mesh=>({mesh,position:mesh.position.clone()}));
    const monitorView = app.camera.keyframes.monitor;
    const cameraPosition = monitorView.position.clone(), cameraFocus = monitorView.focalPoint.clone();
    const materials = {};
    function material(color, roughness = .78) {
      const key = `${color}/${roughness}`;
      if (!materials[key]) {
        const m=new T.Standard({ color, roughness, emissive: color, emissiveIntensity: .07 });
        m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();materials[key]=m;
      }
      return materials[key];
    }
    const ivory = material('#989c9e'), light = material('#b3b6b8'), dark = material('#555a5d');
    const charcoal = material('#303436'), seam = material('#73797d');
    const geometries = new Map();
    function rounded(w, h, d, radius = 8) {
      const key = [w,h,d,radius].join('/');
      if (geometries.has(key)) return geometries.get(key);
      const geometry = new T.Box(w,h,d,6,6,6);
      const p = geometry.attributes.position;
      const r = Math.min(radius,w/2,h/2,d/2);
      for (let i=0;i<p.count;i++) {
        const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
        const cx=Math.max(-w/2+r,Math.min(w/2-r,x));
        const cy=Math.max(-h/2+r,Math.min(h/2-r,y));
        const cz=Math.max(-d/2+r,Math.min(d/2-r,z));
        const n=new T.Vector(x-cx,y-cy,z-cz).normalize().multiplyScalar(r);
        p.setXYZ(i,cx+n.x,cy+n.y,cz+n.z);
      }
      geometry.computeVertexNormals();
      geometries.set(key,geometry);
      return geometry;
    }
    function box(parent,name,w,h,d,x,y,z,mat=ivory,r=8) {
      const mesh=new T.Mesh(rounded(w,h,d,r),mat);
      mesh.name=name; mesh.position.set(x,y,z); parent.add(mesh); return mesh;
    }
    function sphere(parent,name,x,y,z,sx,sy,sz,mat) {
      const mesh=new T.Mesh(new T.Sphere(1,32,20),mat);
      mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
    }
    function label(parent,text,w,h,x,y,z,rx=0,color='#53594e',bg=null) {
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
      const ctx=canvas.getContext('2d');
      if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);}
      ctx.fillStyle=color;ctx.font='500 54px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
      const texture=new T.Texture(canvas);texture.encoding=T.sRGB;texture.needsUpdate=true;
      const mesh=new T.Mesh(new T.Plane(w,h),new T.Basic({map:texture,transparent:true,depthWrite:false}));
      mesh.position.set(x,y,z);mesh.rotation.x=rx;parent.add(mesh);return mesh;
    }
    // A dark desk pad covers the old baked computer's solid-black contact silhouette.
    box(group,'Charcoal desk pad',2220,6,2400,0,-448,365,material('#353632'),20);
    // Existing screen plane: (0,950,255), tilted backwards by three degrees.
    const crt=new T.Group();crt.name='CRT monitor';crt.position.copy(app.world.monitorScreen.position);crt.rotation.copy(app.world.monitorScreen.rotation);group.add(crt);
    crt.position.y-=500;
    const shell=box(crt,'Deep tapered CRT housing',1980,1380,1100,0,-25,-650,ivory,65);
    const positions=shell.geometry.clone();shell.geometry=positions;
    const pp=positions.attributes.position;
    for(let i=0;i<pp.count;i++) { const taper=1-.19*Math.max(0,(-pp.getZ(i)+100)/650);pp.setX(i,pp.getX(i)*taper);pp.setY(i,pp.getY(i)*taper); }
    positions.computeVertexNormals();
    // Front bezel leaves the live HTML desktop unobstructed.
    box(crt,'Left bezel',145,1170,165,-916,8,89,light,30);
    box(crt,'Right bezel',145,1170,165,916,8,89,light,30);
    box(crt,'Top bezel',1960,130,165,0,574,89,light,30);
    box(crt,'Lower control bezel',1960,207,165,0,-618,89,light,30);
    box(crt,'Left inner gasket',17,1034,24,-844,0,111,charcoal,3);
    box(crt,'Right inner gasket',17,1034,24,844,0,111,charcoal,3);
    box(crt,'Upper inner gasket',1700,17,24,0,512,111,charcoal,3);
    box(crt,'Lower inner gasket',1700,17,24,0,-512,111,charcoal,3);
    label(crt,'RETRO  /  2001',330,46,-660,-598,174);
    label(crt,'MULTISCAN  17',270,32,0,-566,174);
    for(let i=0;i<5;i++) box(crt,'Monitor adjustment button',54,19,16,-160+i*80,-648,182,seam,8);
    sphere(crt,'Power button',796,-632,174,33,33,12,ivory);
    sphere(crt,'Green power LED',719,-633,178,8,8,5,new T.Basic({color:'#8cc179'}));
    label(crt,'−   +    ◁   ▷',360,22,0,-611,175);
    for(let i=0;i<17;i++) {
      box(crt,'Right housing ventilation',7,10,150,981,-250+i*28,-190,dark,2);
      box(crt,'Top housing ventilation',10,6,100,-650+i*80,665,-176,seam,2);
    }
    box(group,'Low rectangular CRT foot',1340,90,740,0,-397,-45,ivory,24);
    box(group,'Pedestal lower seam',1280,14,690,0,-438,-45,seam,8);
    sphere(group,'Low swivel hinge',0,-318,-95,430,60,280,seam);
    box(group,'Short integrated monitor support',710,75,420,0,-284,-100,ivory,20);
    // Tower occupies the former two-binder area, front aligned beside the CRT.
    const tower=new T.Group();tower.name='Grey desktop tower';tower.position.set(1730,-447,-50);group.add(tower);
    box(tower,'Steel chassis',760,1510,1250,0,760,0,ivory,18);
    box(tower,'Front panel shadow gap',730,1465,12,0,757,630,dark,6);
    box(tower,'Molded front panel',704,1440,40,0,757,650,light,12);
    box(tower,'Side panel seam',3,1340,1090,382,758,-8,seam,1);
    for(const y of [245,1255])for(const z of [-510,465])sphere(tower,'Case screw',385,y,z,3,8,8,dark);
    for(const x of [-260,260])for(const z of [-410,410])box(tower,'Rubber case foot',95,14,95,x,6,z,charcoal,5);
    box(tower,'Floppy drive bay',586,155,13,0,1292,679,ivory,4);
    box(tower,'3.5 inch drive slot',405,16,6,-30,1305,688,charcoal,2);
    box(tower,'Floppy eject',60,21,12,227,1257,692,seam,3);
    box(tower,'Optical drive bay',586,185,13,0,1095,679,ivory,4);
    box(tower,'CD tray border',528,69,5,0,1124,689,seam,3);
    box(tower,'CD tray',514,57,7,0,1124,694,light,3);
    label(tower,'CD-ROM  12x',245,28,-101,1125,700);
    box(tower,'CD eject',55,17,10,232,1050,693,seam,3);
    sphere(tower,'Headphone socket',-236,1050,692,12,12,4,charcoal);
    box(tower,'Spare drive bay',586,120,12,0,920,679,ivory,4);
    box(tower,'Status inset',227,84,8,-134,662,680,charcoal,5);
    label(tower,'166',178,62,-134,663,688,0,'#a9d688');
    sphere(tower,'Tower power button',183,656,684,39,39,10,ivory);
    sphere(tower,'Tower reset',183,543,685,17,17,7,seam);
    sphere(tower,'Tower power LED',96,747,686,8,8,5,new T.Basic({color:'#90ba74'}));
    sphere(tower,'Tower activity LED',140,747,686,7,7,5,new T.Basic({color:'#d4ae65'}));
    label(tower,'POWER',116,22,183,594,686);
    label(tower,'RETRO SYSTEMS',330,35,-90,419,686);
    for(let i=0;i<6;i++)box(tower,'Front ventilation grille',586,13,6,0,141+i*32,682,dark,3);
    for(let row=0;row<7;row++)for(let col=0;col<9;col++)box(tower,'Side cooling slot',5,8,37,383,230+row*25,-175+col*48,dark,2);
    // A slim spiral notebook leans towards the tower in the gap beside the CRT.
    const notebook=new T.Group();notebook.name='Leaning spiral notebook';notebook.position.set(1146,-439,275);notebook.rotation.z=-.14;notebook.rotation.y=-.07;group.add(notebook);
    const cover=material('#434d56'),paper=material('#c4c6c5');
    box(notebook,'Notebook page block',74,815,427,0,421,0,paper,4);
    for(const x of [-45,45])box(notebook,'Notebook board cover',12,850,456,x,425,0,cover,4);
    for(let i=0;i<21;i++)box(notebook,'Page edge',1,1,399,38,40+i*37,0,seam,0);
    const title=label(notebook,'NOTES',275,64,53,543,0);title.rotation.y=Math.PI/2;
    for(let i=0;i<18;i++) {
      const y=34+i*45;
      box(notebook,'Spiral binding crosspiece',120,7,8,0,y,237,seam,3);
      for(const x of [-57,57])box(notebook,'Spiral binding return',7,7,36,x,y,221,seam,3);
    }
    // Full-size beige keyboard, with separated function/navigation/numeric blocks.
    const keyboard=new T.Group();keyboard.name='104-key keyboard';keyboard.position.set(-185,-389,1240);keyboard.rotation.x=.055;group.add(keyboard);
    box(keyboard,'Keyboard bottom seam',1730,54,535,0,-9,0,seam,28);
    box(keyboard,'Keyboard upper case',1730,58,535,0,18,0,ivory,28);
    box(keyboard,'Inset key bed',1650,12,462,0,48,-6,dark,12);
    function key(text,x,z,w=66,mat=light) {
      box(keyboard,`Key ${text}`,w,35,62,x,67,z,mat,7);
      if(text) label(keyboard,text,w*.85,19,x,85,z,-Math.PI/2);
    }
    const rows=[['Esc','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'],['`','1','2','3','4','5','6','7','8','9','0','−','=','←'],['Tab','Q','W','E','R','T','Y','U','I','O','P','[',']'],['Caps','A','S','D','F','G','H','J','K','L',';','\'','Enter'],['Shift','Z','X','C','V','B','N','M',',','.','/','Shift']];
    rows.forEach((row,r)=>row.forEach((text,c)=>key(text,-785+c*74+(r===2?12:r===3?24:r===4?42:0),-201+r*79,66,text==='Esc'?ivory:light)));
    key('Ctrl',-773,194,88);key('◇',-684,194);key('Alt',-601,194);key('',-280,194,530);key('Alt',39,194);key('Ctrl',120,194,90);
    [['Ins','Home','PgUp'],['Del','End','PgDn']].forEach((row,r)=>row.forEach((t,c)=>key(t,314+c*73,-122+r*79)));
    key('↑',387,115);['←','↓','→'].forEach((t,c)=>key(t,314+c*73,194));
    [['Num','/','*','−'],['7','8','9','+'],['4','5','6','+'],['1','2','3','↵'],['0','0','.','↵']].forEach((row,r)=>row.forEach((t,c)=>key(t,553+c*72,-122+r*79,63)));
    label(keyboard,'RETRO',160,23,633,52,-219,-Math.PI/2);
    // Wired two-button mouse, divided key shells and a subtle grey cord.
    const mouse=new T.Group();mouse.name='Wired mouse';mouse.position.set(866,-415,1265);mouse.rotation.y=-.08;group.add(mouse);
    sphere(mouse,'Mouse lower shell',0,18,0,127,40,204,seam);
    sphere(mouse,'Mouse upper shell',0,49,0,123,72,198,light);
    box(mouse,'Button dividing seam',4,5,162,0,107,-80,dark,2);
    box(mouse,'Button rear seam',206,4,4,0,107,-1,seam,1);
    function cord(points,name) {
      for(let i=1;i<points.length;i++) {
        const a=new T.Vector(...points[i-1]),b=new T.Vector(...points[i]);const delta=b.clone().sub(a);
        const part=new T.Mesh(rounded(10,10,delta.length()+3,4),charcoal);part.name=name;part.position.copy(a.clone().add(b).multiplyScalar(.5));part.quaternion.setFromUnitVectors(new T.Vector(0,0,1),delta.normalize());group.add(part);
      }
    }
    cord([[865,-406,1070],[882,-421,975],[992,-432,872],[1070,-432,690],[1060,-432,460],[930,-432,300],[610,-432,190]],'Mouse cord');
    cord([[-580,-407,970],[-700,-438,840],[-855,-438,650],[-880,-438,400],[-730,-438,110]],'Keyboard cord');
    // Transparent storage box replaces the cup, not the surrounding stationery.
    const disks=new T.Group();disks.name='Transparent floppy disk box';disks.position.set(1690,-448,940);disks.rotation.y=-.09;group.add(disks);
    const glass=new T.Standard({color:'#bed4d0',roughness:.24,metalness:.05,transparent:true,opacity:.20,depthWrite:false,side:2});
    const rim=new T.Standard({color:'#cad7d0',roughness:.35,transparent:true,opacity:.57,depthWrite:false});
    box(disks,'Storage base',480,20,470,0,12,0,rim,9);
    box(disks,'Transparent front wall',480,215,10,0,122,233,glass,3);
    box(disks,'Transparent left wall',10,225,470,-235,122,0,glass,3);
    box(disks,'Transparent right wall',10,225,470,235,122,0,glass,3);
    box(disks,'Transparent back wall',480,225,10,0,122,-233,glass,3);
    for(const x of [-235,235]) box(disks,'Box top rim',12,12,470,x,235,0,rim,4);
    box(disks,'Front lip',480,12,12,0,235,233,rim,4);
    const lid=new T.Group();lid.name='Raised transparent lid';lid.position.set(0,220,-235);lid.rotation.x=-.20;disks.add(lid);
    box(lid,'Open lid panel',480,420,9,0,210,0,glass,8);
    for(const x of [-235,235]) box(lid,'Lid side rim',10,420,22,x,210,0,rim,3);
    box(lid,'Lid top rim',480,12,22,0,415,0,rim,4);
    const colors=['#344346','#565956','#647375','#536479','#756059','#aaa797'];
    colors.forEach((color,i)=>{
      const disk=new T.Group();disk.name=`3.5 inch floppy ${i+1}`;disk.position.set(0,43,160-i*65);disk.rotation.x=-.13;disks.add(disk);
      box(disk,'Floppy casing',385,386,25,0,193,0,material(color),12);
      box(disk,'Metal shutter',218,117,5,32,320,15,material('#afb5b0',.4),3);
      box(disk,'Shutter aperture',47,85,6,70,320,19,charcoal,1);
      box(disk,'Paper label',325,160,3,0,125,15,light,3);
      label(disk,['SYSTEM 01','MY FILES','BACKUP','GAMES','MUSIC','ARCHIVE'][i],290,32,0,161,18);
      for(let j=0;j<3;j++) box(disk,'Label ruled line',278,2,2,0,125-j*24,18,seam,0);
      box(disk,'Write protection tab',25,27,4,-161,33,16,charcoal,1);
    });
    // Local lighting affects only newly modeled PBR assets; baked original scenery is unchanged.
    const keyLight=new T.Directional('#ffffff',1.1);keyLight.position.set(-3000,6000,4500);group.add(keyLight);
    const fillLight=new T.Directional('#d7e4ec',.45);fillLight.position.set(4500,2300,-1300);group.add(fillLight);
    app.scene.add(group);
    function setOriginal(value) {
      group.visible=!value;oldComputer.visible=value;if(cup)cup.visible=value;steam.visible=value;
      binders.forEach(binder=>binder.visible=value);
      const dy=value?0:-500;
      screen.position.copy(screenOrigin);screen.position.y+=dy;
      for(const part of [...screenParts,...cssParts]){part.mesh.position.copy(part.position);part.mesh.position.y+=dy;}
      monitorView.position.copy(cameraPosition);monitorView.position.y+=dy;
      monitorView.focalPoint.copy(cameraFocus);monitorView.focalPoint.y+=dy;
    }
    setOriginal(original);
    window.retroWorkstation={group,setOriginal,originalAssets:{computer:oldComputer,cup,steam,binders},screenParts};
  },50);
})();

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

/* White CRT + horizontal system unit. All screen geometry shares the live plane. */
(() => {
 const timer=setInterval(()=>{
  const app=window.retroApplication,T=window.RetroThree;
  if(!app?.world?.monitorScreen || !window.originalSceneRestored)return;
  clearInterval(timer);
  if(!window.whiteComputerEnabled)return;
  const original=app.world.computerSetup.bakedModel.getModel();
  for(const name of ['computer','monitor_base']){const mesh=original.getObjectByName(name);if(mesh)mesh.visible=false;}
  const group=new T.Group();group.name='White IBM-style CRT system';app.scene.add(group);
  function mat(c){const m=new T.Standard({color:c,roughness:.8,emissive:c,emissiveIntensity:.08});m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m;}
  const white=mat('#d1d5d7'),side=mat('#c5cacc'),seam=mat('#858e91'),dark=mat('#252d30');
  // Preserve the original key legends and baked shading, with a neutral white tint.
  for(const name of ['keyboard','mouse']){const mesh=original.getObjectByName(name);if(mesh){mesh.material=mesh.material.clone();mesh.material.color.setRGB(1.13,1.15,1.16);}}
  function box(p,n,w,h,d,x,y,z,m=white,r=16){const g=new T.Box(w,h,d,5,5,5),a=g.attributes.position;const radius=Math.min(r,w/3,h/3,d/3);for(let i=0;i<a.count;i++){const v=new T.Vector(a.getX(i),a.getY(i),a.getZ(i));const c=new T.Vector(Math.max(-w/2+radius,Math.min(w/2-radius,v.x)),Math.max(-h/2+radius,Math.min(h/2-radius,v.y)),Math.max(-d/2+radius,Math.min(d/2-radius,v.z)));v.sub(c).normalize().multiplyScalar(radius).add(c);a.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();const mesh=new T.Mesh(g,m);mesh.name=n;mesh.position.set(x,y,z);p.add(mesh);return mesh;}
  function label(p,s,w,h,x,y,z){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#4d5b62';c.font='bold 76px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(s,256,66);if(s==='IBM'){c.globalCompositeOperation='destination-out';for(let y=0;y<128;y+=12)c.fillRect(0,y,512,3);}const tx=new T.Texture(canvas);tx.encoding=T.sRGB;tx.needsUpdate=true;const mesh=new T.Mesh(new T.Plane(w,h),new T.Basic({map:tx,transparent:true,depthWrite:false}));mesh.position.set(x,y,z);p.add(mesh);}
  const screen=app.world.monitorScreen,w=screen.screenSize.x,h=screen.screenSize.y;
  const crt=new T.Group();crt.name='White CRT';crt.position.copy(screen.position);crt.rotation.copy(screen.rotation);group.add(crt);
  // The viewport is 1600 x 1200; these four rails use its exact edges.
  const rail=120,depth=132,front=100;
  box(crt,'Left screen bezel',rail,h,depth,-w/2-rail/2,0,front,white,12);
  box(crt,'Right screen bezel',rail,h,depth,w/2+rail/2,0,front,white,12);
  box(crt,'Top screen bezel',w+2*rail,rail,depth,0,h/2+rail/2,front,white,22);
  box(crt,'Lower control bezel',w+2*rail,164,depth,0,-h/2-82,front,white,22);
  box(crt,'Left black screen seal',9,h,15,-w/2+4,0,100,dark,2);
  box(crt,'Right black screen seal',9,h,15,w/2-4,0,100,dark,2);
  box(crt,'Top black screen seal',w,9,15,0,h/2-4,100,dark,2);
  box(crt,'Bottom black screen seal',w,9,15,0,-h/2+4,100,dark,2);
  // Rear electronics stay behind the CSS/WebGL aperture, never through it.
  box(crt,'Front enclosure collar',w+240,h+248,150,0,-4,-96,side,35);
  const back=box(crt,'Deep tapered rear enclosure',w+225,h+230,1000,0,0,-656,side,45);
  const a=back.geometry.attributes.position;for(let i=0;i<a.count;i++){const factor=1-.20*Math.max(0,(-a.getZ(i)+400)/900);a.setX(i,a.getX(i)*factor);a.setY(i,a.getY(i)*factor);}back.geometry.computeVertexNormals();
  label(crt,'IBM',173,72,-650,-676,169);
  box(crt,'Power recess',100,61,8,653,-683,169,dark,2);
  box(crt,'Power switch',76,42,11,653,-683,176,side,4);
  box(crt,'Green indicator',10,7,4,570,-681,172,new T.Basic({color:'#b1dba0'}),1);
  for(let i=0;i<18;i++)box(crt,'Top cooling vent',9,5,210,-650+i*76,h/2+124,-99,seam,1);
  // Low hinge and wide, flat desktop system case.
  box(group,'Low display plinth',1090,95,680,0,151,-60,side,20);
  box(group,'Horizontal white chassis',2050,535,1500,0,-178,-65,white,30);
  box(group,'Chassis lower seam',1990,16,1450,0,-434,-65,seam,5);
  box(group,'Front panel',2000,463,34,0,-173,698,white,16);
  box(group,'Front vertical divider',6,440,4,113,-173,718,seam,1);
  box(group,'Drive bay recess',786,313,14,565,-115,722,dark,5);
  for(let i=0;i<2;i++){
   box(group,'Floppy drive fascia',746,122,15,565,-44-i*140,734,mat('#414a4e'),3);
   box(group,'Disk insertion slot',571,15,9,564,-36-i*140,745,dark,2);
   box(group,'Drive latch',50,48,12,472,-52-i*140,751,side,3);
   box(group,'Drive activity light',8,9,5,888,-77-i*140,750,new T.Basic({color:'#a05c50'}),1);
  }
  label(group,'IBM',170,75,-777,-59,720);
  for(let i=0;i<25;i++)box(group,'Front ventilation slot',10,143,5,-885+i*35,-283,720,dark,2);
  box(group,'System power recess',153,45,9,304,-304,724,dark,3);
  box(group,'System power rocker',100,28,12,304,-304,731,side,3);
  const key=new T.Directional('#ffffff',1.10);key.position.set(-4500,7000,5000);group.add(key);
  const fill=new T.Directional('#e5ebef',.45);fill.position.set(4500,2000,-2000);group.add(fill);
  window.whiteComputer={group,crt,screen,width:w,height:h};
  // Put the complete desktop at the physical aperture, not behind its thick rim.
  const cssScreen=app.cssScene.children[0];
  cssScreen.position.z=screen.position.z+100;
  for(const mesh of app.scene.children){
   if(!mesh.isMesh || mesh.geometry?.type!=='PlaneGeometry')continue;
   if(mesh.geometry.parameters.width!==w || mesh.geometry.parameters.height!==h)continue;
   if(mesh.material.opacity===0 && mesh.material.blending===0)mesh.position.z=cssScreen.position.z;
   else if(mesh.material.map || mesh===screen.dimmingPlane)mesh.visible=false;
  }
  const frame=cssScreen.element.querySelector('iframe');
  Object.assign(frame.style,{width:(w-40)+'px',height:(h-40)+'px',margin:'20px',padding:'0',boxSizing:'border-box'});
  frame.classList.remove('jitter');
  const camera=app.camera,near=camera.keyframes.desk,monitor=camera.keyframes.monitor;
  const cameraEase=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function overDeskTop(x,y){const points=[[-3500,-430,-1450],[3200,-430,-1450],[3200,-430,1600],[-3500,-430,1600]].map(([a,b,c])=>{const p=new T.Vector(a,b,c).project(camera.instance);return[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];});let sign=0;for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(Math.abs(cross)<.01)continue;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);}return true;}
  function fit(height,width,margin){const tan=Math.tan(camera.instance.fov*Math.PI/360);return Math.max(height/(2*tan*margin),width/(2*tan*camera.instance.aspect*margin));}
  near.update=()=>{near.position.set(0,1500,330+fit(2900,3000,.88));near.focalPoint.set(0,450,330);};
  monitor.update=()=>{monitor.position.set(0,950,430+fit(h,w,.86));monitor.focalPoint.set(0,950,430);};
  near.update();monitor.update();
  const transition=camera.transition.bind(camera);
  let deskTransitionAllowed=false;
  camera.transition=(name,...args)=>{const state=camera.targetKeyframe||camera.currentKeyframe;if(name==='desk'&&state==='idle'&&!deskTransitionAllowed)return;if(name==='monitor'&&!['desk','monitor'].includes(camera.currentKeyframe)&&!['desk','monitor'].includes(camera.targetKeyframe))return;return transition(name,...args);};
  const moveToDesk=duration=>{deskTransitionAllowed=true;camera.transition('desk',duration,cameraEase);deskTransitionAllowed=false;};
  // The clickable region follows the whole monitor face, not only the iframe.
  function overScreen(x,y){const sideMargin=320,topMargin=120,bottomMargin=164;const left=-w/2-sideMargin,right=w/2+sideMargin,top=h/2+topMargin,bottom=-h/2-bottomMargin;const p=[[left,top],[right,top],[right,bottom],[left,bottom]].map(([a,b])=>{const v=cssScreen.localToWorld(new T.Vector(a,b,0)).project(camera.instance);return[(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2];});let sign=0;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(Math.abs(cross)<1)continue;const s=Math.sign(cross);if(sign&&s!==sign)return false;sign=s;}return true;}
  document.addEventListener('mousedown',e=>{
   if(e.target.closest?.('#custom-fixed-controls,button,input')||document.body.classList.contains('pixel-loading')||camera.freeCam)return;
   const state=camera.targetKeyframe||camera.currentKeyframe;
   if(state==='idle'&&overDeskTop(e.clientX,e.clientY)){e.stopImmediatePropagation();moveToDesk(1050);}
   else if(state==='desk'&&overScreen(e.clientX,e.clientY)){e.stopImmediatePropagation();camera.transition('monitor',900,cameraEase);}
   else if(state==='monitor'){e.stopImmediatePropagation();moveToDesk(900);}
  },true);
  window.whiteComputer.interaction={overScreen};
  const clearPrompt=document.createElement('style');clearPrompt.textContent='body:not(.pixel-loading) #ui-app{visibility:hidden}';document.head.appendChild(clearPrompt);
 },50);
})();

/* Non-destructive interactions for the original baked scene. */
(() => {
 const wait=setInterval(()=>{
  const app=window.retroApplication,T=window.RetroThree;
  if(!window.originalSceneRestored||!T)return;
  clearInterval(wait);
  if(window.whiteComputerEnabled)return;
  const desk=app.world.environment.bakedModel.getModel().getObjectByName('desk');
  const source=desk.geometry,indices=source.index.array,pos=source.attributes.position;
  const buckets=[[],[],[]],ranges=[[-1.193,-.687],[-1.795,-1.289]];
  for(let i=0;i<indices.length;i+=3){
   const tri=[indices[i],indices[i+1],indices[i+2]];
   const which=ranges.findIndex(([lo,hi])=>tri.every(k=>pos.getX(k)>-3.459&&pos.getX(k)<-1.761&&pos.getY(k)>=lo&&pos.getY(k)<=hi&&pos.getZ(k)>1.5147));
   buckets[which+1].push(...tri);
  }
  desk.geometry=source.clone();desk.geometry.setIndex(buckets[0]);
  const drawers=[];
  function box(parent,w,h,d,x,y,z,color){
   const m=new T.Mesh(new T.Box(w,h,d),new T.Basic({color}));m.position.set(x,y,z);parent.add(m);return m;
  }
  ranges.forEach(([lo,hi],i)=>{
   const group=new T.Group();group.name='Original drawer '+(i+1);app.scene.add(group);
   const geometry=source.clone();geometry.setIndex(buckets[i+1]);
   const front=new T.Mesh(geometry,desk.material);front.scale.copy(desk.scale);front.position.copy(desk.position);front.quaternion.copy(desk.quaternion);group.add(front);
   const bottom=(lo+.025)*900,centerX=-2.610*900;
   box(group,1485,24,1700,centerX,bottom,570,'#55585a');
   box(group,24,350,1700,centerX-742,bottom+175,570,'#6b6c6b');
   box(group,24,350,1700,centerX+742,bottom+175,570,'#6b6c6b');
   box(group,1485,350,24,centerX,bottom+175,-280,'#5f6262');
   // Dark cabinet interior remains behind the moving panel.
   box(app.scene,1510,440,15,centerX,(lo+hi)*450,1350,'#292d30');
   drawers.push({group,open:false,lo:lo*900,hi:hi*900});
  });
  // A grey-brown notebook lives in the second drawer and moves with it.
  const lowerDrawer=drawers[1],bookY=(ranges[1][0]+.07)*900;
  const drawerBook=new T.Group();drawerBook.name='Notebook in second drawer';lowerDrawer.group.add(drawerBook);
  box(drawerBook,790,42,1080,-2350,bookY,560,'#746d69');
  box(drawerBook,748,32,1035,-2350,bookY+31,560,'#d2d0c8');
  box(drawerBook,790,13,1080,-2350,bookY+54,560,'#6c6561');
  const sticky=box(drawerBook,350,10,350,-2380,bookY+65,600,'#d7bd54');sticky.name='Password sticky note';
  const curl=box(drawerBook,82,7,82,-2248,bookY+74,468,'#eadb81');curl.rotation.y=-.25;curl.rotation.z=.10;
  function hitDrawer(x,y){
   return drawers.find(d=>{
    const corners=[[-3.458,d.lo],[-1.762,d.lo],[-1.762,d.hi],[-3.458,d.hi]].map(([x,y])=>{
     const p=new T.Vector(x*900,y,1495+d.group.position.z).project(app.camera.instance);
     return [(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];
    });
    let sign=0;for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],v=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(sign&&sign!==Math.sign(v))return false;sign=Math.sign(v);}return true;
   });
  }
  const paperBounds={minX:-2572.375,maxX:-1555.033,minZ:449.240,maxZ:1523.591,y:-444.749};
  function projectedPolygonHit(x,y,points){
   const corners=points.map(point=>{const p=point.clone().project(app.camera.instance);return[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];});
   let sign=0;for(let i=0;i<corners.length;i++){const a=corners[i],b=corners[(i+1)%corners.length],v=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);if(Math.abs(v)<.01)continue;if(sign&&sign!==Math.sign(v))return false;sign=Math.sign(v);}return true;
  }
  function hitPaper(x,y){const b=paperBounds;return projectedPolygonHit(x,y,[new T.Vector(b.minX,b.y,b.minZ),new T.Vector(b.maxX,b.y,b.minZ),new T.Vector(b.maxX,b.y,b.maxZ),new T.Vector(b.minX,b.y,b.maxZ)]);}
  function hitDrawerNote(x,y){
   const points=[[-2555,425],[-2205,425],[-2205,775],[-2555,775]].map(([px,pz])=>lowerDrawer.group.localToWorld(new T.Vector(px,bookY+80,pz)));
   return projectedPolygonHit(x,y,points);
  }
  const noteShade=document.createElement('div');noteShade.id='desk-note-shade';noteShade.hidden=true;
  noteShade.innerHTML='<button type="button" class="desk-note-close" aria-label="关闭留言" title="关闭">×</button><section class="desk-note-dialog" role="dialog" aria-modal="true" aria-labelledby="desk-note-title"><div class="desk-note-copy"><h2 id="desk-note-title">留言</h2><p>欢迎来到本人闲得发慌时做出来的网站。</p><p>这个桌子是我照着自己的桌面搭的，水平有限，大家凑合着看。本来只是想试试网页里能不能做个小房间，后来顺手把电脑远程控制也接进来了，所以可以直接操作。欢迎各位网友参观，批评指正。</p><p>（骂轻点就行）</p></div></section>';
  const noteStyle=document.createElement('style');noteStyle.textContent=`#desk-note-shade{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:62px 28px 30px;background:rgba(7,10,13,.42);box-sizing:border-box;backdrop-filter:blur(7px) brightness(.56)}#desk-note-shade[hidden]{display:none}.desk-note-dialog{position:relative;width:min(570px,calc(100vw - 56px));max-height:calc(100vh - 96px);aspect-ratio:.78;display:grid;place-items:center;overflow:hidden;background:#a9abad;box-shadow:0 18px 48px rgba(0,0,0,.28);transform:rotate(-.4deg);font:18px/1.85 SimHei,"Microsoft YaHei",sans-serif}.desk-note-dialog:before{content:"";position:absolute;inset:0;background-image:url('models/Decor/baked_decor_modified.jpg');background-repeat:no-repeat;background-size:236.85% 161.76%;background-position:-6.44% -13.68%;filter:blur(3.2px) grayscale(.45) brightness(.62) contrast(.88);transform:scale(1.018)}.desk-note-dialog:after{content:"";position:absolute;inset:0;background:rgba(25,29,32,.30)}.desk-note-copy{position:relative;z-index:1;width:80%;padding:44px 0;color:#fff;text-shadow:none}.desk-note-copy h2{margin:0 0 25px;color:#fff;font:400 22px/1.4 SimHei,"Microsoft YaHei",sans-serif;letter-spacing:5px;text-shadow:none}.desk-note-copy p{margin:0 0 16px;color:#fff;font-family:SimHei,"Microsoft YaHei",sans-serif;font-weight:400;text-shadow:none}.desk-note-copy p:last-child{margin:25px 0 0;text-align:right;font-size:20px;font-weight:400}.desk-note-close{position:fixed;right:32px;top:28px;width:42px;height:42px;display:grid;place-items:center;padding:0;color:#fff;background:rgba(40,48,60,.12);border:1px solid rgba(255,255,255,.85);border-radius:50%;font:300 25px/1 Arial;cursor:pointer;backdrop-filter:blur(4px)}.desk-note-close:hover{background:rgba(255,255,255,.18)}@media(max-width:640px){#desk-note-shade{padding:58px 16px 20px}.desk-note-dialog{width:min(88vw,500px);max-height:calc(100vh - 82px);aspect-ratio:.76;font-size:16px;line-height:1.7}.desk-note-copy{width:82%;padding:32px 0}.desk-note-close{right:18px;top:18px;width:42px;height:42px}}`;
  noteStyle.textContent+=' .desk-note-dialog:before{transform:scale(1.22)}';
  document.head.appendChild(noteStyle);document.body.appendChild(noteShade);
  const passwordShade=document.createElement('div');passwordShade.id='drawer-password-shade';passwordShade.hidden=true;
  passwordShade.innerHTML='<button type="button" class="drawer-password-close" aria-label="关闭便签" title="关闭">×</button><section class="drawer-password-dialog" role="dialog" aria-modal="true" aria-label="临时用户访问密码"><img src="drawer-password-note.png" alt="临时用户访问密码：1234"></section>';
  const passwordStyle=document.createElement('style');passwordStyle.textContent=`#drawer-password-shade{position:fixed;inset:0;z-index:21000;display:grid;place-items:center;padding:68px 24px 28px;background:rgba(7,10,13,.48);backdrop-filter:blur(8px) brightness(.52);box-sizing:border-box}#drawer-password-shade[hidden]{display:none}.drawer-password-dialog{width:min(650px,78vw);max-height:calc(100vh - 100px);display:grid;place-items:center}.drawer-password-dialog img{display:block;width:100%;height:auto;max-height:calc(100vh - 100px);object-fit:contain;filter:drop-shadow(0 18px 34px rgba(0,0,0,.36))}.drawer-password-close{position:fixed;right:32px;top:28px;width:42px;height:42px;display:grid;place-items:center;padding:0;color:#fff;background:rgba(40,48,60,.12);border:1px solid rgba(255,255,255,.85);border-radius:50%;font:300 25px/1 Arial;cursor:pointer;backdrop-filter:blur(4px)}.drawer-password-close:hover{background:rgba(255,255,255,.18)}@media(max-width:640px){.drawer-password-dialog{width:88vw}.drawer-password-close{right:18px;top:18px}}`;
  document.head.appendChild(passwordStyle);document.body.appendChild(passwordShade);
  const noteClose=noteShade.querySelector('button');
  const passwordClose=passwordShade.querySelector('button');
  let frozenCamera=null,releaseCameraOnMove=false,orbitWasEnabled=null;
  function openNote(){window.deskNoteOpen=true;app.world.monitorScreen.prevInComputer=false;frozenCamera={position:app.camera.instance.position.clone(),quaternion:app.camera.instance.quaternion.clone()};if(app.camera.orbitControls){orbitWasEnabled=app.camera.orbitControls.enabled;app.camera.orbitControls.enabled=false;}releaseCameraOnMove=false;noteShade.hidden=false;document.body.style.cursor='';noteClose.focus();}
  function closeNote(){noteShade.hidden=true;releaseCameraOnMove=true;}
  function openDrawerPassword(){window.deskNoteOpen=true;app.world.monitorScreen.prevInComputer=false;frozenCamera={position:app.camera.instance.position.clone(),quaternion:app.camera.instance.quaternion.clone()};if(app.camera.orbitControls){orbitWasEnabled=app.camera.orbitControls.enabled;app.camera.orbitControls.enabled=false;}releaseCameraOnMove=false;passwordShade.hidden=false;document.body.style.cursor='';passwordClose.focus();}
  function closeDrawerPassword(){passwordShade.hidden=true;releaseCameraOnMove=true;}
  for(const type of ['pointerdown','mousedown','click','mousemove','wheel'])noteShade.addEventListener(type,e=>e.stopPropagation());
  for(const type of ['pointerdown','mousedown','click','mousemove','wheel'])passwordShade.addEventListener(type,e=>e.stopPropagation());
  noteClose.addEventListener('click',closeNote);
  passwordClose.addEventListener('click',closeDrawerPassword);
  let pressed=null,paperPressed=false,drawerNotePressed=false;
  document.addEventListener('mousedown',e=>{if(e.button!==0||!noteShade.hidden||!passwordShade.hidden)return;drawerNotePressed=lowerDrawer.open&&hitDrawerNote(e.clientX,e.clientY);paperPressed=!drawerNotePressed&&hitPaper(e.clientX,e.clientY);pressed=(paperPressed||drawerNotePressed)?null:hitDrawer(e.clientX,e.clientY);if(paperPressed||drawerNotePressed||pressed){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('click',e=>{if(!noteShade.hidden||!passwordShade.hidden)return;const drawerNote=lowerDrawer.open&&hitDrawerNote(e.clientX,e.clientY);if(drawerNote&&drawerNotePressed){openDrawerPassword();e.preventDefault();e.stopImmediatePropagation();drawerNotePressed=false;paperPressed=false;pressed=null;return;}const paper=hitPaper(e.clientX,e.clientY);if(paper&&paperPressed){openNote();e.preventDefault();e.stopImmediatePropagation();paperPressed=false;pressed=null;return;}const d=hitDrawer(e.clientX,e.clientY);if(d&&d===pressed){d.open=!d.open;e.preventDefault();e.stopImmediatePropagation();}drawerNotePressed=false;paperPressed=false;pressed=null;},true);
  document.addEventListener('mousemove',e=>{if(releaseCameraOnMove){releaseCameraOnMove=false;frozenCamera=null;window.deskNoteOpen=false;if(app.camera.orbitControls&&orbitWasEnabled!==null)app.camera.orbitControls.enabled=orbitWasEnabled;}document.body.style.cursor=noteShade.hidden&&passwordShade.hidden&&(hitPaper(e.clientX,e.clientY)||(lowerDrawer.open&&hitDrawerNote(e.clientX,e.clientY))||hitDrawer(e.clientX,e.clientY))?'pointer':'';},{passive:true});
  const night={value:0},materials=new Set();
  app.scene.traverse(o=>{
   // Only shade solid surfaces, including the screen's opaque inner rim.
   // CRT compositing masks, video overlays and steam keep their own materials.
   if(o.isMesh&&o.material&&!o.material.transparent&&o.material.opacity===1){
    o.material.depthTest=true;o.material.depthWrite=true;
    materials.add(o.material);
   }
  });
  // Baked shadows stay intact. World-space falloff adds cool CRT spill nearby.
  materials.forEach(m=>{
   m.onBeforeCompile=shader=>{
    shader.uniforms.retroNight=night;
    shader.vertexShader='varying vec3 retroWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nretroWorld=(modelMatrix*vec4(position,1.0)).xyz;');
    shader.fragmentShader='uniform float retroNight; varying vec3 retroWorld;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
     float spill=exp(-length((retroWorld-vec3(0.,650.,650.))/vec3(2100.,1500.,1900.)));
     vec3 nightTint=vec3(.115,.205,.36)+spill*vec3(.20,.40,.47);
     gl_FragColor.rgb*=mix(vec3(1.),nightTint,retroNight);`);
   };
   m.customProgramCacheKey=()=> 'retro-night-v2';m.needsUpdate=true;
  });
  // Screen spill is applied to solid surfaces above, not a large translucent
  // plane in front of the casing (which looks like intersecting/transparent geometry).
  const button=document.createElement('button');button.id='retro-day-night';button.title='切换到夜晚';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed','false');
  const moon='<path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/>';
  const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
  const icon=s=>'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+s+'</svg>';
  button.innerHTML=icon(moon);Object.assign(button.style,{position:'fixed',left:'136px',top:'32px',width:'42px',height:'42px',borderRadius:'50%',border:'1px solid rgba(255,255,255,.85)',background:'rgba(40,48,60,.12)',color:'white',display:'grid',placeItems:'center',padding:'0',cursor:'pointer',zIndex:'10000',backdropFilter:'blur(4px)'});
  let target=0;
  button.addEventListener('mousedown',e=>e.stopPropagation());
  button.addEventListener('click',e=>{e.stopPropagation();target=target?0:1;button.innerHTML=icon(target?sun:moon);button.title=target?'切换到白天':'切换到夜晚';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(!!target));});
  document.body.appendChild(button);
  const bg=app.scene.background?.isColor?app.scene.background.clone():null;
  function animate(){
   night.value+=(target-night.value)*.055;
   drawers.forEach(d=>{d.group.position.z+=((d.open?1050:0)-d.group.position.z)*.12;});
   if(bg)app.scene.background.copy(bg).multiplyScalar(1-night.value*.75);
   button.style.visibility=document.body.classList.contains('pixel-loading')?'hidden':'visible';
   if(frozenCamera){app.camera.instance.position.copy(frozenCamera.position);app.camera.instance.quaternion.copy(frozenCamera.quaternion);app.camera.instance.updateMatrixWorld(true);}
   requestAnimationFrame(animate);
  }animate();
  window.originalInteractions={drawers,night,button};
 },60);
})();

