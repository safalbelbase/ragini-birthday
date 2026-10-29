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

- `stars[]` — the 8 wishes (two are left as `[placeholders]` on purpose)
- `finaleTitle` + `finaleLines` — the birthday message
- `title` / `subtitle` — names
- Colors live in `styles/styles.css` (`:root` tokens)
- The world (island, castle, cake) lives in `js/world.js`

## Tech

- three.js r149 (vendored, MIT license inside the file)
- Fraunces + Nunito, self-hosted latin subsets (SIL OFL 1.1) in `fonts/`
- All sounds are procedural WebAudio, no audio files
- Debug helpers under `window.__kingdom` (tap positions, state)
- Regenerate font subsets: `node tools/fetch-fonts.mjs`
