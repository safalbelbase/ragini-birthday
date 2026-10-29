/* =============================================================================
   world.js — everything you can see. All of it is built in code, no files.
   Returns handles the game moves around.
   ========================================================================== */

const T = window.THREE;

/* ------------------------------------------------------------ textures --- */
function radialTexture(stops, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([p, col]) => grd.addColorStop(p, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new T.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 256, 256);
  const blob = (x, y, r, a) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  blob(96, 140, 62, 0.85);
  blob(150, 128, 54, 0.8);
  blob(128, 158, 70, 0.7);
  blob(70, 156, 40, 0.6);
  blob(186, 154, 38, 0.55);
  const t = new T.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0.0, "#0a0824");
  grd.addColorStop(0.32, "#1a1550");
  grd.addColorStop(0.58, "#3b2f7f");
  grd.addColorStop(0.74, "#7a56a6");
  grd.addColorStop(0.84, "#b2749f");
  grd.addColorStop(1.0, "#171136");
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 512);
  const t = new T.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------- helpers --- */
const mat = (color, opts = {}) => new T.MeshLambertMaterial({ color, flatShading: true, ...opts });
const glowTex = () =>
  radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.28, "rgba(255,240,200,0.7)"],
    [1, "rgba(255,220,160,0)"],
  ]);

function sprite(color, scale, opacity = 1) {
  const m = new T.SpriteMaterial({
    map: glowTex(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: T.AdditiveBlending,
    fog: false,
  });
  const s = new T.Sprite(m);
  s.scale.set(scale, scale, 1);
  return s;
}

function box(w, h, d, color) {
  return new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
}

/* =============================================================== world === */
export function createWorld() {
  const scene = new T.Scene();
  scene.background = skyTexture();
  scene.fog = new T.FogExp2(0x2c2166, 0.011);

  /* ---- lights ---- */
  scene.add(new T.HemisphereLight(0xb9c6ff, 0x4a2f6e, 0.85));
  const moonLight = new T.DirectionalLight(0xd9e4ff, 0.75);
  moonLight.position.set(-30, 40, -25);
  scene.add(moonLight);
  const warm = new T.PointLight(0xffd9a0, 0, 10, 2);
  warm.position.set(0, 3.4, 2.4);
  scene.add(warm);

  /* ---- moon + stars ---- */
  const moon = new T.Mesh(
    new T.SphereGeometry(9, 24, 18),
    new T.MeshBasicMaterial({ color: 0xfff7dd, fog: false })
  );
  moon.position.set(-90, 66, -170);
  scene.add(moon);
  const moonGlow = sprite(0xfff0c8, 120, 0.5);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);

  const starTex = radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.35, "rgba(255,255,255,0.55)"],
    [1, "rgba(255,255,255,0)"],
  ], 64);

  function starField(count, size, radius) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 0.94); // mostly above horizon
      const r = radius * (0.85 + Math.random() * 0.3);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.9 + 4;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const m = new T.PointsMaterial({
      size,
      map: starTex,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      sizeAttenuation: false,
      color: 0xffffff,
      fog: false,
    });
    const p = new T.Points(geo, m);
    scene.add(p);
    return p;
  }
  const starsA = starField(520, 3.2, 300);
  const starsB = starField(240, 5.0, 300);

  /* ---- clouds ---- */
  const cloudMap = cloudTexture();
  const clouds = new T.Group();
  for (let i = 0; i < 11; i++) {
    const m = new T.SpriteMaterial({
      map: cloudMap,
      color: i % 3 === 0 ? 0xffd7e8 : 0xe8dcff,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const s = new T.Sprite(m);
    const a = (i / 11) * Math.PI * 2 + 0.3;
    const r = 30 + (i % 4) * 7;
    s.position.set(Math.cos(a) * r, 3 + (i % 5) * 3.4, Math.sin(a) * r);
    const sc = 16 + (i % 4) * 6;
    s.scale.set(sc, sc * 0.55, 1);
    clouds.add(s);
  }
  scene.add(clouds);

  /* ---- floating island ---- */
  const island = new T.Group();
  scene.add(island);

  const rock = new T.Mesh(new T.ConeGeometry(6.4, 7.6, 9, 1), mat(0x6a5b96));
  rock.rotation.x = Math.PI;
  rock.position.y = -3.8;
  island.add(rock);

  const rockTip = new T.Mesh(new T.ConeGeometry(1.5, 2.6, 6), mat(0x574a80));
  rockTip.rotation.x = Math.PI;
  rockTip.position.y = -7.4;
  island.add(rockTip);

  const grass = new T.Mesh(new T.CylinderGeometry(6.5, 6.35, 0.9, 9), mat(0x54c98d));
  grass.position.y = -0.45;
  island.add(grass);

  const rim = new T.Mesh(new T.CylinderGeometry(6.55, 6.5, 0.22, 9), mat(0x8ce6b6));
  rim.position.y = -0.02;
  island.add(rim);

  /* trees, rocks, flowers */
  const treeSpots = [
    [-4.3, -2.4, 1.15], [4.7, -1.2, 1.0], [-3.5, 3.1, 0.9],
    [3.9, 3.3, 1.2], [-5.2, 0.9, 0.85], [1.9, -4.7, 1.05], [-1.5, 4.7, 0.95],
  ];
  treeSpots.forEach(([x, z, s]) => {
    const g = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 0.55, 6), mat(0x7a4f3a));
    trunk.position.y = 0.27;
    const leaf = new T.Mesh(new T.ConeGeometry(0.78, 1.95, 7), mat(0x35a878));
    leaf.position.y = 1.4;
    const leaf2 = new T.Mesh(new T.ConeGeometry(0.55, 1.4, 7), mat(0x49c48d));
    leaf2.position.y = 2.15;
    g.add(trunk, leaf, leaf2);
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    g.rotation.y = Math.random() * Math.PI;
    island.add(g);
  });

  const rockSpots = [[-2.6, -4.1], [5.0, 1.9], [-5.4, -1.1], [2.4, 4.4]];
  rockSpots.forEach(([x, z], i) => {
    const r = new T.Mesh(new T.DodecahedronGeometry(0.34 + (i % 2) * 0.16), mat(0x8b7fb8));
    r.position.set(x, 0.16, z);
    r.rotation.set(Math.random(), Math.random(), Math.random());
    island.add(r);
  });

  const flowerMat = new T.MeshBasicMaterial({ color: 0xffe6a6 });
  for (let i = 0; i < 22; i++) {
    const f = new T.Mesh(new T.SphereGeometry(0.075, 6, 5), flowerMat);
    const a = Math.random() * Math.PI * 2;
    const r = 2.2 + Math.random() * 3.9;
    f.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
    island.add(f);
  }

  /* ---- castle ---- */
  const castle = new T.Group();
  castle.position.set(0, 0, -2.5);
  island.add(castle);

  const keep = box(2.7, 1.95, 1.9, 0xf7e8cf);
  keep.position.y = 0.98;
  castle.add(keep);

  const battlement = box(3.0, 0.3, 2.15, 0xffd9a8);
  battlement.position.y = 2.05;
  castle.add(battlement);

  const towers = [];
  [-1.55, 1.55].forEach((x) => {
    const t = new T.Mesh(new T.CylinderGeometry(0.52, 0.56, 3.1, 12), mat(0xf7e8cf, { flatShading: false }));
    t.position.set(x, 1.55, 0.2);
    const roof = new T.Mesh(new T.ConeGeometry(0.72, 1.3, 12), mat(0xff7fb6, { flatShading: false }));
    roof.position.set(x, 3.7, 0.2);
    castle.add(t, roof);
    towers.push({ x, roof });
  });

  /* flag */
  const pole = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.1, 5), mat(0xd9c9a8, { flatShading: false }));
  pole.position.set(0, 2.7, 0);
  const flag = new T.Mesh(new T.PlaneGeometry(0.7, 0.4), new T.MeshBasicMaterial({ color: 0xffe07a, side: T.DoubleSide }));
  flag.position.set(0.35, 3.05, 0);
  castle.add(pole, flag);

  /* windows (they light up when the castle wakes) */
  const winMat = new T.MeshBasicMaterial({ color: 0x6a5f8f });
  const windows = [];
  [[-0.7, 1.35], [0.7, 1.35], [0, 0.8]].forEach(([x, y]) => {
    const w = new T.Mesh(new T.PlaneGeometry(0.34, 0.46), winMat.clone());
    w.position.set(x, y, 0.96);
    castle.add(w);
    windows.push(w);
  });
  [-1.55, 1.55].forEach((x) => {
    const w = new T.Mesh(new T.PlaneGeometry(0.26, 0.34), winMat.clone());
    w.position.set(x, 2.3, 0.72);
    castle.add(w);
    windows.push(w);
  });

  /* gate doors */
  const doors = [];
  [-1, 1].forEach((side) => {
    const pivot = new T.Group();
    pivot.position.set(side * 0.34, 0.58, 0.97);
    const panel = box(0.68, 1.16, 0.1, 0x8b5e3c);
    panel.position.x = -side * 0.34;
    pivot.add(panel);
    castle.add(pivot);
    doors.push({ pivot, side });
  });

  /* ---- wish stars (the collectibles) ---- */
  const orbs = [];
  const ringGeo = new T.TorusGeometry(0.66, 0.028, 6, 26);
  for (let i = 0; i < 8; i++) {
    const g = new T.Group();
    const a = (i / 8) * Math.PI * 2 + 0.5;
    const r = 4.7 + (i % 3) * 1.15;
    g.position.set(Math.cos(a) * r, 1.7 + (i % 4) * 0.95, Math.sin(a) * r);

    const core = new T.Mesh(
      new T.SphereGeometry(0.4, 18, 14),
      new T.MeshLambertMaterial({ color: 0xfff0c0, emissive: 0xffc457, emissiveIntensity: 0.95 })
    );
    g.add(core);

    const halo = sprite(0xffd98a, 3.4, 0.85);
    g.add(halo);

    const ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.55,
      blending: T.AdditiveBlending, depthWrite: false,
    }));
    ring.rotation.x = Math.PI / 2.3;
    g.add(ring);

    const hit = new T.Mesh(
      new T.SphereGeometry(1.0, 8, 6),
      new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    g.add(hit);

    g.userData = { index: i, base: g.position.y, phase: i * 0.8, core, halo, ring, hit, gone: false, active: i === 0, fa: null };
    scene.add(g);
    orbs.push(g);
  }

  /* one star lights up at a time — the player's attention gets a hint */
  function focusOrb(i) {
    orbs.forEach((o) => {
      o.userData.active = o.userData.index === i;
    });
  }

  /* ---- birthday cake (rises later) — with a real 45° slice to cut out ---- */
  const cake = new T.Group();
  cake.position.set(0, -5, 2.5);
  cake.visible = false;
  scene.add(cake);

  const SLICE = Math.PI / 4; // the wedge, facing the camera (+z)

  function pieTier(r, h, y, color, cutColor, parent) {
    /* the cake minus the slice: capped shell + the two crumb faces left behind */
    const g = new T.Group();
    const shell = new T.Mesh(
      new T.CylinderGeometry(r, r, h, 28, 1, false, SLICE / 2, Math.PI * 2 - SLICE),
      mat(color, { flatShading: false })
    );
    shell.position.y = y;
    g.add(shell);
    [-SLICE / 2, SLICE / 2].forEach((a) => {
      const holder = new T.Group();
      const face = new T.Mesh(new T.PlaneGeometry(r, h), mat(cutColor, { flatShading: false, side: T.DoubleSide }));
      face.position.x = r / 2;
      holder.add(face);
      holder.position.y = y;
      holder.rotation.y = a - Math.PI / 2;
      g.add(holder);
    });
    parent.add(g);
  }

  pieTier(1.2, 0.55, 0.28, 0xffdcea, 0xcf9fb8, cake);
  pieTier(0.85, 0.5, 0.8, 0xffc2da, 0xc982a3, cake);
  const drip = new T.Mesh(
    new T.TorusGeometry(0.85, 0.08, 8, 26, Math.PI * 2 - SLICE),
    mat(0xff9ecb, { flatShading: false })
  );
  const dripG = new T.Group();
  dripG.rotation.y = SLICE / 2;
  drip.rotation.x = Math.PI / 2;
  drip.position.y = 1.03;
  dripG.add(drip);
  cake.add(dripG);

  /* the slice itself, filling the notch exactly */
  const wedge = new T.Group();
  cake.add(wedge);
  function wedgeTier(r, h, y, color, cutColor) {
    const g = new T.Group();
    const piece = new T.Mesh(
      new T.CylinderGeometry(r, r, h, 14, 1, false, -SLICE / 2, SLICE),
      mat(color, { flatShading: false })
    );
    piece.position.y = y;
    g.add(piece);
    [-SLICE / 2, SLICE / 2].forEach((a) => {
      const holder = new T.Group();
      const face = new T.Mesh(new T.PlaneGeometry(r, h), mat(cutColor, { flatShading: false, side: T.DoubleSide }));
      face.position.x = r / 2;
      holder.add(face);
      holder.position.y = y;
      holder.rotation.y = a - Math.PI / 2;
      g.add(holder);
    });
    wedge.add(g);
  }
  wedgeTier(1.2, 0.55, 0.28, 0xffdcea, 0xcf9fb8);
  wedgeTier(0.85, 0.5, 0.8, 0xffc2da, 0xc982a3);

  /* matching drip on the slice */
  const wedgeDrip = new T.Mesh(
    new T.TorusGeometry(0.85, 0.08, 8, 10, SLICE),
    mat(0xff9ecb, { flatShading: false })
  );
  const wedgeDripG = new T.Group();
  wedgeDripG.rotation.y = -SLICE / 2;
  wedgeDrip.rotation.x = Math.PI / 2;
  wedgeDrip.position.y = 1.03;
  wedgeDripG.add(wedgeDrip);
  wedge.add(wedgeDripG);

  /* a cherry on top of the slice */
  const cherry = new T.Mesh(
    new T.SphereGeometry(0.09, 12, 10),
    new T.MeshLambertMaterial({ color: 0xff3b66, flatShading: false })
  );
  cherry.position.set(0, 1.13, 0.35);
  wedge.add(cherry);

  /* fat invisible cushion so taps on the slice always land */
  const sliceHit = new T.Mesh(
    new T.SphereGeometry(0.85, 8, 6),
    new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  sliceHit.position.set(0, 0.65, 0.45);
  wedge.add(sliceHit);

  /* the plate the slice lands on */
  const plateG = new T.Group();
  const plate = new T.Mesh(
    new T.CylinderGeometry(1.2, 1.08, 0.06, 24),
    mat(0xfffbfc, { flatShading: false })
  );
  const plateRim = new T.Mesh(
    new T.TorusGeometry(1.16, 0.035, 8, 24),
    mat(0xffd79e, { flatShading: false })
  );
  plateRim.rotation.x = Math.PI / 2;
  plateRim.position.y = 0.03;
  plateG.add(plate, plateRim);
  plateG.position.set(0.25, 0.045, 1.95);
  plateG.visible = false;
  cake.add(plateG);

  const candles = [];
  const flameMap = glowTex();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 0.5;
    const z = Math.sin(a) * 0.5;
    const stick = new T.Mesh(
      new T.CylinderGeometry(0.07, 0.07, 0.44, 8),
      new T.MeshLambertMaterial({ color: i % 2 ? 0x7fd8ff : 0xff8fc4, flatShading: false })
    );
    stick.position.set(x, 1.27, z);
    cake.add(stick);

    const flame = new T.Sprite(new T.SpriteMaterial({
      map: flameMap, color: 0xffd27a, transparent: true, opacity: 0,
      depthWrite: false, blending: T.AdditiveBlending,
    }));
    flame.position.set(x, 1.62, z);
    flame.scale.set(0.42, 0.56, 1);
    cake.add(flame);

    const hit = new T.Mesh(
      new T.SphereGeometry(0.34, 8, 6),
      new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.set(x, 1.4, z);
    hit.userData.candle = i;
    cake.add(hit);

    candles.push({ stick, flame, hit, lit: false, phase: i });
  }

  /* ---- fireflies ---- */
  const flyCount = 46;
  const flyPos = new Float32Array(flyCount * 3);
  const flyMeta = [];
  for (let i = 0; i < flyCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.5 + Math.random() * 6.5;
    const y = 0.5 + Math.random() * 3.4;
    flyPos[i * 3] = Math.cos(a) * r;
    flyPos[i * 3 + 1] = y;
    flyPos[i * 3 + 2] = Math.sin(a) * r;
    flyMeta.push({ a, r, y, sp: 0.1 + Math.random() * 0.3, ph: Math.random() * 9 });
  }
  const flyGeo = new T.BufferGeometry();
  flyGeo.setAttribute("position", new T.BufferAttribute(flyPos, 3));
  const flies = new T.Points(
    flyGeo,
    new T.PointsMaterial({
      size: 0.34, map: starTex, color: 0xffe9a8, transparent: true,
      depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9,
    })
  );
  scene.add(flies);

  /* ---- particle bursts ---- */
  const bursts = [];
  function burst(origin, color, opts = {}) {
    const count = opts.count || 70;
    const speed = opts.speed || 4.2;
    const life = opts.life || 1.5;
    const size = opts.size || 0.3;
    const gravity = opts.gravity == null ? 4.5 : opts.gravity;
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      const s = speed * (0.35 + Math.random() * 0.85);
      vel.push(new T.Vector3(
        Math.sin(ph) * Math.cos(th) * s,
        Math.cos(ph) * s,
        Math.sin(ph) * Math.sin(th) * s
      ));
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const material = new T.PointsMaterial({
      size, map: starTex, color, transparent: true, opacity: 1,
      depthWrite: false, blending: T.AdditiveBlending,
    });
    const points = new T.Points(geo, material);
    points.userData = { vel, age: 0, life, gravity };
    scene.add(points);
    bursts.push(points);
    return points;
  }

  function updateFX(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      const d = p.userData;
      d.age += dt;
      const arr = p.geometry.attributes.position.array;
      for (let j = 0; j < d.vel.length; j++) {
        const v = d.vel[j];
        v.y -= d.gravity * dt;
        arr[j * 3] += v.x * dt;
        arr[j * 3 + 1] += v.y * dt;
        arr[j * 3 + 2] += v.z * dt;
      }
      p.geometry.attributes.position.needsUpdate = true;
      p.material.opacity = Math.max(0, 1 - d.age / d.life);
      if (d.age >= d.life) {
        scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        bursts.splice(i, 1);
      }
    }
  }

  /* --------------------------------------------------------- animation --- */
  let gateOpen = 0;         // 0 → 1
  let cakeRise = -1;        // -1 hidden, 0..1 rising
  let warmGlow = 0;

  function update(t, dt) {
    // twinkling sky
    starsA.material.opacity = 0.75 + Math.sin(t * 1.4) * 0.15;
    starsB.material.opacity = 0.6 + Math.sin(t * 0.9 + 2) * 0.25;

    clouds.rotation.y += dt * 0.008;
    flag.rotation.y = Math.sin(t * 2.4) * 0.35;

    // wish stars — only the active one shines, and shines hard
    for (const o of orbs) {
      const u = o.userData;
      if (u.gone) continue;
      const target = u.active ? 1 : 0.13;
      if (u.fa == null) u.fa = target;
      u.fa += (target - u.fa) * Math.min(1, dt * 6);
      const pulse = u.active ? 1 + Math.sin(t * 3.4 + u.phase) * 0.16 : 1;
      o.position.y = u.base + Math.sin(t * 1.2 + u.phase) * 0.24;
      o.scale.setScalar(0.74 + 0.3 * u.fa);
      u.ring.rotation.z += dt * (0.6 + u.fa * 1.4);
      u.halo.material.opacity = (0.62 + Math.sin(t * 2.6 + u.phase) * 0.24) * u.fa;
      const hs = (0.9 + 2.7 * u.fa) * pulse;
      u.halo.scale.set(hs, hs, 1);
      u.ring.material.opacity = 0.6 * u.fa;
      const k = u.fa;
      u.core.material.color.setRGB(0.42 + 0.58 * k, 0.42 + 0.52 * k, 0.62 + 0.13 * k);
      u.core.material.emissiveIntensity = 1.2 * k * k;
      u.hit.visible = !!u.active;
      const s = 1 + Math.sin(t * 3.1 + u.phase) * 0.06 * u.fa;
      u.core.scale.setScalar(s);
    }

    // fireflies drift
    const fp = flies.geometry.attributes.position.array;
    for (let i = 0; i < flyCount; i++) {
      const m = flyMeta[i];
      m.a += dt * m.sp * 0.35;
      fp[i * 3] = Math.cos(m.a) * m.r;
      fp[i * 3 + 1] = m.y + Math.sin(t * 1.3 + m.ph) * 0.5;
      fp[i * 3 + 2] = Math.sin(m.a) * m.r;
    }
    flies.geometry.attributes.position.needsUpdate = true;
    flies.material.opacity = 0.55 + Math.sin(t * 3) * 0.3;

    // castle waking up
    if (gateOpen < 1) gateOpen = Math.min(1, gateOpen + dt * 0.7);
    doors.forEach(({ pivot, side }) => {
      pivot.rotation.y = -side * 1.75 * easeOutCubic(gateOpen);
    });
    if (warmGlow > 0) {
      windows.forEach((w, i) => {
        const k = Math.min(1, Math.max(0, warmGlow * 2 - i * 0.12));
        w.material.color.setHex(0x6a5f8f).lerp(new T.Color(0xffd98a), k);
      });
      warm.intensity = 0.58 * Math.min(1, warmGlow);
    }

    // cake rising
    if (cakeRise >= 0 && cakeRise < 1) {
      cakeRise = Math.min(1, cakeRise + dt * 0.75);
      const e = easeOutBack(cakeRise);
      cake.position.y = -5 + 5 * e;
      cake.visible = cake.position.y > -4.95;
    }

    // candle flames
    for (const c of candles) {
      if (c.lit) {
        const f = 1 + Math.sin(t * 9 + c.phase) * 0.14;
        c.flame.scale.set(0.42 * f, 0.56 * (2 - f), 1);
        c.flame.material.opacity = 0.85 + Math.sin(t * 11 + c.phase) * 0.15;
      }
    }

    // pull the slice out of the cake and onto its plate
    if (sliceState === "cutting") {
      cutT = Math.min(1, cutT + dt * 0.40);
      const e = easeInOutCubic(cutT);
      wedge.position.set(0.25 * e, Math.sin(e * Math.PI) * 0.45 + 0.04 * e, 1.95 * e);
      wedge.rotation.y = e * 0.55;   // a cut face turns toward the cake-eating camera
      if (e > 0.2) plateG.visible = true;
      if (cutT >= 1) {
        sliceState = "plate";
        cutT = 0;
      }
    }

    updateFX(dt);
    updateGallery(dt, t);
  }

  /* ------------------------------------------------------------- state --- */
  function wakeCastle() {
    gateOpen = Math.max(gateOpen, 0.0001);
    warmGlow = 1;
    towers.forEach(({ roof }) => {
      roof.material.emissive = new T.Color(0xff9ecb);
      roof.material.emissiveIntensity = 0.35;
    });
  }

  function showCake() {
    cake.visible = true;
    cakeRise = 0;
  }

  /* rewind for "play again": dark windows, shut doors, no glow */
  function sleepCastle() {
    gateOpen = 0;
    warmGlow = 0;
    warm.intensity = 0;
    doors.forEach(({ pivot }) => { pivot.rotation.y = 0; });
    windows.forEach((w) => { w.material.color.setHex(0x6a5f8f); });
    towers.forEach(({ roof }) => { roof.material.emissiveIntensity = 0; });
  }

  /* if the player resets while the cake is still rising */
  function hideCake() {
    cakeRise = -1;
    cake.visible = false;
  }

  function lightCandle(i) {
    const c = candles[i];
    if (!c || c.lit) return false;
    c.lit = true;
    c.flame.material.opacity = 0.9;
    return true;
  }

  function puffCandles() {
    candles.forEach((c) => {
      c.lit = false;
      c.flame.material.opacity = 0;
    });
  }

  function hideOrb(i) {
    const o = orbs[i];
    if (!o || o.userData.gone) return false;
    o.userData.gone = true;
    o.visible = false;
    return true;
  }

  function restoreOrbs() {
    orbs.forEach((o) => {
      o.userData.gone = false;
      o.visible = true;
      o.userData.active = false;
    });
  }

  /* ---- the slice ---- */
  let sliceState = "whole";   // whole | cutting | plate | eaten
  let cutT = 0;
  let bites = 0;

  function cutSlice() {
    if (sliceState !== "whole") return false;
    sliceState = "cutting";
    cutT = 0;
    // the candle standing in the slice comes along for the ride
    const c = candles[2];
    if (c && c.stick) {
      // remember where it lives so resetSlice can put it back exactly
      if (!c.home) {
        c.home = {
          stick: { p: c.stick.position.clone(), r: c.stick.rotation.clone(), s: c.stick.scale.clone() },
          flame: c.flame ? { p: c.flame.position.clone(), r: c.flame.rotation.clone(), s: c.flame.scale.clone() } : null,
          hit: c.hit ? { p: c.hit.position.clone(), r: c.hit.rotation.clone(), s: c.hit.scale.clone() } : null,
        };
      }
      wedge.attach(c.stick);
      if (c.flame) wedge.attach(c.flame);
      if (c.hit) wedge.attach(c.hit);
    }
    return true;
  }

  function biteSlice() {
    if (sliceState !== "plate") return false;
    bites++;
    const wp = new T.Vector3();
    sliceHit.getWorldPosition(wp);
    burst(wp, 0xffd7ec, { count: 24, speed: 2.4, life: 0.9, size: 0.22, gravity: 3.6 });
    if (bites >= 3) {
      sliceState = "eaten";
      wedge.visible = false;
    } else {
      const s = bites === 1 ? 0.72 : 0.45;
      wedge.scale.setScalar(s);
    }
    return bites;
  }

  function resetSlice() {
    // candle returns to the cake
    const c = candles[2];
    if (c && c.stick) {
      if (c.stick.parent !== cake) cake.attach(c.stick);
      if (c.flame && c.flame.parent !== cake) cake.attach(c.flame);
      if (c.hit && c.hit.parent !== cake) cake.attach(c.hit);
      const h = c.home;
      if (h) {
        c.stick.position.copy(h.stick.p); c.stick.rotation.copy(h.stick.r); c.stick.scale.copy(h.stick.s);
        if (h.flame && c.flame) { c.flame.position.copy(h.flame.p); c.flame.rotation.copy(h.flame.r); c.flame.scale.copy(h.flame.s); }
        if (h.hit && c.hit) { c.hit.position.copy(h.hit.p); c.hit.rotation.copy(h.hit.r); c.hit.scale.copy(h.hit.s); }
      }
    }
    wedge.position.set(0, 0, 0);
    wedge.rotation.y = 0;
    wedge.scale.setScalar(1);
    wedge.visible = true;
    plateG.visible = false;
    sliceState = "whole";
    cutT = 0;
    bites = 0;
  }

  /* =========================================================================
     CASTLE INTERIOR: THE ROYAL PHOTO GALLERY & THE LETTER CHAMBER
     ========================================================================= */
  const gallery = new T.Group();
  gallery.position.set(0, 100, 0);
  scene.add(gallery);

  // Gallery Ambient Light
  const galleryAmb = new T.AmbientLight(0xffecd6, 0.65);
  gallery.add(galleryAmb);

  // Gallery Hallway (width 9, length 28, height 6)
  // Floor: rich dark polished wood
  const hallFloor = new T.Mesh(new T.BoxGeometry(9, 0.4, 30), mat(0x231a30, { flatShading: false }));
  hallFloor.position.set(0, -0.2, -1);
  gallery.add(hallFloor);

  // Royal Velvet Center Runner Carpet
  const carpet = new T.Mesh(new T.PlaneGeometry(3.2, 27.6), mat(0x522448, { flatShading: false }));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.02, 0);
  gallery.add(carpet);

  // Gold carpet trim lines
  [-1.6, 1.6].forEach((x) => {
    const trim = new T.Mesh(new T.PlaneGeometry(0.08, 27.6), mat(0xd4af37, { flatShading: false }));
    trim.rotation.x = -Math.PI / 2;
    trim.position.set(x, 0.025, 0);
    gallery.add(trim);
  });

  // Ceiling with wooden rafters
  const ceiling = new T.Mesh(new T.BoxGeometry(9, 0.4, 28), mat(0x191224, { flatShading: false }));
  ceiling.position.set(0, 5.8, 0);
  gallery.add(ceiling);

  for (let bz = -12; bz <= 12; bz += 4) {
    const beam = new T.Mesh(new T.BoxGeometry(9, 0.35, 0.4), mat(0x130d1c, { flatShading: false }));
    beam.position.set(0, 5.6, bz);
    gallery.add(beam);
  }

  // Walls
  const wallMat = mat(0x322442, { flatShading: false });
  const leftWall = new T.Mesh(new T.BoxGeometry(0.4, 6, 28), wallMat);
  leftWall.position.set(-4.5, 2.8, 0);
  const rightWall = new T.Mesh(new T.BoxGeometry(0.4, 6, 28), wallMat);
  rightWall.position.set(4.5, 2.8, 0);
  const backWall = new T.Mesh(new T.BoxGeometry(9, 6, 0.4), wallMat);
  backWall.position.set(0, 2.8, 14);
  gallery.add(leftWall, rightWall, backWall);

  // 8 Gilded Photo Frames (4 on left wall, 4 on right wall)
  const frames = [];
  const texLoader = new T.TextureLoader();
  const frameZ = [9, 3, -3, -9];

  // Sconces array for flame animation
  const sconceFlames = [];

  for (let i = 0; i < 8; i++) {
    const isLeft = i < 4;
    const zIdx = i % 4;
    const z = frameZ[zIdx];
    const x = isLeft ? -4.28 : 4.28;
    const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

    const frameGroup = new T.Group();
    frameGroup.position.set(x, 2.3, z);
    frameGroup.rotation.y = rotY;

    // Ornate gold frame
    const border = new T.Mesh(
      new T.BoxGeometry(2.1, 2.7, 0.1),
      mat(0xd4af37, { flatShading: false })
    );
    // Inner matting
    const matting = new T.Mesh(
      new T.PlaneGeometry(1.82, 2.42),
      mat(0xfffef8, { flatShading: false })
    );
    matting.position.z = 0.052;

    // The photo canvas itself
    const photoMat = new T.MeshBasicMaterial({ color: 0xffffff });
    const photoMesh = new T.Mesh(new T.PlaneGeometry(1.68, 2.24), photoMat);
    photoMesh.position.z = 0.055;

    // Load user photo from photos/{i+1}.jpg
    texLoader.load(
      `photos/${i + 1}.jpg`,
      (texture) => {
        photoMesh.material.map = texture;
        photoMesh.material.needsUpdate = true;
      },
      undefined,
      () => {
        // Fallback color if not yet uploaded
        photoMesh.material.color.setHex(0x5a3e75);
      }
    );

    // Small brass plaque
    const plaque = new T.Mesh(
      new T.BoxGeometry(1.1, 0.22, 0.04),
      mat(0xffdf88, { flatShading: false })
    );
    plaque.position.set(0, -1.5, 0.05);

    // Tap cushion
    const hit = new T.Mesh(
      new T.BoxGeometry(2.5, 3.2, 0.6),
      new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.userData = { type: "frame", index: i };

    frameGroup.add(border, matting, photoMesh, plaque, hit);
    gallery.add(frameGroup);
    frames.push({ group: frameGroup, hit, index: i });

    // Sconce above frame with warm light
    const sconceLight = new T.PointLight(0xffcb78, 0.8, 6.5, 1.8);
    sconceLight.position.set(isLeft ? -3.9 : 3.9, 3.9, z);
    gallery.add(sconceLight);

    const sconceFlame = new T.Sprite(new T.SpriteMaterial({
      map: flameMap,
      color: 0xffd27a,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }));
    sconceFlame.scale.set(0.35, 0.48, 1);
    sconceFlame.position.set(isLeft ? -4.05 : 4.05, 3.9, z);
    gallery.add(sconceFlame);
    sconceFlames.push({ flame: sconceFlame, light: sconceLight, phase: Math.random() * Math.PI * 2 });
  }

  // Archway at z = -14 leading to Letter Chamber
  const archL = new T.Mesh(new T.CylinderGeometry(0.32, 0.36, 5.5, 12), mat(0x443258, { flatShading: false }));
  archL.position.set(-2.2, 2.75, -14);
  const archR = new T.Mesh(new T.CylinderGeometry(0.32, 0.36, 5.5, 12), mat(0x443258, { flatShading: false }));
  archR.position.set(2.2, 2.75, -14);
  const archTop = new T.Mesh(new T.BoxGeometry(4.8, 0.5, 0.6), mat(0x443258, { flatShading: false }));
  archTop.position.set(0, 5.25, -14);
  gallery.add(archL, archR, archTop);

  // Cozy Letter Chamber (at z = -20)
  // Floor
  const chamberFloor = new T.Mesh(new T.CylinderGeometry(5.2, 5.2, 0.4, 18), mat(0x231a30, { flatShading: false }));
  chamberFloor.position.set(0, -0.2, -20);
  gallery.add(chamberFloor);

  // Chamber Walls (semicircular alcove)
  const alcoveWall = new T.Mesh(
    new T.CylinderGeometry(5.2, 5.2, 6, 20, 1, true, Math.PI / 2, Math.PI),
    mat(0x2f213e, { flatShading: false, side: T.DoubleSide })
  );
  alcoveWall.position.set(0, 2.8, -20);
  gallery.add(alcoveWall);

  // Mahogany Round Table
  const table = new T.Group();
  table.position.set(0, 0, -20);
  gallery.add(table);

  const tableTop = new T.Mesh(
    new T.CylinderGeometry(1.65, 1.55, 0.1, 24),
    mat(0x351d14, { flatShading: false })
  );
  tableTop.position.y = 1.05;
  const tableCloth = new T.Mesh(
    new T.CylinderGeometry(1.68, 1.68, 0.04, 24),
    mat(0x4c2048, { flatShading: false })
  );
  tableCloth.position.y = 1.09;
  const tableLeg = new T.Mesh(
    new T.CylinderGeometry(0.2, 0.45, 1.0, 12),
    mat(0x28140c, { flatShading: false })
  );
  tableLeg.position.y = 0.5;
  table.add(tableTop, tableCloth, tableLeg);

  // Antique Brass Candlestick on table
  const candleHolder = new T.Mesh(
    new T.CylinderGeometry(0.08, 0.18, 0.28, 12),
    mat(0xd4af37, { flatShading: false })
  );
  candleHolder.position.set(-0.35, 1.25, 0.2);
  const candleWax = new T.Mesh(
    new T.CylinderGeometry(0.045, 0.045, 0.35, 10),
    mat(0xfff6dd, { flatShading: false })
  );
  candleWax.position.set(-0.35, 1.52, 0.2);
  table.add(candleHolder, candleWax);

  // Table Candle Flame + Warm Amber Light
  const tableLight = new T.PointLight(0xffaf52, 1.4, 5.5, 1.8);
  tableLight.position.set(0, 2.0, -19.8);
  gallery.add(tableLight);

  const tableFlame = new T.Sprite(new T.SpriteMaterial({
    map: flameMap,
    color: 0xffd27a,
    blending: T.AdditiveBlending,
    depthWrite: false,
  }));
  tableFlame.scale.set(0.42, 0.58, 1);
  tableFlame.position.set(-0.35, 1.76, 0.2);
  table.add(tableFlame);

  // The Birthday Letter on the table
  const letterMesh = new T.Mesh(
    new T.BoxGeometry(0.85, 0.02, 1.15),
    mat(0xfcf5e8, { flatShading: false })
  );
  letterMesh.position.set(0.18, 1.12, -0.05);
  letterMesh.rotation.y = -0.18;
  table.add(letterMesh);

  // Wax seal on letter
  const waxSeal = new T.Mesh(
    new T.CylinderGeometry(0.1, 0.1, 0.025, 16),
    mat(0x992434, { flatShading: false })
  );
  waxSeal.position.set(0.18, 1.14, -0.05);
  table.add(waxSeal);

  // Sparkles over table
  const letterSparkle = new T.Sprite(new T.SpriteMaterial({
    map: flameMap,
    color: 0xffdf88,
    blending: T.AdditiveBlending,
    depthWrite: false,
  }));
  letterSparkle.scale.set(0.7, 0.7, 1);
  letterSparkle.position.set(0.18, 1.4, -0.05);
  table.add(letterSparkle);

  // Hit box for letter
  const letterHit = new T.Mesh(
    new T.SphereGeometry(1.6, 8, 6),
    new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  letterHit.position.set(0, 1.3, -20);
  letterHit.userData = { type: "letter" };
  gallery.add(letterHit);

  function updateGallery(dt, nowSec) {
    // Sconce lights gentle breathing
    for (const s of sconceFlames) {
      const f = 1 + Math.sin(nowSec * 8 + s.phase) * 0.12;
      s.flame.scale.set(0.35 * f, 0.48 * (2 - f), 1);
      s.light.intensity = 0.75 + Math.sin(nowSec * 10 + s.phase) * 0.15;
    }
    // Table flame breathing
    const tf = 1 + Math.sin(nowSec * 9) * 0.14;
    tableFlame.scale.set(0.42 * tf, 0.58 * (2 - tf), 1);
    tableLight.intensity = 1.3 + Math.sin(nowSec * 11) * 0.2;
    // Sparkle gentle bob
    letterSparkle.position.y = 1.35 + Math.sin(nowSec * 3) * 0.08;
    letterSparkle.material.opacity = 0.75 + Math.sin(nowSec * 4) * 0.25;
  }

  return {
    scene, orbs, cake, candles, castle, island, bursts,
    burst, update, wakeCastle, showCake, sleepCastle, hideCake, lightCandle,
    puffCandles, hideOrb, restoreOrbs, focusOrb,
    cutSlice, biteSlice, resetSlice, sliceHit,
    gallery, frames, letterHit, updateGallery,
    get sliceState() { return sliceState; },
    get cakeTop() { return new T.Vector3(0, 1.6, 2.5); },
  };
}

/* ------------------------------------------------------------- easing --- */
export function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}
export function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
