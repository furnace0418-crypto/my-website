/* A handmade-paper lantern built for the locally bundled Three.js r128. */
(() => {
  'use strict';

  const T = window.THREE;
  const $ = id => document.getElementById(id);
  const host = $('viewport');
  const defaults = {
    base: 'round', shadeColor: '#efc987', frameColor: '#56301e',
    width: 1, height: 1, brightness: 1, baseSize: 1, baseHeight: 1, wish: ''
  };
  let state = {...defaults};
  try {
    const saved = JSON.parse(localStorage.getItem('annian-lantern-v1') || 'null');
    if (saved) Object.keys(defaults).forEach(key => {
      if (typeof saved[key] === typeof defaults[key]) state[key] = saved[key];
    });
  } catch (_) {}
  for (const key of ['width', 'height', 'brightness', 'baseSize', 'baseHeight']) {
    state[key] = Math.max(.2, Math.min(2, state[key]));
  }

  let renderer, scene, camera, controls, model, candleLight, paperMaterial;
  let paperColor, paperBump, environment, flame, glowTexture, animationId;
  let lit = true, autoRotate = false, disposed = false, paperShader = null;

  function sync() {
    for (const key of Object.keys(defaults)) {
      if ($(key)) $(key).value = state[key];
      if ($(key + 'Out')) $(key + 'Out').textContent = Math.round(state[key] * 100) + '%';
    }
    document.querySelectorAll('[data-base]').forEach(button => {
      const active = button.dataset.base === state.base;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('wishDisplay').textContent = state.wish;
  }

  if (!T) {
    $('status').textContent = '无法加载 3D 渲染库。';
    return;
  }
  try {
    renderer = new T.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
  } catch (_) {
    $('status').textContent = '无法启动 3D 展示，请开启浏览器硬件加速。';
    return;
  }

  scene = new T.Scene();
  scene.background = new T.Color(0x0d0806);
  scene.fog = new T.FogExp2(0x0d0806, .06);
  camera = new T.PerspectiveCamera(37, 1, .1, 50);
  camera.position.set(3.7, 2.6, 6.1);
  controls = new T.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.52, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.8;
  controls.maxDistance = 11;
  controls.maxPolarAngle = Math.PI * .52;
  controls.autoRotateSpeed = .55;

  // Small reflection cards give the dark frame a few believable warm edges.
  const reflectionScene = new T.Scene();
  reflectionScene.background = new T.Color(0x030201);
  [[-2, 1.8, 1, .32, 2.8, 1.4], [2, 1.2, -1, .22, 2.1, .7],
    [0, -1, 0, 2.8, .2, .45]].forEach(([x, y, z, width, height, power]) => {
    const card = new T.Mesh(
      new T.PlaneGeometry(width, height),
      new T.MeshBasicMaterial({color: new T.Color(power, power * .45, power * .16), side: T.DoubleSide})
    );
    card.position.set(x, y, z);
    card.lookAt(0, 0, 0);
    reflectionScene.add(card);
  });
  const pmrem = new T.PMREMGenerator(renderer);
  environment = pmrem.fromScene(reflectionScene, .12);
  pmrem.dispose();
  reflectionScene.traverse(object => {
    object.geometry?.dispose();
    object.material?.dispose();
  });

  scene.add(new T.HemisphereLight(0x8f8a80, 0x20140d, .045));
  const floor = new T.Mesh(
    new T.PlaneGeometry(100, 100),
    new T.MeshStandardMaterial({color: 0x1e130e, roughness: .56, metalness: .05})
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  candleLight = new T.PointLight(0xffa348, 11, 9, 2);
  candleLight.castShadow = true;
  candleLight.shadow.mapSize.set(1024, 1024);
  candleLight.shadow.bias = -.001;
  candleLight.shadow.normalBias = .025;
  scene.add(candleLight);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext('2d');
  const gradient = glowContext.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,244,187,.92)');
  gradient.addColorStop(.2, 'rgba(255,178,68,.4)');
  gradient.addColorStop(1, 'rgba(255,120,20,0)');
  glowContext.fillStyle = gradient;
  glowContext.fillRect(0, 0, 128, 128);
  glowTexture = new T.CanvasTexture(glowCanvas);

  function drawCloud(context, x, y, scale) {
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.strokeStyle = 'rgba(115,54,25,.43)';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const side of [-1, 1]) {
      context.save();
      context.scale(side, 1);
      context.beginPath();
      context.moveTo(0, 23);
      context.bezierCurveTo(24, 34, 55, 30, 65, 12);
      context.bezierCurveTo(80, -11, 52, -28, 39, -11);
      context.bezierCurveTo(29, 4, 46, 16, 53, 3);
      context.bezierCurveTo(63, -8, 49, -17, 41, -7);
      context.stroke();
      context.restore();
    }
    context.beginPath();
    context.moveTo(-25, 10);
    context.bezierCurveTo(-38, -6, -19, -23, 0, -10);
    context.bezierCurveTo(19, -23, 38, -6, 25, 10);
    context.bezierCurveTo(15, 26, -15, 26, -25, 10);
    context.stroke();
    context.restore();
  }

  function makePaperMaps(image) {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (image) {
      context.drawImage(image, 0, 0, size, size);
    } else {
      context.fillStyle = '#eee1bf';
      context.fillRect(0, 0, size, size);
      // Fallback for an unavailable texture file.
      let seed = 2917;
      for (let i = 0; i < 16000; i++) {
        seed = seed * 16807 % 2147483647;
        const x = seed % size;
        seed = seed * 16807 % 2147483647;
        const y = seed % size;
        context.fillStyle = 'rgba(112,82,48,.065)';
        context.fillRect(x, y, 1, 1 + seed % 7);
      }
    }
    const bump = new T.CanvasTexture(canvas);
    bump.wrapS = bump.wrapT = T.RepeatWrapping;
    const decorated = document.createElement('canvas');
    decorated.width = decorated.height = size;
    const ink = decorated.getContext('2d');
    ink.drawImage(canvas, 0, 0);
    [128, 384, 640, 896].forEach(x => drawCloud(ink, x, 515, .75));
    const color = new T.CanvasTexture(decorated);
    color.encoding = T.sRGBEncoding;
    color.wrapS = color.wrapT = T.RepeatWrapping;
    paperColor?.dispose();
    paperBump?.dispose();
    paperColor = color;
    paperBump = bump;
  }
  makePaperMaps(null);
  const paperImage = new Image();
  paperImage.onload = () => { if (!disposed) { makePaperMaps(paperImage); build(); } };
  paperImage.src = 'assets/xuan-paper-v1.png';

  function clearModel() {
    if (!model) return;
    const materials = new Set();
    model.traverse(object => {
      object.geometry?.dispose();
      if (object.material) materials.add(object.material);
    });
    materials.forEach(material => material.dispose());
    scene.remove(model);
    model = null;
  }

  function paperGeometry(radius, start, height, panels = 12) {
    const radial = panels * 8, vertical = 48;
    const positions = [], uvs = [], indices = [];
    const profile = t => radius * (.29 + .69 * Math.pow(Math.sin(Math.PI * t), .76));
    for (let row = 0; row <= vertical; row++) {
      const t = row / vertical;
      for (let column = 0; column <= radial; column++) {
        const u = column / radial;
        const angle = u * Math.PI * 2;
        const scallop = 1 - .018 * Math.pow(Math.cos(angle * panels / 2), 8);
        const r = profile(t) * scallop;
        positions.push(Math.sin(angle) * r, start + height * t, Math.cos(angle) * r);
        uvs.push(u, t);
        if (row < vertical && column < radial) {
          const a = row * (radial + 1) + column;
          const b = a + 1, c = a + radial + 1, d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return {geometry, profile};
  }

  function build() {
    clearModel();
    paperShader = null;
    model = new T.Group();
    scene.add(model);
    const wood = new T.MeshPhysicalMaterial({
      color: state.frameColor, roughness: .39, metalness: .28,
      clearcoat: .16, clearcoatRoughness: .31,
      envMap: environment.texture, envMapIntensity: .65
    });
    const brass = new T.MeshStandardMaterial({
      color: 0x976039, roughness: .29, metalness: .76,
      envMap: environment.texture, envMapIntensity: .65
    });
    const wax = new T.MeshStandardMaterial({color: 0xeacaa0, roughness: .95});
    const wick = new T.MeshStandardMaterial({color: 0x170e09, roughness: 1});
    paperMaterial = new T.MeshStandardMaterial({
      color: state.shadeColor, map: paperColor, bumpMap: paperBump,
      bumpScale: .012, roughness: 1, metalness: 0, side: T.DoubleSide
    });
    paperMaterial.onBeforeCompile = shader => {
      shader.uniforms.paperGlow = {value: 0};
      shader.uniforms.paperTexture = {value: paperBump};
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nuniform float paperGlow;\nuniform sampler2D paperTexture;'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float pulp = texture2D(paperTexture, vUv).r;
         float candleHeight = exp(-pow((vUv.y - 0.43) * 2.2, 2.0));
         float rib = abs(sin(vUv.x * 37.69911184));
         float ribShade = 0.69 + 0.31 * smoothstep(0.0, 0.16, rib);
         float fiberTranslucency = mix(0.73, 1.05, pulp);
         totalEmissiveRadiance += vec3(1.0, 0.37, 0.075) * paperGlow
             * candleHeight * ribShade * fiberTranslucency;`
      );
      paperShader = shader;
    };

    function mesh(geometry, material, x = 0, y = 0, z = 0, castsShadow = true) {
      const object = new T.Mesh(geometry, material);
      object.position.set(x, y, z);
      object.castShadow = castsShadow;
      object.receiveShadow = true;
      model.add(object);
      return object;
    }
    function cylinder(top, bottom, height, y, material = wood, sides = 64) {
      return mesh(new T.CylinderGeometry(top, bottom, height, sides), material, 0, y);
    }
    function curveTube(points, thickness, material = wood) {
      const curve = new T.CatmullRomCurve3(points, false, 'centripetal');
      return mesh(new T.TubeGeometry(curve, points.length * 4, thickness, 6, false), material);
    }
    function ring(radius, y, thickness = .023, material = wood) {
      const points = [];
      for (let i = 0; i <= 96; i++) {
        const angle = i / 96 * Math.PI * 2;
        points.push(new T.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius));
      }
      curveTube(points, thickness, material);
    }

    const size = state.baseSize, baseHeight = state.baseHeight;
    const tall = state.base === 'tall';
    const baseY = (tall ? .67 : .22) * baseHeight;
    const sides = state.base === 'hex' ? 6 : 64;
    cylinder(.63 * size, .72 * size, .12 * baseHeight, .07 * baseHeight, wood, sides);
    cylinder(.56 * size, .64 * size, .055 * baseHeight, .16 * baseHeight, brass, sides);
    if (tall) {
      cylinder(.105, .18, baseY - .19, (baseY + .19) / 2, wood);
      ring(.16, baseY - .06, .018, brass);
    }
    if (state.base === 'lotus') {
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        const petal = mesh(new T.SphereGeometry(1, 16, 12), brass,
          Math.sin(angle) * .49 * size, .23 * baseHeight, Math.cos(angle) * .49 * size);
        petal.scale.set(.13 * size, .13 * baseHeight, .28 * size);
        petal.rotation.y = angle;
      }
    }
    cylinder(.34 * size, .4 * size, .09, baseY, wood);
    const start = baseY + .055;
    const height = 2.06 * state.height;
    const end = start + height;
    const {geometry, profile} = paperGeometry(.88 * state.width, start, height);
    mesh(geometry, paperMaterial, 0, 0, 0, false);

    const panels = 12;
    for (let panel = 0; panel < panels; panel++) {
      const angle = panel * Math.PI * 2 / panels;
      const points = [];
      for (let step = 0; step <= 32; step++) {
        const t = step / 32;
        const r = profile(t) * 1.008;
        points.push(new T.Vector3(Math.sin(angle) * r, start + height * t, Math.cos(angle) * r));
      }
      curveTube(points, .018, wood);
    }
    for (const t of [.13, .37, .63, .87]) ring(profile(t) * 1.008, start + height * t, .012, wood);
    ring(profile(0), start, .045, wood);
    ring(profile(1), end, .045, wood);
    cylinder(profile(1) * 1.08, profile(1) * 1.03, .105, end + .05, wood);
    cylinder(.13, .2, .11, end + .15, brass);
    const handle = mesh(new T.TorusGeometry(.23, .022, 8, 48, Math.PI), brass, 0, end + .2);
    handle.rotation.z = Math.PI;

    cylinder(.1, .12, .34, start + .18, wax);
    cylinder(.009, .009, .05, start + .38, wick);
    const flameMaterial = new T.MeshBasicMaterial({color: new T.Color(3.8, 1.28, .22)});
    flame = mesh(new T.SphereGeometry(1, 20, 16), flameMaterial, 0, start + .49, 0, false);
    flame.scale.set(.039, .11, .036);
    flame.visible = lit;
    const glow = new T.Sprite(new T.SpriteMaterial({
      map: glowTexture, transparent: true, depthWrite: false,
      blending: T.AdditiveBlending, opacity: lit ? .35 : 0
    }));
    glow.position.copy(flame.position);
    glow.scale.set(.52, .68, 1);
    model.add(glow);
    model.userData.glow = glow;
    candleLight.position.copy(flame.position);
    candleLight.intensity = lit ? state.brightness * 11 : 0;
    sync();
  }

  function resize() {
    const bounds = host.getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  build();
  resize();

  function animate(time) {
    if (disposed) return;
    animationId = requestAnimationFrame(animate);
    controls.autoRotate = autoRotate;
    controls.update();
    const flicker = 1 + Math.sin(time * .009) * .035 + Math.sin(time * .021) * .017;
    candleLight.intensity = lit ? state.brightness * 11 * flicker : 0;
    if (paperShader) paperShader.uniforms.paperGlow.value = lit ? state.brightness * 1.28 * flicker : 0;
    if (flame) {
      flame.scale.y = .11 * flicker;
      flame.rotation.z = Math.sin(time * .004) * .06;
    }
    renderer.render(scene, camera);
  }
  animationId = requestAnimationFrame(animate);

  document.querySelectorAll('[data-base]').forEach(button => {
    button.onclick = () => { state.base = button.dataset.base; build(); };
  });
  for (const key of ['shadeColor', 'frameColor', 'width', 'height', 'brightness', 'baseSize', 'baseHeight']) {
    $(key).addEventListener('input', () => {
      state[key] = typeof defaults[key] === 'number' ? +$(key).value : $(key).value;
      build();
    });
  }
  $('wish').oninput = () => {
    state.wish = $('wish').value;
    $('wishDisplay').textContent = state.wish;
  };
  $('rotate').onclick = () => {
    autoRotate = !autoRotate;
    $('rotate').setAttribute('aria-pressed', String(autoRotate));
    $('rotate').textContent = autoRotate ? '暂停旋转' : '自动旋转';
  };
  $('viewReset').onclick = () => {
    camera.position.set(3.7, 2.6, 6.1);
    controls.target.set(0, 1.52, 0);
    controls.update();
  };
  $('light').onclick = () => {
    lit = !lit;
    $('light').textContent = lit ? '熄灯' : '点灯';
    $('light').setAttribute('aria-pressed', String(lit));
    build();
  };
  $('save').onclick = () => {
    try {
      localStorage.setItem('annian-lantern-v1', JSON.stringify(state));
      $('status').textContent = '已保存这盏灯与寄语。';
    } catch (_) {
      $('status').textContent = '浏览器未允许保存，请检查存储权限。';
    }
  };
  $('reset').onclick = () => {
    state = {...defaults};
    lit = true;
    $('light').textContent = '熄灯';
    $('light').setAttribute('aria-pressed', 'true');
    build();
    $('status').textContent = '已恢复默认；点击保存可更新本地存档。';
  };
  addEventListener('pagehide', () => {
    disposed = true;
    cancelAnimationFrame(animationId);
    observer.disconnect();
    controls.dispose();
    clearModel();
    paperColor.dispose();
    paperBump.dispose();
    glowTexture.dispose();
    environment.dispose();
    scene.traverse(object => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    renderer.dispose();
  });
})();
