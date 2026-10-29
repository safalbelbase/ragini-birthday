/* =============================================================================
   game.js — the game part: camera, tapping, collecting, the wish.
   The UI (main.js) only talks to it through callbacks and a few commands.
   ========================================================================== */

import { createWorld, easeInOutCubic } from "./world.js";
import { sfx } from "./audio.js";

const HOME = { theta: 0.55, phi: 1.16, radius: 15, target: [0, 1.7, 0] };
const CAKE_VIEW = { theta: 0.1, phi: 1.24, radius: 7.4, target: [0, 1.35, 2.3] };

export function createGame({ canvas, callbacks }) {
  const cb = callbacks || {};
  const reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------- renderer --- */
  let renderer;
  try {
    const dpr = window.devicePixelRatio || 1;
    renderer = new window.THREE.WebGLRenderer({
      canvas,
      /* high-DPI screens don't need MSAA, and cheap phones get the frame back */
      antialias: dpr < 1.8,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (e) {
    return null; // no WebGL on this device
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = window.THREE.sRGBEncoding;

  const world = createWorld();
  const scene = world.scene;

  const camera = new window.THREE.PerspectiveCamera(52, 1, 0.1, 800);

  /* ----------------------------------------------------------- camera ---- */
  const cam = {
    theta: HOME.theta,
    phi: HOME.phi,
    radius: HOME.radius,
    target: new window.THREE.Vector3(...HOME.target),
  };
  let tween = null;
  let autoSpin = true;
  let lastTouch = 0;

  function applyCamera() {
    const s = new window.THREE.Spherical(cam.radius, cam.phi, cam.theta);
    camera.position.setFromSpherical(s).add(cam.target);
    camera.lookAt(cam.target);
  }

  function flyTo(dest, dur, done) {
    if (reduced) {
      cam.theta = dest.theta;
      cam.phi = dest.phi;
      cam.radius = dest.radius;
      cam.target.set(...dest.target);
      applyCamera();
      if (done) done();
      return;
    }
    sfx("whoosh");
    tween = {
      from: {
        theta: cam.theta,
        phi: cam.phi,
        radius: cam.radius,
        target: cam.target.clone(),
      },
      to: dest,
      t: 0,
      dur,
      done,
    };
  }

  function stepTween(dt) {
    if (!tween) return;
    tween.t += dt;
    const k = easeInOutCubic(Math.min(1, tween.t / tween.dur));
    cam.theta = tween.from.theta + (tween.to.theta - tween.from.theta) * k;
    cam.phi = tween.from.phi + (tween.to.phi - tween.from.phi) * k;
    cam.radius = tween.from.radius + (tween.to.radius - tween.from.radius) * k;
    cam.target.lerpVectors(tween.from.target, new window.THREE.Vector3(...tween.to.target), k);
    if (tween.t >= tween.dur) {
      const done = tween.done;
      tween = null;
      if (done) done();
    }
  }

  /* ------------------------------------------------------------ input ---- */
  const pointers = new Map();
  let downAt = 0;
  let moved = 0;
  let dragging = false;
  let multi = false;
  let pinchStart = 0;
  let pinchRadius = 0;
  const dbg = { down: 0, up: 0, tap: 0, cond: null, hits: null };

  function ndc(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: -((e.clientY - r.top) / r.height) * 2 + 1,
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    downAt = performance.now();
    moved = 0;
    dragging = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointers */ }
    dbg.down++;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    multi = pointers.size >= 2;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      pinchRadius = cam.radius;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart > 0) {
        cam.radius = Math.max(5.5, Math.min(26, (pinchRadius * pinchStart) / d));
        applyCamera();
      }
      return;
    }

    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 8) {
      dragging = true;
      /* don't orphan a scripted flight: run its done() before killing the tween */
      if (tween && tween.done) { const d = tween.done; tween = null; d(); }
      else tween = null;
      autoSpin = false;
      lastTouch = performance.now();
      cam.theta -= dx * 0.0062;
      cam.phi = Math.max(0.45, Math.min(1.5, cam.phi - dy * 0.005));
      applyCamera();
    }
  });

  function endPointer(e) {
    dbg.up++;
    const wasDrag = dragging;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    dbg.cond = {
      wasDrag, size: pointers.size,
      dt: Math.round(performance.now() - downAt),
      moved: Math.round(moved),
      type: e.type,
    };
    if (!wasDrag && !multi && pointers.size === 0 && performance.now() - downAt < 700 && moved < 10) {
      dbg.tap++;
      tap(e);
    }
    dragging = false;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));

  /* --------------------------------------------------------- raycasting -- */
  const ray = new window.THREE.Raycaster();

  function pick(list, e) {
    ray.setFromCamera(new window.THREE.Vector2(ndc(e).x, ndc(e).y), camera);
    const hits = ray.intersectObjects(list, false);
    return hits.length ? hits[0].object : null;
  }

  function tap(e) {
    lastTouch = performance.now();

    if (state === "collect") {
      const targets = world.orbs.filter((o) => !o.userData.gone).map((o) => o.userData.hit);
      const hit = pick(targets, e);
      const p = ndc(e);
      dbg.hits = { n: targets.length, got: !!hit, e: [Math.round(p.x * 100), Math.round(p.y * 100)] };
      if (hit) {
        const orb = world.orbs.find((o) => o.userData.hit === hit);
        if (orb) collect(orb);
      }
      return;
    }

    if (state === "candles") {
      /* candle hit spheres overlap, so walk the intersections and light
         the first one that is not already lit */
      ray.setFromCamera(new window.THREE.Vector2(ndc(e).x, ndc(e).y), camera);
      const hits = ray.intersectObjects(world.candles.map((c) => c.hit), false);
      for (const h of hits) {
        if (lightCandle(h.object.userData.candle)) break;
      }
    }
  }

  /* ------------------------------------------------------------- state --- */
  let state = "idle"; // idle | collect | flight | candles | wish | finale
  let found = 0;
  const total = 8;
  let pendingFlight = false;
  let timers = [];

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function collect(orb) {
    const i = orb.userData.index;
    if (!world.hideOrb(i)) return;
    sfx("pop");
    const p = orb.position.clone();
    world.burst(p, 0xffe08a, { count: 34, speed: 3.2, life: 1.1, size: 0.3, gravity: 3 });
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
    found++;
    if (cb.onStar) cb.onStar(i, found, total);
    if (found >= total) pendingFlight = true;
  }

  /* called by the UI when the wish card has been dismissed */
  function cardClosed() {
    if (!pendingFlight || state !== "collect") return;
    pendingFlight = false;
    state = "flight";
    sfx("sparkle");
    if (cb.onAllStars) cb.onAllStars();
    flyTo(CAKE_VIEW, reduced ? 0 : 2.1, () => {
      world.wakeCastle();
      world.showCake();
      state = "candles";
      if (cb.onCakeReady) onCakeReadySafe();
    });
  }

  function onCakeReadySafe() {
    if (cb.onCakeReady) cb.onCakeReady();
  }

  function lightCandle(i) {
    if (state !== "candles") return false;
    if (!world.lightCandle(i)) return false;
    sfx("light");
    const c = world.candles[i];
    const p = c.flame.getWorldPosition(new window.THREE.Vector3());
    world.burst(p, 0xffd27a, { count: 16, speed: 1.7, life: 0.7, size: 0.2, gravity: 1.5 });
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
    const lit = world.candles.filter((x) => x.lit).length;
    if (cb.onCandleLit) cb.onCandleLit(lit, total);
    if (lit === total) {
      sfx("chime");
      state = "wish";
      if (cb.onAllCandles) cb.onAllCandles();
    }
    return true;
  }

  /* the big finish */
  function makeWish() {
    if (state !== "wish") return;
    state = "finale";
    sfx("puff");
    world.puffCandles();

    const colors = [0xff8fc4, 0xffe08a, 0x8ad8ff, 0xc9a7ff, 0xffffff, 0x7fffc4];
    const base = new window.THREE.Vector3(0, 4.5, 2.3);
    const shots = reduced ? 3 : 7;
    for (let i = 0; i < shots; i++) {
      later(() => {
        const p = base
          .clone()
          .add(new window.THREE.Vector3(
            (Math.random() - 0.5) * 9,
            Math.random() * 4.5,
            (Math.random() - 0.5) * 7
          ));
        world.burst(p, colors[i % colors.length], {
          count: 110, speed: 7, life: 2.2, size: 0.5, gravity: 3.4,
        });
        sfx("boom");
        if (navigator.vibrate) { try { navigator.vibrate([0, 30, 40, 30]); } catch (_) {} }
      }, 260 + i * 330);
    }

    // gentle pull back so you can see the whole kingdom
    flyTo({ theta: 0.5, phi: 1.12, radius: 13.5, target: [0, 2.2, 1.2] }, reduced ? 0 : 2.4);

    later(() => {
      if (cb.onFinale) cb.onFinale();
    }, 300 + shots * 330 + 700);
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    pendingFlight = false;
    found = 0;
    world.restoreOrbs();
    world.puffCandles();
    world.hideCake();
    world.sleepCastle();
    state = "idle";
    flyTo(HOME, reduced ? 0 : 1.4, () => {
      state = "collect";
      autoSpin = true;
    });
    if (reduced) {
      state = "collect";
      autoSpin = true;
    }
  }

  function begin() {
    state = "collect";
    autoSpin = true;
    flyTo(HOME, reduced ? 0 : 1.6);
    if (reduced) applyCamera();
  }

  /* ------------------------------------------------------------- loop ---- */
  let t = 0;
  let last = performance.now();
  let raf = 0;
  let running = false;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden) return;
    t += dt;

    stepTween(dt);

    // slow drift until the player grabs the world
    if (autoSpin && !tween && state !== "finale" && now - lastTouch > 2200) {
      cam.theta += dt * 0.045;
      applyCamera();
    }

    world.update(t, dt);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // portrait phones get a wider view so the island always fits
    camera.fov = camera.aspect < 0.72 ? 64 : camera.aspect < 1 ? 57 : 50;
    camera.updateProjectionMatrix();
    applyCamera();
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
  });

  resize();
  applyCamera();
  running = true;
  raf = requestAnimationFrame(frame);

  /* where the wish stars are on screen right now (handy for testing) */
  function orbScreens() {
    scene.updateMatrixWorld(true);
    return world.orbs
      .filter((o) => !o.userData.gone)
      .map((o) => {
        const v = o.position.clone().project(camera);
        return {
          i: o.userData.index,
          x: (v.x * 0.5 + 0.5) * window.innerWidth,
          y: (-v.y * 0.5 + 0.5) * window.innerHeight,
          front: v.z < 1,
        };
      });
  }

  /* candle positions on screen (same trick as orbScreens, for testing) */
  function candleScreens() {
    scene.updateMatrixWorld(true);
    const v = new window.THREE.Vector3();
    return world.candles.map((c) => {
      c.hit.getWorldPosition(v);
      const p = v.clone().project(camera);
      return {
        i: c.hit.userData.candle,
        x: (p.x * 0.5 + 0.5) * window.innerWidth,
        y: (-p.y * 0.5 + 0.5) * window.innerHeight,
        lit: c.lit,
      };
    });
  }

  /* debug helper: aim a ray at a screen point and say what it hits */
  function debugRay(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1;
    const ny = -((cy - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(new window.THREE.Vector2(nx, ny), camera);
    const targets = world.orbs.filter((o) => !o.userData.gone).map((o) => o.userData.hit);
    const hits = ray.intersectObjects(targets, false);
    return {
      state,
      targets: targets.length,
      hits: hits.length,
      camPos: camera.position.toArray().map((v) => +v.toFixed(2)),
      hitIds: hits.map((h) => world.orbs.findIndex((o) => o.userData.hit === h.object)),
    };
  }

  return {
    start: begin,
    cardClosed,
    makeWish,
    reset,
    orbScreens,
    candleScreens,
    debugRay,
    dbg,
    get state() { return state; },
    get found() { return found; },
    dispose() {
      cancelAnimationFrame(raf);
      running = false;
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}
