# ReiPod

A classic-style local music player built with React and TypeScript. The interface is just the player: import audio, browse songs with the click wheel, and listen.

**Website:** [Open ReiPod](https://a-asuka-a.github.io/ReiPod/)

## Use

Choose **导入音乐** on the player's screen and select audio files from your device. The player reads song titles, artists, albums, track numbers and embedded artwork. Browse albums in **Cover Flow**, or open **音乐** for artists, albums, songs, favorites and recently added music. Selecting a song plays the corresponding list; playing an album keeps its own queue.

Three full built-in tracks are available on first launch: **Carefree**, **Monkeys Spinning Monkeys** and **Sneaky Snitch**, all by Kevin MacLeod. Select any track to play immediately. After clearing the library, **试听音乐** adds them again. Attribution and source links are available under **设置 → 试听曲目版权**. The MP3 files are hosted with the site under CC BY 4.0; their illustrated covers are original ReiPod artwork.

Turn the wheel to select, press the center to confirm, and use MENU to go back. The bottom button plays or pauses; the side buttons change tracks. In the playing view, the center cycles **cover → seek → lyrics**. Turn the wheel to adjust volume in cover view (use the iPhone's side buttons there), seek in seek view, or scroll lyrics in lyrics view. The progress slider also supports direct seeking. Hold the center to favorite a song; hold MENU to return home.

Import a matching `.lrc` file with the audio, or afterwards, for synchronized lyrics. Embedded plain lyrics can also be displayed. Lyrics are read from your files; the player does not fetch them from a music service.

The lyrics view uses the full LCD, with queue and cover controls beside the song header and a thin progress strip at the bottom. The queue button shows the actual current playback order. Long selected titles scroll after a short pause. Desktop controls have no focus outlines, pressed tiles or selectable text. Menu navigation keeps the classic blue selection bar; forward and back use opposite screen slides, while keyboard navigation stays immediate and reduced motion is respected.

Mouse wheel and keyboard controls are available when the wheel is focused: ↑/↓ select, Enter confirms, Escape returns, Home goes home, Space plays or pauses, and F toggles favorites.

MENU keeps the selected row when returning. The screen header also provides back and now-playing shortcuts. Opening the current song keeps its position and resumes it if paused. Dragging the progress slider previews the time and seeks once on release; a track change cancels the old seek. **设置** includes shuffle, repeat off/all/one, wheel sounds, silver/black finishes and light/dark surroundings. Clearing the library requires confirmation, with Cancel selected by default.

Music stays on your device: imports are stored in this browser's IndexedDB and restored after a refresh. Favorites and settings are stored locally too. Browser data clearing, private browsing or storage eviction can remove them; keep your original files. MP3, AAC/M4A and PCM WAV are suggested; decoding depends on the browser. The web player does not provide native iPhone haptics or guarantee background playback.

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

Click wheel geometry is adapted from [tvillarete/ipod-classic-js](https://github.com/tvillarete/ipod-classic-js); tag and cover parsing uses [music-metadata](https://github.com/Borewit/music-metadata), both under MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the included third-party license files. Device graphics are drawn with CSS/SVG; private reference-app assets are not included.
