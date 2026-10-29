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
  say("the kingdom is open. one star at a time is glowing.");
}

/* ------------------------------------------------------------- the bar --- */
const barWrap = $("#barWrap");
const barLine = $("#barLine");
const barSub = $("#barSub");
const barBtn = $("#barBtn");
const barBtn2 = $("#barBtn2");
const pillWishes = $("#pillWishes");
let barPhase = "wish";   // wish | cut | castle

function setBar({ line, sub, btn, btn2, phase }) {
  barLine.textContent = line;
  if (sub) { barSub.textContent = sub; barSub.hidden = false; }
  else barSub.hidden = true;
  if (btn) { barBtn.textContent = btn; barBtn.hidden = false; }
  else barBtn.hidden = true;
  if (btn2) { barBtn2.textContent = btn2; barBtn2.hidden = false; }
  else barBtn2.hidden = true;
  barBtn.classList.toggle("btn--ghost", phase === "castle");
  barPhase = phase;
  barWrap.hidden = false;
}

barBtn.addEventListener("click", () => {
  sfx("tap");
  barWrap.hidden = true;
  if (barPhase === "wish") game.makeWish();
  else if (barPhase === "cut") game.cutCake();
  else if (barPhase === "castle") playAgain();
});

function playAgain() {
  barWrap.hidden = true;
  pillWishes.hidden = true;
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
function closeWishesPanel() {
  $("#wishes").hidden = true;
  /* the castle bar should still be there when she comes back out */
  if (barPhase === "castle" && game && game.state === "castle") barWrap.hidden = false;
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
        pillWishes.hidden = false;
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
        /* the wish moment: her time, unhurried */
        setBar({ line: TEXT.wishLine, sub: TEXT.wishSub, btn: TEXT.wishBtn, phase: "wish" });
        showHint(TEXT.wishLine, 999000, TEXT.cakeLine);
        say(`all candles are lit. ${TEXT.wishLine}.`);
      },
      onCutReady() {
        setBar({ line: TEXT.cutLine, btn: TEXT.cutBtn, phase: "cut" });
        showHint(TEXT.cutLine, 999000);
        say(TEXT.cutLine);
      },
      onEatReady() {
        showHint(TEXT.eatHint, 999000, TEXT.cutLine);
        progress.textContent = "nom 0 / 3";
      },
      onBite(n) {
        progress.textContent = `nom ${n} / 3`;
        showCard(TEXT.biteLines[n - 1] || "✦");
      },
      onCastleAhead() {
        setBar({
          line: TEXT.afterEat,
          btn: TEXT.againBtn,
          btn2: TEXT.readBtn,
          phase: "castle",
        });
        say("one last thing is waiting in the castle.");
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
  pillWishes.addEventListener("click", showWishes);
  $("#wishesClose").addEventListener("click", closeWishesPanel);
  $("#wishes").addEventListener("click", (e) => {
    if (e.target.id === "wishes") closeWishesPanel();
  });

  soundBtn.addEventListener("click", () => {
    setOn(!isOn());
    paintSound();
  });
  paintSound();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCard();
      closeWishesPanel();
    }
  });
}

boot();
