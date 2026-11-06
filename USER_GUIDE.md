# ReiPod user guide

[Project overview](README.md) · [项目介绍（中文）](README.zh-CN.md)

Detailed usage and implementation notes. Original feature coverage and remaining gaps are tracked in [FIRMWARE_FEATURES.md](FIRMWARE_FEATURES.md). Menu names below retain the app’s current Simplified Chinese labels.

A classic-style music player built with React and TypeScript, with local playback, iPhone system-music control and optional self-hosted NetEase/QQ integrations. Web Apple Music requires the site’s own MusicKit developer configuration.

**Website:** [Open ReiPod](https://a-asuka-a.github.io/ReiPod/)

**iPhone app:** [Native shell and Mac/Xcode installation](ios/README.md). It reuses this interface and controls the iPhone's system music library through MediaPlayer, without a web MusicKit developer token. The web and native transports share the service selector but have different authorization and playback paths.

## Use

**设置 → ReiPod 设置 → 音乐服务** selects Apple Music, local music, NetEase Cloud Music, or QQ Music. NetEase and QQ use an optional self-hosted Node.js backend with QR login, playlists, search, and playback links; run `npm --prefix server ci --ignore-scripts`, `npm run build`, and `npm run music:serve`, then open `http://127.0.0.1:3210/`. GitHub Pages requires a separately hosted HTTPS backend for those two services. **音乐 → 本地音乐** keeps imported files separate. See [MUSIC_SERVICES.md](MUSIC_SERVICES.md) for setup and verification limits, and [ios/README.md](ios/README.md) for the iPhone system-music route.

Use the wheel to choose **设置 → ReiPod 设置 → 导入音乐** and select audio files from your device. The LCD is display-only: tapping, hovering or dragging on it does not operate the player. The player reads song titles, artists, albums, track numbers and embedded artwork. Browse albums in **Cover Flow**, or open **音乐** for artists, albums, songs, favorites and recently added music. Selecting a song plays the corresponding list; playing an album keeps its own queue.

The right pane follows the highlighted menu item. Music and Cover Flow show album artwork; Settings, Shuffle Songs, Import and the other categories show their corresponding embossed icon cards. The settings menu also uses contextual previews. Highlighting a command never executes it. Album artwork cycles every 6 seconds with a slow pan and 650 ms crossfade. The enlarged artwork fills the right half of the LCD from top to bottom, with the status bar confined to the left menu and no caption strip. Moving the wheel does not restart the carousel. The preview is passive. Enter **音乐 → Cover Flow**, select an album with the wheel and press Center: the selected cover flips into a centered track sheet over the cover fan. MENU flips back to the same cover. Exiting Cover Flow brings the menu and preview together from opposite edges, as seen in the hardware review. A single album stays on screen; the carousel pauses in background tabs and when reduced motion is enabled.

The UI targets the 2007 iPod classic 6G; current geometry still needs physical-reference calibration. Follow [UI_STANDARDS.md](UI_STANDARDS.md) for evidence, measurement and screenshot acceptance, and [AGENTS.md](AGENTS.md) for development instructions. My Classic recordings and iPod.js source are comparison references. [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md) catalogs the official guides, physical-device reviews, firmware research and emulators, and distinguishes measured observations from provisional timings. The original Classic 6G 1.1.2 IPSW was downloaded from Apple and hash-checked locally; its encrypted system and private reference material are excluded from the site.

Open **音乐 → 搜索** for live, contiguous name matching across local songs, artists, albums, playlists and audio podcasts. Rotate the wheel to choose a character and press Center to enter it. Next inserts a space; Previous deletes the last character. MENU selects the Search row so you can browse results, and Center on that row resumes editing. A horizontal alphabet strip stays below the live results. Artist, album and playlist results open their own collections; song results play the matched playable items. Filename and lyrics text are excluded. Online/system-music search currently returns songs only. Playlist naming retains its separate wheel editor.

Under **音乐 → 播放列表**, **新建歌单…** creates a browser-local playlist. Open it and choose **添加歌曲** or **管理歌单…** to toggle membership, rename or delete it. **完成选择** returns to the playlist. Deleting a playlist keeps its songs in the library. Hold Center in a song list or the playing view to open **歌曲选项**, then use the wheel to favorite a track, view the current queue, play it next, add it to a playlist or remove it from the library. Removal requires confirmation and affects only this browser's stored copy. Deleted built-in tracks stay removed until **试听音乐** adds them again.

Three full built-in test tracks are available on first launch: Jay Chou’s **晴天**, **七里香** and **兰亭序**, with embedded album/track/composer tags, album covers and synchronized lyrics. The AAC-LC files total 3,817,420 bytes, retaining source lengths at 34.5 kbps, 32 kHz stereo. 晴天/兰亭序 have genuine word timestamps converted from AMLL TTML; 七里香 has official LRC line timing. Every M4A includes lyrics and artwork, and matching LRC/YRC sidecars are distributed for import testing. **试听音乐** adds the tracks again after clearing them. The project owner confirmed authorization; underlying rights remain with their owners, and these songs do not use the previous CC BY license. Source/version and timing limits are listed under **设置 → ReiPod 设置 → 试听曲目版权**.

Turn the wheel to select, press the center to confirm, and use MENU to go back. The bottom button plays or pauses; the side buttons change tracks. In the playing view, the center cycles **cover → seek → shuffle → rating → lyrics**. **设置 → ReiPod 设置 → 歌词显示** enables or disables the lyrics page (on by default, saved across reloads). When lyrics are available or can be fetched, hold Center and confirm the first **歌词** item to open them directly. The cycle skips unavailable lyrics; Repeat remains in Settings. The cover and metadata stay anchored while the bottom control bay changes between the inline time/progress strip, seek diamond, shuffle choices and rating stars. Turn the wheel in shuffle or rating view to adjust that control; ratings are saved locally. Turn the wheel to show volume temporarily in cover view (use the iPhone's side buttons there), seek in seek view, or scroll lyrics in lyrics view. The progress bar is passive; select the seek view with Center and turn the wheel to seek. Hold the center to open song options, including **添加到 On-The-Go**; hold MENU to return home. Hold the side buttons to seek, with a fast-forward/rewind header indicator, or hold Play/Pause to sleep. The next wheel press wakes the screen without executing that press. The top **HOLD** switch locks wheel and screen input while playback continues. F remains a keyboard shortcut for favorites.

Import a matching `.lrc` or `.yrc` file with the audio, or afterwards, for synchronized lyrics. YRC uses grapheme-level soft highlights, sustained-word waves and staggered line springs based on the specified Lazer reference; LRC retains line-level follow. Pause freezes glyph time, seeking retargets the line motion, and reduced motion retains static highlighting. Embedded plain lyrics can also be displayed; embedded millisecond LRC timing is preserved when the tag parser returns synchronized entries. NetEase and QQ lyrics load from the configured backend when you enter the lyrics page, and follow playback timestamps when supplied. Loading, unavailable and empty lyrics have separate states; leave and reenter the page to retry a failed request. Apple system music does not expose lyrics through this integration.

Temporary seek/shuffle/rating controls reset to the cover when leaving playback or changing tracks. Lyrics stays open when returning to the same playback session or skipping within its queue, and follows the current line; choosing a song afresh from the library opens the cover. View state is not persisted across reloads. See [playback interaction rules](PLAYBACK_INTERACTIONS.md) for the reference sources and full state matrix.

The lyrics view uses the full LCD, with song information and a thin progress strip at the bottom. Center cycles out of lyrics; hold Center to access the real playback queue through song options. Long selected titles scroll after a short pause. Desktop controls have no focus outlines, pressed tiles or selectable text. Menu navigation keeps the classic blue selection bar; forward and back slide as connected pages. Rapid navigation preserves the in-flight screen instead of restarting from a blank frame. Menu selection stays immediate for every input, and reduced motion skips transitions. Cover Flow is controlled by the dial and side buttons. Its damped fan motion preserves position and velocity when reversed.

Each mouse-wheel event advances at most one item; small trackpad deltas accumulate without acceleration. Mouse circular dragging also advances one item per step. Keyboard controls are available when the wheel is focused: ↑/↓ select, Enter confirms, Escape returns, Home goes home, Space plays or pauses, and F toggles favorites.

MENU keeps the selected row when returning. Opening the current song keeps its position and resumes it if paused. **设置** includes shuffle, repeat off/all/one, main-menu and Music-menu visibility, a volume limit, brightness, backlight timing, wheel sounds, silver/black finishes and light/dark surroundings. Finish, background, shuffle, repeat and sound choices open checked submenus with forward/back transitions. Labels and values use bundled Noto Sans SC with actual 400–700 weights on desktop and phone; UI glyphs preload and library glyphs load on demand. The backlight defaults to 10 seconds; any unlocked input restores it. Music and Settings always remain in the main menu. **附加功能 → 时钟** displays the local time. Clearing the library requires confirmation, with Cancel selected by default.

**附加功能 → 文本阅读** imports TXT, Markdown (shown as plain text) and TEXT files up to 2 MB each. UTF-8, BOM-marked UTF-16 and common Chinese GB encodings are supported. Turn the wheel to scroll, use previous/next to page, and press the center for resume, return to start or confirmed deletion. Imported texts and reading positions remain in this browser after reload. **设置 → ReiPod 设置** opens open-source notices, demo credits, audio-parser and font licenses inside the same LCD reader; links remain plain text and no browser tab opens.

Menus follow the 2007 iPod classic: **音乐 → 照片 → 播客 → 附加功能 → 设置 → 随机播放歌曲**, followed by **正在播放** when a track is selected. **Cover Flow** defaults to the first entry inside **音乐**; **歌曲** precedes **风格** and **作曲者**. Old automatically added home shortcuts migrate to this hierarchy. **设置 → 主菜单** can explicitly add a Cover Flow shortcut; **设置 → 音乐菜单** controls music categories. Import, demo music, services, lyrics, appearance and licenses are under **设置 → ReiPod 设置**. **设置 → 还原设置** restores implemented firmware settings after confirmation, preserving the music library, accounts, playback and ReiPod appearance/lyrics choices. The original default matrix and exact confirmation layout remain unverified. Unsupported original features are omitted. The top-left **HOLD** is a lock switch: orange means the controls are locked while audio continues. Its metal thumb slides briefly on pointer input; keyboard and reduced-motion input skip that movement.

Music stays on your device: imports are stored in this browser's IndexedDB and restored after a refresh. Favorites, playlists and settings are stored locally too. Refreshing restores the previous song, playback queue, volume and position (to the last saved second), paused until you choose to play. A song selected during library restoration takes priority over the saved session. Browser data clearing, private browsing or storage eviction can remove them; keep your original files. MP3, AAC/M4A and PCM WAV are suggested; decoding depends on the browser. The web player does not provide native iPhone haptics or guarantee background playback.

The recreation references and provisional implementation parameters are documented in [REPLICA.md](REPLICA.md). The battery icon follows device charge and charging events when the browser provides them, and refreshes when returning from the background. Unsupported or failed readings show a full battery icon by default, without claiming a numeric 100% reading or showing a charging bolt. Storage capacity uses browser data where available. Volume limits apply where the browser supports software volume control; iPhone audio still uses its hardware side buttons.

## Browse by genre and composer

For local music, choose **音乐 → 风格 → 分类 → 艺人 → 专辑**, or **音乐 → 作曲者 → 作曲者 → 专辑**. Center enters the next list; Play on a genre or composer starts that collection. Albums and their queues contain only songs matching the current category and artist. MENU returns one level with the previous selection; re-entering that scope also remembers the selected song. **全部艺人 / 全部专辑 / 全部歌曲** apply to the current level's scope. Missing tags remain under **未知风格 / 未知作曲者**. Provider menus retain their existing supported routes, and local browsing does not change an active remote playback session. Single-album shortcuts and exact firmware sorting remain listed in [feature gaps](FIRMWARE_FEATURES.md).

## Album shuffle and On-The-Go

Choose **设置 → 随机播放 → 关闭 / 歌曲 / 专辑**, or turn the wheel in the Now Playing shuffle panel. Album shuffle randomizes album blocks while keeping available disc/track order inside them. Changing modes preserves the current song and position; Off restores the original queue. iPhone system music can reorder only a queue already known to ReiPod; otherwise select a song or playlist in ReiPod first. Missing provider metadata limits album grouping and ordering.

For local music, hold Center on a song and choose **添加到 On-The-Go**; the Lyrics shortcut stays in that menu. Hold Center on an album, artist, genre/composer or local playlist row to add that collection. Open **音乐 → 播放列表 → On-The-Go** to play it. Hold Center on a working-list song and choose **从 On-The-Go 移除** to remove it. Duplicate additions are ignored.

**保存播放列表** creates **New Playlist 1**, then 2, and so on, and empties the working list. Saved copies play without offering content edits. **清空播放列表…** opens a confirmation defaulting to Cancel. Save/clear failures keep the original list for retry; these actions do not delete audio or change the queue already playing. On-The-Go uses ReiPod's browser-local library, separate from native/cloud account playlists, and has no iTunes synchronization. Reduced motion keeps the text acknowledgement without the brief title flash.

## Photos and podcasts

On an updated iPhone app, open **照片** to browse the system albums and images you allow through the iOS Photos prompt. The full-width album list shows thumbnails and counts. An album opens a dark five-column, three-row thumbnail grid with a yellow selection frame, a count/date strip and the album title. The date comes from system creation metadata. Center opens a photo full screen; turn the wheel or use the side buttons to move, MENU returns, and Play/Pause toggles the existing three-second slideshow. System images are read-only and stay in the system library. Limited access and permission controls are in **设置 → ReiPod 设置 → 照片设置**.

For browser-local copies, use **设置 → ReiPod 设置 → 照片设置 → 导入照片…**, or **导入相册文件夹…** to retain folder grouping. Imported copies persist in IndexedDB; their date is the file modification date. The web Photos menu shows these albums; iPhone users can reach older imports through **本地 · 已导入照片** in Photo Settings. Hold Center on a local copy for slideshow or confirmed deletion. System photos have no delete command.

Choose **设置 → ReiPod 设置 → 播客设置 → 导入播客…** to import local audio episodes. Embedded album/artist metadata groups shows; episodes resume at their own saved position. The updated iPhone shell prefetches system podcasts at launch, independently of songs and playlists, sharing system media-library permission with Apple Music. On iPhone, **播客** shows only the prefetched system shows; local imports remain selectable as **本地 · 节目名** in Podcast Settings. The current session keeps them visible and playable while background updates finish. The first page appears before later pages finish. There is no ReiPod connection confirmation; iOS still presents its required permission prompt on first access. It lists only downloaded audio podcast items exposed by MediaPlayer, groups them by system show ID, and sends the chosen episode queue to the system player. Episode selection uses the returned bookmark and confirmed session progress. The music library and local podcast imports remain separate, and connecting does not change your selected music provider. Maintenance lives under **设置 → ReiPod 设置 → 播客设置**. **刷新系统播客** forces a fresh native query; denied permission offers system settings. An empty result explicitly says the system provided no downloaded episodes. **打开 Apple 播客** asks iOS to open the installed Podcasts app; this does not grant access to its subscriptions or cloud progress. These routes require an updated installed shell. On the tested iPhone17 Pro/iOS27.3, downloaded shows, playback controls, background/lock-screen controls and returning to ReiPod were confirmed; complete Apple Podcasts subscriptions/current-session synchronization are outside this independent playback route. Web pages and older shells keep file import. There is no RSS subscription service or video podcast player. See [native limitations and device checks](ios/README.md#iphone-系统播客pod01). The music menu also reads genre and composer tags when present, with honest unknown categories when tags are missing.

## Source layout and size

`src/app/App.tsx` coordinates state and navigation. `primaryMenus`, `libraryMenus` and `mediaMenus` build menu commands; `MenuRows`, `NowPlayingScreen`, `ReadOnlyScreen`, `ClassicSearchScreen`, `WheelTextEntry` and `FileImports` handle separate presentation/input responsibilities. Photo storage and podcast bookmarks live in `src/media/`; no new runtime UI/animation framework is added. Audio tag parsers load only when needed.

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

Local playback needs no server, account or upload endpoint. Apple Music requires the site's own developer configuration and the listener's Apple Music authorization; private signing keys stay outside the site build.

## Stock library browsing

**音乐 → 艺人 → 某位艺人** opens that artist's album thumbnails and an **全部歌曲** row. Enter an album for its tracks; MENU restores the previous selection. The artist scope also limits playback inside a compilation. **全部专辑** at the top of Artists opens the global album list; **全部歌曲** at the top of Albums opens the corresponding song list. Play/Pause on an artist, album or aggregate plays that scope directly. Missing or failed artwork displays a music-note placeholder. Cover Flow sorts by artist then album; the normal Albums browser sorts by album title. Song options include **浏览艺人** and **浏览专辑** for music tracks.

## Credits

Click wheel geometry is adapted from [tvillarete/ipod-classic-js](https://github.com/tvillarete/ipod-classic-js); tag and cover parsing uses [music-metadata](https://github.com/Borewit/music-metadata), both under MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the included third-party license files. Device graphics are drawn with CSS/SVG; private reference-app assets are not included.


### iPhone体验设置（任务72）

照片按最近时间优先浏览：系统照片用拍摄日期，本地导入用文件修改日期。**设置 → ReiPod设置 → 触觉反馈**可开关转轮与按键震动，与转轮声音分别保存。新版iPhone容器背景延伸到全面屏，机身/按键避开安全区；背景选择“透明”时清除外侧固定底色。已开放系统高刷新率配置，但当前WebKit真机样本仍约60fps，暂不宣称120fps。

主页停在“照片”时，右侧先轮播最近8张照片，停留约10秒后逐批展示更早照片；批内随机、不重复已看项，单张保持不变；已有系统权限时直接展示，尚未授权请进入照片完成授权。开启系统“减弱动态”时预览保持静止。

默认背光为“始终开启”，旧版默认10秒会迁移到常亮；也可在设置手动选回其他时长。iPhone在App前台未休眠时保持屏幕唤醒，进入后台会释放；侧键仍可主动锁屏。启动屏去掉白底，网页载入前恢复上次背景；iOS系统的静态启动屏使用黑色底。


iPhone版右上角电池会跟随系统电量和供电状态；插上电源显示闪电，拔掉后移除，满电接电也保留标志。返回App会刷新读数，无需音乐或照片授权。普通网页若无法读取设备电量，仍显示带“未提供电量”说明的占位。
