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
    new T.MeshBasicMaterial({ color: 0xfff7dd })
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
      new T.CylinderGeometry(r, r, h, 22, 1, false, SLICE / 2, Math.PI * 2 - SLICE),
      mat(color, { flatShading: false })
    );
    shell.position.y = y;
    g.add(shell);
    [-SLICE / 2, SLICE / 2].forEach((a) => {
      const holder = new T.Group();
      const face = new T.Mesh(new T.PlaneGeometry(r, h), mat(cutColor, { flatShading: false }));
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
      new T.CylinderGeometry(r, r, h, 10, 1, false, -SLICE / 2, SLICE),
      mat(color, { flatShading: false })
    );
    piece.position.y = y;
    g.add(piece);
    [-SLICE / 2, SLICE / 2].forEach((a) => {
      const holder = new T.Group();
      const face = new T.Mesh(new T.PlaneGeometry(r, h), mat(cutColor, { flatShading: false }));
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

  /* a cherry on top of the slice, because obviously */
  const cherry = new T.Mesh(
    new T.SphereGeometry(0.09, 10, 8),
    new T.MeshLambertMaterial({ color: 0xff5d7d, flatShading: false })
  );
  cherry.position.set(0.42, 1.14, 0);
  wedge.add(cherry);

  /* fat invisible cushion so taps on the slice always land */
  const sliceHit = new T.Mesh(
    new T.SphereGeometry(0.72, 8, 6),
    new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  sliceHit.position.set(0.5, 0.6, 0);
  wedge.add(sliceHit);

  /* the plate the slice lands on, far enough that the slice doesn't kiss the cake */
  const plate = new T.Mesh(
    new T.CylinderGeometry(1.04, 0.96, 0.07, 18),
    mat(0xf3eef7, { flatShading: false })
  );
  plate.position.set(-2.2, 0.045, 1.1);
  plate.visible = false;
  cake.add(plate);

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

    // wish stars bob and spin (only the active one shines)
    for (const o of orbs) {
      const u = o.userData;
      if (u.gone) continue;
      const target = u.active ? 1 : 0.14;
      if (u.fa == null) u.fa = target;
      u.fa += (target - u.fa) * Math.min(1, dt * 6);
      o.position.y = u.base + Math.sin(t * 1.2 + u.phase) * 0.24;
      u.ring.rotation.z += dt * 1.1;
      u.halo.material.opacity = (0.65 + Math.sin(t * 2.6 + u.phase) * 0.2) * u.fa;
      u.ring.material.opacity = 0.55 * u.fa;
      u.core.material.emissiveIntensity = 0.95 * u.fa + 0.05;
      u.hit.visible = !!u.active;
      const s = 1 + Math.sin(t * 3.1 + u.phase) * 0.06;
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
      cutT = Math.min(1, cutT + dt * 0.85);
      const e = easeInOutCubic(cutT);
      wedge.position.set(-2.2 * e, Math.sin(e * Math.PI) * 0.9 + 0.08 * e, 1.1 * e);
      wedge.rotation.y = e * -0.94;   // a cut face turns toward the cake-eating camera
      if (e > 0.55) plate.visible = true;
      if (cutT >= 1) {
        sliceState = "plate";
        cutT = 0;
      }
    }

    updateFX(dt);
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
    plate.visible = false;
    sliceState = "whole";
    cutT = 0;
    bites = 0;
  }

  return {
    scene, orbs, cake, candles, castle, island, bursts,
    burst, update, wakeCastle, showCake, sleepCastle, hideCake, lightCandle,
    puffCandles, hideOrb, restoreOrbs, focusOrb,
    cutSlice, biteSlice, resetSlice, sliceHit,
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
