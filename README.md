# a little birthday kingdom · for Ragini

A tiny 3D fairytale birthday game. Phone-first, one tap to start.
Collect 8 wish stars, the castle wakes up, a cake rises, light the
candles, make a wish, fireworks. No accounts, no tracking, no build step.

## Run locally

```bash
cd ragini-birthday
python3 -m http.server 8767
# open http://localhost:8767/
```

Any static file server works. ES modules need HTTP, so `file://` will not.

## Deploy

It is plain static files. Drag the folder to Netlify Drop, or push to
GitHub Pages (already configured with `.nojekyll`).

## Personalize

Everything the player reads lives in **js/content.js**:

- `stars[]` — the 8 wishes (one per collectible star)
- `letter[]` — the birthday letter; the last line is the signature
- `photoTitles[]` — the caption on each of the 8 gallery frames
- `title` / `subtitle` — names
- Every button label is a key in here, wired up by `data-c` in `index.html`

The actual photos go in **photos/** as `1.jpg` … `8.jpg` — see
`photos/README.md` for which frame is which.

Colors live in `styles/styles.css` (`:root` tokens).
The world (island, castle, cake, gallery) lives in `js/world.js`.
The piano background loop lives in `js/audio.js` (`TUNE` / `BPM`).

## Tech

- three.js r149 (vendored, MIT license inside the file)
- Fraunces + Nunito + Caveat, self-hosted latin subsets (SIL OFL 1.1) in `fonts/`
- All sound is procedural WebAudio — no audio files. The ♪ button suspends
  the whole AudioContext, so the music pauses and resumes in place.
- Debug helpers under `window.__kingdom` (star/candle screen positions, state)
- Regenerate font subsets: `node tools/fetch-fonts.mjs`
