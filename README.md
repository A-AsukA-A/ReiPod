# ReiPod

A classic-style local music player built with React and TypeScript. The interface is just the player: import audio, browse songs with the click wheel, and listen.

**Website:** [Open ReiPod](https://a-asuka-a.github.io/ReiPod/)

## Use

Choose **导入音乐** on the player's screen and select audio files from your device. Turn the wheel to select, press the center to confirm, and use MENU to go back. The bottom button plays or pauses; the side buttons change tracks. In the playing view, turn the wheel or drag the progress slider to seek.

Choose **试听音乐** to add three full built-in tracks: **Carefree**, **Monkeys Spinning Monkeys** and **Sneaky Snitch**, all by Kevin MacLeod. Select any track to play immediately, without importing files. Attribution and source links are available under **设置 → 试听曲目版权**. The MP3 files are hosted with the site under CC BY 4.0.

Mouse wheel and keyboard controls are available when the wheel is focused: ↑/↓ select, Enter confirms, Escape returns, and Space plays or pauses.

MENU returns one level and keeps the selected row; hold MENU to return home, or press Home on the keyboard. The screen header also provides back and now-playing shortcuts. Opening the current song keeps its position and resumes it if paused. Dragging the progress slider previews the time and seeks once on release; a track change cancels the old seek. Clearing the list requires confirmation, with Cancel selected by default. The demo list shows only built-in tracks, even after local files are imported.

Music stays on your device. Files must be reimported after a refresh. MP3, AAC/M4A and PCM WAV are suggested; decoding depends on the browser. The web player does not provide native iPhone haptics or guarantee background playback.

## Develop

Node.js 22.12+ is required; deployment uses Node.js 24.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
node scripts/check-dist.mjs
npm run preview
```

`npm run test:audio` creates three original WAV test clips and a deliberately damaged file in the ignored `.local/` directory. Optional private development music is never included in the public site. Local planning and reference-package research remain outside this public repository.

## Deploy

Pushes to `main` run the playback/input tests, build the static player and deploy `dist/` to GitHub Pages. In repository Settings → Pages, the source is **GitHub Actions**. Relative asset paths support hosting under `/ReiPod/`.

The published site needs no server, account, music-service credentials or upload endpoint.

## Credits

Click wheel geometry is adapted from [tvillarete/ipod-classic-js](https://github.com/tvillarete/ipod-classic-js), used under MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the included third-party license file. Device graphics are drawn with CSS/SVG; private reference-app assets are not included.
