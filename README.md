# ReiPod

A classic-style local music player built with React and TypeScript. The interface is just the player: import audio, browse songs with the click wheel, and listen.

**Website:** [Open ReiPod](https://a-asuka-a.github.io/ReiPod/)

## Use

Use the wheel to choose **音乐 → 导入音乐** and select audio files from your device. The LCD is display-only: tapping, hovering or dragging on it does not operate the player. The player reads song titles, artists, albums, track numbers and embedded artwork. Browse albums in **Cover Flow**, or open **音乐** for artists, albums, songs, favorites and recently added music. Selecting a song plays the corresponding list; playing an album keeps its own queue.

The right pane follows the highlighted menu item. Music and Cover Flow show album artwork; Settings, Shuffle Songs, Import and the other categories show their corresponding embossed icon cards. The settings menu also uses contextual previews. Highlighting a command never executes it. Album artwork cycles every 6 seconds with a slow pan and 650 ms crossfade. The enlarged artwork fills the right half of the LCD from top to bottom, with the status bar confined to the left menu and no caption strip. Moving the wheel does not restart the carousel. The preview is passive. Enter **音乐 → Cover Flow**, select an album with the wheel and press Center: the selected cover flips into a centered track sheet over the cover fan. MENU flips back to the same cover. Exiting Cover Flow brings the menu and preview together from opposite edges, as seen in the hardware review. A single album stays on screen; the carousel pauses in background tabs and when reduced motion is enabled.

Development follows original iPod hardware. My Classic recordings and iPod.js source are comparison references. [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md) catalogs the official guides, physical-device reviews, firmware research and emulators, and distinguishes measured observations from provisional timings. The original Classic 6G 1.1.2 IPSW was downloaded from Apple and hash-checked locally; its encrypted system and private reference material are excluded from the site.

Open **音乐 → 搜索** to match song titles, artists, albums or filenames. Multiple words narrow the results together. The wheel selects characters and Center enters them. The palette includes characters from local song metadata. Choose 完成, or press MENU, to browse the results. Playlist naming uses the same wheel editor.

Under **音乐 → 播放列表**, **新建歌单…** creates a browser-local playlist. Open it and choose **添加歌曲** or **管理歌单…** to toggle membership, rename or delete it. **完成选择** returns to the playlist. Deleting a playlist keeps its songs in the library. Hold Center in a song list or the playing view to open **歌曲选项**, then use the wheel to favorite a track, view the current queue, play it next, add it to a playlist or remove it from the library. Removal requires confirmation and affects only this browser's stored copy. Deleted built-in tracks stay removed until **试听音乐** adds them again.

Three full built-in tracks are available on first launch: **Carefree**, **Monkeys Spinning Monkeys** and **Sneaky Snitch**, all by Kevin MacLeod. Select any track to play immediately. After clearing the library, **试听音乐** adds them again. Attribution and source links are available under **设置 → 试听曲目版权**. The MP3 files are hosted with the site under CC BY 4.0; their illustrated covers are original ReiPod artwork.

Turn the wheel to select, press the center to confirm, and use MENU to go back. The bottom button plays or pauses; the side buttons change tracks. In the playing view, the center cycles **cover → seek → repeat → shuffle → rating → lyrics** (lyrics joins the cycle when available). The cover and metadata stay anchored while the bottom control bay changes between the inline time/progress strip, seek diamond, repeat/shuffle choices and rating stars. Turn the wheel in repeat, shuffle or rating view to adjust that control; ratings are saved locally. Turn the wheel to show volume temporarily in cover view (use the iPhone's side buttons there), seek in seek view, or scroll lyrics in lyrics view. The progress bar is passive; select the seek view with Center and turn the wheel to seek. Hold the center to open song options, including **添加到 On-The-Go**; hold MENU to return home. Hold the side buttons to seek, with a fast-forward/rewind header indicator, or hold Play/Pause to sleep. The next wheel press wakes the screen without executing that press. The top **HOLD** switch locks wheel and screen input while playback continues. F remains a keyboard shortcut for favorites.

Import a matching `.lrc` file with the audio, or afterwards, for synchronized lyrics. Embedded plain lyrics can also be displayed. Lyrics are read from your files; the player does not fetch them from a music service.

The lyrics view uses the full LCD, with song information and a thin progress strip at the bottom. Center cycles out of lyrics; hold Center to access the real playback queue through song options. Long selected titles scroll after a short pause. Desktop controls have no focus outlines, pressed tiles or selectable text. Menu navigation keeps the classic blue selection bar; forward and back slide as connected pages. Rapid navigation preserves the in-flight screen instead of restarting from a blank frame. Menu selection stays immediate for every input, and reduced motion skips transitions. Cover Flow is controlled by the dial and side buttons. Its damped fan motion preserves position and velocity when reversed.

Each mouse-wheel event advances at most one item; small trackpad deltas accumulate without acceleration. Mouse circular dragging also advances one item per step. Keyboard controls are available when the wheel is focused: ↑/↓ select, Enter confirms, Escape returns, Home goes home, Space plays or pauses, and F toggles favorites.

MENU keeps the selected row when returning. Opening the current song keeps its position and resumes it if paused. **设置** includes shuffle, repeat off/all/one, main-menu and Music-menu visibility, a volume limit, brightness, backlight timing, wheel sounds, silver/black finishes and light/dark surroundings. Finish, background, shuffle, repeat and sound choices open checked submenus with forward/back transitions. Labels and values use bundled Noto Sans SC with actual 400–700 weights on desktop and phone; UI glyphs preload and library glyphs load on demand. The backlight defaults to 10 seconds; any unlocked input restores it. Music and Settings always remain in the main menu. **附加功能 → 时钟** displays the local time. Clearing the library requires confirmation, with Cancel selected by default.

Menus follow the 2007 iPod classic: **音乐 → 照片 → 播客 → 附加功能 → 设置 → 随机播放歌曲**, followed by **正在播放** when a track is selected. **Cover Flow** defaults to the first entry inside **音乐**; **歌曲** precedes **风格** and **作曲者**. Old automatically added home shortcuts migrate to this hierarchy. **设置 → 主菜单** can explicitly add a Cover Flow shortcut; **设置 → 音乐菜单** controls music categories. Import and demo actions follow the original categories inside Music. Unsupported original features are omitted. The top-left **HOLD** is a lock switch: orange means the controls are locked while audio continues. Its metal thumb slides briefly on pointer input; keyboard and reduced-motion input skip that movement.

Music stays on your device: imports are stored in this browser's IndexedDB and restored after a refresh. Favorites, playlists and settings are stored locally too. Refreshing restores the previous song, playback queue, volume and position (to the last saved second), paused until you choose to play. A song selected during library restoration takes priority over the saved session. Browser data clearing, private browsing or storage eviction can remove them; keep your original files. MP3, AAC/M4A and PCM WAV are suggested; decoding depends on the browser. The web player does not provide native iPhone haptics or guarantee background playback.

The recreation references and calibrated parameters are documented in [REPLICA.md](REPLICA.md). The battery icon follows device charge and charging events when the browser provides them, and refreshes when returning from the background. Unsupported or failed readings show a full battery icon by default, without claiming a numeric 100% reading or showing a charging bolt. Storage capacity uses browser data where available. Volume limits apply where the browser supports software volume control; iPhone audio still uses its hardware side buttons.

## Photos and podcasts

Choose **照片 → 导入照片…** for JPEG/PNG/WebP/GIF/AVIF/BMP images, or **导入相册文件夹…** to group photos by their folders. The full-width album list shows thumbnails and counts. **所有照片** and individual albums open a five-column thumbnail grid with a yellow selection frame; its gray strip shows the count and the selected file's modification date. Turn the wheel to select, Center opens the full image without the menu header, and Play/Pause starts or stops a three-second slideshow. Side buttons navigate photos. Hold Center for slideshow or confirmed deletion of the browser copy. Photos persist in IndexedDB; original files stay on the device.

Choose **播客 → 导入播客…** to import local audio episodes. Embedded album/artist metadata groups shows; episodes resume at their own saved position. This is local podcast playback, without an RSS subscription service or video podcast player. It uses the same audio backend as music. The music menu also reads genre and composer tags when present, with honest unknown categories when tags are missing.

## Source layout and size

`App.tsx` coordinates state and navigation. `primaryMenus`, `libraryMenus` and `mediaMenus` build menu commands; `MenuRows`, `NowPlayingScreen`, `ReadOnlyScreen`, `WheelTextEntry` and `FileImports` handle separate presentation/input responsibilities. Photo storage and podcast bookmarks live in `src/media/`; no new runtime UI/animation framework is added. Audio tag parsers load only when needed.

Run `npm run size` after building to report program bytes, compressed code and demo audio separately. CI caps the entry bundle at 150 kB gzip and total JS/CSS/HTML at 350 kB gzip. User photos, podcasts, recording references and IPA files are never bundled. Static web assets are not an iOS installer-size measurement.

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
npm run size
npm run preview
```

Browser regression tests run against the production build:

```sh
npx playwright install chromium
npm run test:browser
```

Pull requests run the unit tests, Chromium browser tests and public-artifact check. Browser traces for failed tests are kept in `.local/playwright-results`.

`npm run test:audio` creates three original WAV test clips and a deliberately damaged file in the ignored `.local/` directory. Optional private development music is never included in the public site. Local planning and reference-package research remain outside this public repository.

## Deploy

Pushes to `main` run the playback/input tests, build the static player and deploy `dist/` to GitHub Pages. In repository Settings → Pages, the source is **GitHub Actions**. Relative asset paths support hosting under `/ReiPod/`.

The published site needs no server, account, music-service credentials or upload endpoint.

## Stock library browsing

**音乐 → 艺人 → 某位艺人** opens that artist's album thumbnails and an **全部歌曲** row. Enter an album for its tracks; MENU restores the previous selection. The artist scope also limits playback inside a compilation. **全部专辑** at the top of Artists opens the global album list; **全部歌曲** at the top of Albums opens the corresponding song list. Play/Pause on an artist, album or aggregate plays that scope directly. Missing or failed artwork displays a music-note placeholder. Cover Flow sorts by artist then album; the normal Albums browser sorts by album title. Song options include **浏览艺人** and **浏览专辑** for music tracks.

## Credits

Click wheel geometry is adapted from [tvillarete/ipod-classic-js](https://github.com/tvillarete/ipod-classic-js); tag and cover parsing uses [music-metadata](https://github.com/Borewit/music-metadata), both under MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the included third-party license files. Device graphics are drawn with CSS/SVG; private reference-app assets are not included.
