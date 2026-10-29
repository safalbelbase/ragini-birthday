/* =============================================================================
   main.js — the buttons and the words. The 3D game lives in game.js.
   ========================================================================== */

import { TEXT } from "./content.js";
import { setOn, isOn, sfx } from "./audio.js";
import { createGame } from "./game.js";

const $ = (s) => document.querySelector(s);
const live = $("#live");

function say(msg) {
  if (live) live.textContent = msg;
}

/* --------------------------------------------------------- fill the copy -- */
function paintText() {
  document.querySelectorAll("[data-c]").forEach((el) => {
    const v = TEXT[el.dataset.c];
    if (typeof v === "string") el.textContent = v;
  });
  document.title = `${TEXT.title} · ${TEXT.subtitle}`;
}

/* ------------------------------------------------------------- elements -- */
const startScreen = $("#startScreen");
const hud = $("#hud");
const progress = $("#progress");
const hint = $("#hint");
const card = $("#card");
const cardText = $("#cardText");
const barWrap = $("#barWrap");
const barLine = $("#barLine");
const finale = $("#finale");
const noGl = $("#noGl");
const soundBtn = $("#soundBtn");

let cardTimer = 0;
let hintTimer = 0;
let game = null;

/* ---------------------------------------------------------------- cards -- */
function showCard(text) {
  cardText.textContent = text;
  card.hidden = false;
  card.classList.remove("is-in");
  void card.offsetWidth;
  card.classList.add("is-in");
  say(text);
  clearTimeout(cardTimer);
  cardTimer = setTimeout(closeCard, 4200);
}

function closeCard() {
  if (card.hidden) return;
  clearTimeout(cardTimer);
  card.hidden = true;
  if (game) game.cardClosed();
}

card.addEventListener("click", closeCard);

function showHint(text, ms, fallback) {
  hint.textContent = text;
  clearTimeout(hintTimer);
  if (ms) hintTimer = setTimeout(() => { hint.textContent = fallback || TEXT.hint; }, ms);
}

/* --------------------------------------------------------------- start --- */
function startGame() {
  setOn(true);
  sfx("sparkle");
  startScreen.classList.remove("is-on");
  startScreen.hidden = true;
  hud.hidden = false;
  progress.textContent = TEXT.progress(0, 8);
  showHint(TEXT.hint);
  game.start();
  say("the kingdom is open. tap the glowing stars.");
}

/* -------------------------------------------------------------- finale --- */
function showFinale() {
  $("#finaleTitle").textContent = TEXT.finaleTitle;
  const wrap = $("#finaleLines");
  wrap.textContent = "";
  TEXT.finaleLines.forEach((line, i) => {
    const p = document.createElement("p");
    p.textContent = line;
    p.style.animationDelay = `${0.25 + i * 0.35}s`;
    wrap.appendChild(p);
  });
  finale.hidden = false;
  finale.classList.remove("is-in");
  void finale.offsetWidth;
  finale.classList.add("is-in");
  hud.hidden = true;
  sfx("sparkle");
  say(TEXT.finaleTitle);
}

function playAgain() {
  finale.hidden = true;
  hud.hidden = false;
  barWrap.hidden = true;
  progress.textContent = TEXT.progress(0, 8);
  showHint(TEXT.hint);
  game.reset();
  sfx("chime");
}

/* ------------------------------------------------------- wishes again ---- */
function showWishes() {
  const box = $("#wishesList");
  box.textContent = "";
  TEXT.stars.forEach((w) => {
    const p = document.createElement("p");
    p.textContent = w;
    box.appendChild(p);
  });
  const panel = $("#wishes");
  panel.hidden = false;
  panel.classList.remove("is-in");
  void panel.offsetWidth;
  panel.classList.add("is-in");
}
function hideWishes() {
  $("#wishes").hidden = true;
  if (!finale.hidden) return;
}

/* --------------------------------------------------------------- sound --- */
function paintSound() {
  soundBtn.setAttribute("aria-pressed", String(isOn()));
  soundBtn.textContent = "♪";
  soundBtn.setAttribute("aria-label", isOn() ? TEXT.soundOn : TEXT.soundOff);
}

/* ----------------------------------------------------------------- boot --- */
function boot() {
  paintText();

  const canvas = $("#scene");
  game = createGame({
    canvas,
    callbacks: {
      onStar(i, n, total) {
        progress.textContent = TEXT.progress(n, total);
        showCard(TEXT.stars[i] || "✦");
        if (n === total) showHint(TEXT.allFoundLine, 5000);
      },
      onAllStars() {
        showHint(`${TEXT.allFoundLine} · ${TEXT.allFoundSub}`, 5000);
      },
      onCakeReady() {
        showHint(TEXT.cakeLine, 999000, TEXT.cakeLine);
        progress.textContent = "cake ✦ 0 / 8";
      },
      onCandleLit(n, total) {
        progress.textContent = `cake ✦ ${n} / ${total}`;
        say(`candles lit ${n} of ${total}`);
      },
      onAllCandles() {
        barLine.textContent = TEXT.wishLine;
        barWrap.hidden = false;
        showHint(TEXT.wishLine, 999000, TEXT.cakeLine);
        say("all candles are lit. make a wish.");
      },
      onFinale() {
        showFinale();
      },
    },
  });

  if (!game) {
    startScreen.hidden = true;
    noGl.hidden = false;
    return;
  }
  window.__kingdom = game;   // handy for poking around in the console

  $("#startBtn").addEventListener("click", startGame);
  $("#wishBtn").addEventListener("click", () => {
    barWrap.hidden = true;
    game.makeWish();
  });
  $("#againBtn").addEventListener("click", playAgain);
  $("#readBtn").addEventListener("click", showWishes);
  $("#wishesClose").addEventListener("click", () => { $("#wishes").hidden = true; });
  $("#wishes").addEventListener("click", (e) => {
    if (e.target.id === "wishes") $("#wishes").hidden = true;
  });

  soundBtn.addEventListener("click", () => {
    setOn(!isOn());
    paintSound();
  });
  paintSound();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCard();
      $("#wishes").hidden = true;
    }
  });
}

boot();
