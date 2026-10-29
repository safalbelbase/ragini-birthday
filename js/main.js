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
const galleryBar = $("#galleryBar");
const walkBtn = $("#walkBtn");
const toLetterBtn = $("#toLetterBtn");
const photoModal = $("#photoModal");
const photoTitle = $("#photoTitle");
const photoImg = $("#photoImg");
const photoClose = $("#photoClose");
const letterModal = $("#letterModal");
const letterText = $("#letterText");
const letterAgainBtn = $("#letterAgainBtn");
const letterWishesBtn = $("#letterWishesBtn");
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
  else if (barPhase === "castle") game.enterCastle();
});

barBtn2.addEventListener("click", () => {
  sfx("tap");
  showWishes();
});

function playAgain() {
  barWrap.hidden = true;
  galleryBar.hidden = true;
  photoModal.hidden = true;
  letterModal.hidden = true;
  pillWishes.hidden = true;
  progress.textContent = TEXT.progress(0, 8);
  showHint(TEXT.hint);
  game.reset();
  sfx("chime");
}

function openPhotoModal(index) {
  photoTitle.textContent = TEXT.photoTitles[index] || `memory ${index + 1}`;
  photoImg.src = `photos/${index + 1}.jpg`;
  photoModal.hidden = false;
  photoModal.classList.remove("is-in");
  void photoModal.offsetWidth;
  photoModal.classList.add("is-in");
}

function closePhotoModal() {
  photoModal.hidden = true;
}

function openLetterModal() {
  letterText.textContent = "";
  TEXT.letter.forEach((para) => {
    const p = document.createElement("p");
    p.textContent = para;
    letterText.appendChild(p);
  });
  letterModal.hidden = false;
  letterModal.classList.remove("is-in");
  void letterModal.offsetWidth;
  letterModal.classList.add("is-in");
  sfx("sparkle");
}

function closeLetterModal() {
  letterModal.hidden = true;
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
          btn: TEXT.enterCastleBtn,
          btn2: TEXT.readBtn,
          phase: "castle",
        });
        say("one last thing is waiting in the castle.");
      },
      onCastleEntered() {
        barWrap.hidden = true;
        galleryBar.hidden = false;
        progress.textContent = TEXT.galleryPill;
        showHint(TEXT.galleryHint, 8000);
      },
      onPhoto(index) {
        openPhotoModal(index);
      },
      onLetter() {
        openLetterModal();
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

  walkBtn.addEventListener("click", () => game.walkForward());
  toLetterBtn.addEventListener("click", () => game.walkToLetter());
  photoClose.addEventListener("click", closePhotoModal);
  photoModal.addEventListener("click", (e) => {
    if (e.target.id === "photoModal") closePhotoModal();
  });

  letterAgainBtn.addEventListener("click", playAgain);
  letterWishesBtn.addEventListener("click", () => {
    closeLetterModal();
    showWishes();
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
      closePhotoModal();
      closeLetterModal();
    }
  });
}

boot();
