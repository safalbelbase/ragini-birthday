/* =============================================================================
   audio.js — little procedural sounds, made with WebAudio. No audio files.
   Sound turns on when the player taps "start" (a real gesture), and the
   ♪ button in the corner turns it off again.
   ========================================================================== */

let ctx = null;
let bus = null;
let noiseBuf = null;
let on = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = 0.34;
    bus.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.7);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

function tone({ f = 440, f2 = 0, dur = 0.3, type = "sine", vol = 0.3, at = 0 }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus);
  o.start(t0);
  o.stop(t0 + dur + 0.06);
}

function noise({ dur = 0.4, type = "bandpass", freq = 900, q = 1, vol = 0.3, sweep = 0, at = 0 }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/* ------------------------------------------------------------------------
   music — a soft piano "Happy Birthday", looping quietly under everything.
   ------------------------------------------------------------------------ */
const BPM = 78;
const SPB = 60 / BPM;

/* [midi, beats, chord?] — one pass of the tune, 16 beats plus a breath */
const TUNE = [
  [67, 0.75, "C"], [67, 0.25], [69, 0.5], [67, 0.5], [72, 1], [71, 1], [0, 1],
  [67, 0.75, "F"], [67, 0.25], [69, 0.5], [67, 0.5], [74, 1], [72, 1], [0, 1],
  [67, 0.75, "C"], [67, 0.25], [79, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [71, 1],
  [77, 0.75, "G"], [76, 0.25], [74, 0.5], [71, 0.5], [72, 2, "C"], [0, 2],
];

const CHORDS = { C: [48, 52, 55], F: [41, 45, 48], G: [43, 47, 50] };

let musicTimer = null;
let nextAt = 0;
let step = 0;

function pianoNote(midi, at, dur, vol) {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const tail = Math.max(0.4, dur * 1.9);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.014);
  g.gain.exponentialRampToValueAtTime(0.0001, at + tail);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  g.connect(lp).connect(bus);
  [[1, 1], [2, 0.4], [3, 0.14], [4, 0.06], [5, 0.03]].forEach(([h, a]) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f * h, at);
    o.detune.setValueAtTime((h - 3) * 1.5, at);
    const pg = ctx.createGain();
    pg.gain.value = a;
    o.connect(pg).connect(g);
    o.start(at);
    o.stop(at + tail + 0.05);
  });
}

function scheduleMusic() {
  if (!ctx) return;
  const horizon = ctx.currentTime + 1.5;
  while (nextAt < horizon) {
    const [midi, beats, chord] = TUNE[step];
    const dur = beats * SPB;
    if (midi) pianoNote(midi, nextAt, dur, 0.095);
    if (chord) CHORDS[chord].forEach((m, i) => pianoNote(m, nextAt + i * 0.014, dur * 2.4, 0.04));
    nextAt += dur;
    step = (step + 1) % TUNE.length;
  }
}

function startMusic() {
  if (!ctx || musicTimer) return;
  nextAt = ctx.currentTime + 0.5;
  step = 0;
  scheduleMusic();
  musicTimer = setInterval(scheduleMusic, 500);
}

export function setOn(v) {
  on = !!v;
  if (!on) {
    /* suspending freezes the clock, so the music pauses mid-phrase and
       picks straight back up instead of racing ahead */
    if (ctx && ctx.state === "running") ctx.suspend();
    return;
  }
  const c = ensure();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  startMusic();
  sfx("chime");
}

export function isOn() {
  return on;
}

export function sfx(name) {
  if (!on) return;
  switch (name) {
    case "pop": // a wish star
      tone({ f: 660, f2: 1500, dur: 0.26, type: "triangle", vol: 0.3 });
      tone({ f: 1320, dur: 0.2, type: "sine", vol: 0.14, at: 0.04 });
      break;
    case "chime":
      tone({ f: 1180, dur: 0.5, type: "triangle", vol: 0.2 });
      tone({ f: 1770, dur: 0.6, type: "sine", vol: 0.1, at: 0.06 });
      break;
    case "light": // a candle
      tone({ f: 880, f2: 1760, dur: 0.18, type: "sine", vol: 0.22 });
      noise({ dur: 0.14, freq: 3400, q: 2, vol: 0.06 });
      break;
    case "puff": // candles out
      noise({ dur: 0.5, type: "lowpass", freq: 1400, q: 0.6, vol: 0.28, sweep: -1000 });
      break;
    case "boom": // firework
      noise({ dur: 0.7, type: "lowpass", freq: 1600, q: 0.7, vol: 0.4, sweep: -1200 });
      tone({ f: 150, f2: 45, dur: 0.5, type: "sine", vol: 0.35 });
      break;
    case "sparkle":
      [0, 0.09, 0.18, 0.27].forEach((at, i) =>
        tone({ f: 1046 * Math.pow(1.26, i), dur: 0.3, type: "triangle", vol: 0.16, at })
      );
      break;
    case "whoosh":
      noise({ dur: 0.9, type: "bandpass", freq: 420, q: 0.8, vol: 0.16, sweep: 900 });
      break;
    case "cut": // the knife through the cake
      noise({ dur: 0.28, type: "bandpass", freq: 1500, q: 1.4, vol: 0.18, sweep: 900 });
      tone({ f: 300, f2: 120, dur: 0.22, type: "triangle", vol: 0.12, at: 0.05 });
      break;
    case "nom": // a bite
      noise({ dur: 0.16, type: "lowpass", freq: 620, q: 0.9, vol: 0.22 });
      tone({ f: 190, dur: 0.1, type: "triangle", vol: 0.12 });
      tone({ f: 140, dur: 0.1, type: "triangle", vol: 0.1, at: 0.07 });
      break;
    case "tap":
      tone({ f: 520, dur: 0.09, type: "sine", vol: 0.14 });
      break;
    default:
      break;
  }
}
