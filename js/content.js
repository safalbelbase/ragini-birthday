/* =============================================================================
   content.js — every word the player reads. This is the only file you edit.
   Keep it short and simple. Lines in [square brackets] are yours to replace.
   ========================================================================== */

export const TEXT = {
  eyebrow: "a birthday surprise",
  title: "a little birthday kingdom",
  subtitle: "for Ragini",
  startBtn: "start the magic",
  startNote: "turn your sound on ✦ it is nicer with it",

  hint: "drag to look around · tap the glowing stars",
  cardTap: "tap anywhere to keep going",

  /* the 8 stars — each one pops a little wish, in order */
  stars: [
    "wishing the coolest bestie ever the happiest birthday.",
    "may your year be as good as my best jokes.",
    "wishing you good food, great sleep and zero boring days.",
    "may today be full of cake, gifts and happy people.",
    "may you find time in your busy ignoring schedule to reply today.",
    "may all your wishes come true, even the secret ones.",
    "wishing your phone full battery every single time i text.",
    "happy birthday, Ragini.",
  ],

  allFoundLine: "you found them all",
  allFoundSub: "the castle is waking up…",
  cakeLine: "tap the candles to light them",
  wishBtn: "make a wish",
  wishLine: "close your eyes and tap ✦",

  finaleEyebrow: "and so…",
  finaleTitle: "happy birthday, Ragini",
  finaleLines: [
    "eight stars, one cake, one very happy bestie.",
    "no ignoring my texts today, deal?",
    "made just for you, from your best friend.",
  ],
  readBtn: "see the wishes again",
  againBtn: "play it again",

  noGlTitle: "this phone says no",
  noGlText: "the kingdom needs 3D. try chrome or safari, or open it on a laptop.",

  progress: (n, total) => `✦ ${n} / ${total}`,
  soundOn: "sound on",
  soundOff: "sound off",
};

/* small helper: {name} inside a string gets replaced */
export function fill(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
