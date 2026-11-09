# Classic interface reference

Current development decisions: [DEVELOPMENT.md](DEVELOPMENT.md). This document includes chronological implementation history; earlier numbers are not the current specification. Use the current-state table in [UI_STANDARDS.md](UI_STANDARDS.md) and its cited evidence.

ReiPod’s product scope covers all generations of iPod nano, iPod mini, and iPod/classic, including the pre-classic iPod generations. The current implementation baseline is the 2007 Classic 6G color split-screen interface; other models remain simulation targets, not claims of completed support. It is a web implementation, not original firmware. The current UI is a functional checkpoint; its bars, artwork projection, typography and motion are not yet validated against a matching physical device.

Original hardware is the authority: prefer the same model/firmware's observed behavior and verified firmware analysis over My Classic, iPod.js or general modern UI recommendations. The source catalog, acquired original IPSW checks and timing observations are in [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md). Calibration choices are labelled rather than presented as recovered Apple constants.

The next UI phase follows [UI_STANDARDS.md](UI_STANDARDS.md): record model/firmware, source, normalized LCD coordinates and uncertainty before claiming a calibrated value. [PLAYBACK_INTERACTIONS.md](PLAYBACK_INTERACTIONS.md) separates documented controls from ReiPod state-restoration choices.

## Reference sources and limits

- [Apple 2008 120GB technical specifications](https://support.apple.com/en-us/112321): 103.5 × 61.8 mm body; 2.5-inch, 320 × 240 color LCD. This is a later revision, distinct from the 2007 baseline. The body ratio and LCD aspect ratio use those published dimensions. The LCD width/body width ratio is derived from the diagonal and resolution: 50.8 / 61.8; it does not establish bezel position or component geometry.
- [Apple iPod classic User Guide](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1195_ipod_classic_160gb_user_guide.pdf), pages 5–9 and 24–25: wheel selection, Menu return, long Menu home, long Center options, long side-button seeking, long Play sleep, Hold locking without interrupting playback, scrubber operation, shuffle, ratings, and lyrics. Page 8 illustrates the split menu and its status indicators.
- [Contemporary first-hand photographs, The Gadgeteer](https://the-gadgeteer.com/2007/09/19/apple_ipod_classic/): visual comparison of the menu, settings, album artwork motion, and metal enclosure. Used as reference only; photographs and original firmware assets are not distributed.
- [Apple's 2007 announcement](https://www.apple.com/newsroom/2007/09/05Apple-Introduces-New-iPod-classic/): Cover Flow and the metal enclosure identify the intended generation.

The linked 160GB guide is also a later revision. Its descriptions support the behavior it documents, not the claim that every feature existed in the 2007 launch firmware. The Gadgeteer playback photo (`apple-ipod-classic-8.jpg`) returned 404 on 2026-10-28 and cannot currently serve as a measurement reference.

## Provisional implementation values

The 20-pixel header, 24-pixel menu rows and 16-pixel menu type at a 320-pixel LCD width are provisional visual choices, not measurements established by the official specifications. The LCD uses bundled Noto Sans SC (SIL OFL 1.1), with real weights 400–700 and font synthesis disabled, so Windows, Android and iOS use the same glyph shapes and metrics. UI glyphs preload (99 kB); common library characters and extended characters load on demand (1.83 MB / 5.93 MB). This is a redistributable substitute, not Apple's firmware font; OS rasterization can still vary. `scripts/subset-font.py` reproduces the font shards from Google's source TTF. The split is 160/160. The blue selection gradient, filled arrow silhouettes, embossed contextual icons, wheel proportions and reflections are redrawn in CSS/SVG.

## Menu hierarchy and HOLD

The menu baseline is the **2007 iPod classic (6th generation)**, cross-checked with the contemporary first-hand photographs linked above: [main menu](https://the-gadgeteer.com/assets/apple-ipod-classic-10.jpg), [Music](https://the-gadgeteer.com/assets/apple-ipod-classic-7.jpg), and [Settings](https://the-gadgeteer.com/assets/apple-ipod-classic-42.jpg). The Apple guide, page 26, explicitly places Cover Flow in Music; page 8 describes optional main-menu shortcuts. Main-menu placement alone therefore does not identify a faithful default.

- Main menu: Music → Photos → Podcasts → Extras → Settings → Shuffle Songs → Now Playing (when a current track exists). Unsupported Videos is omitted.
- Highlighting Now Playing uses the same full-pane artwork renderer, crop and slow drift as the Music cover carousel, without a separate thumbnail or metadata card. It shows the current song's artwork, falling back to the matching album's artwork. The preview stays on the current track when paused and updates on track changes; it does not cycle unrelated covers. Only missing or failed artwork uses the music-note placeholder.
- Extras includes an LCD text reader: local TXT/MD/TEXT import, wheel scrolling, previous/next paging, saved reading position and confirmed removal. Settings notices and licenses use the same reader rather than external browser tabs. This is an implemented web adaptation, with a 2 MB per-file limit; it does not claim to reproduce the original firmware's Notes storage format or limits.
- Music: Cover Flow → Playlists → Artists → Albums → Songs → Genres → Composers → Search. Unsupported Audiobooks is omitted. Web import and demo actions follow the original categories.
- The Artists browser drills into a scoped album list with All Songs at the top, matching the [2007 hardware photograph](https://the-gadgeteer.com/assets/apple-ipod-classic-26.jpg). Artists also has an All Albums aggregate. Back navigation remembers focus separately for each artist scope, and playback uses only that scope's tracks, including within compilations. Albums sorts by title; Cover Flow separately sorts by artist then title, as specified on page 26 of the Apple guide. Missing or failed artwork uses a neutral music-note placeholder.
- Settings starts with About → Shuffle → Repeat → Main Menu → Music Menu → Volume Limit → Backlight → Brightness. The Music Menu page controls visibility of existing music categories. Web appearance, library management and credits follow the implemented device settings.
- Version 3 preferences remove the old automatically enabled Cover Flow/import/demo home shortcuts. Explicitly adding Cover Flow in the new Main Menu settings remains possible. Appearance and playback preferences are retained.
- The top-left switch is **HOLD**, not mute: the guide's pages 6–7 specify an orange bar and disabled controls while audio continues. Its 34 × 7 px top-edge slot has a 54 × 44 px touch target, a metal thumb and 160 ms transform/opacity transitions. Keyboard toggles and reduced motion skip the thumb animation. These dimensions and timing are web adaptations, not measured firmware values.

Apple does not publish the transition curves or button-hold thresholds in these references. Motion timing now comes from `src/ui/motion.ts`: 360 ms menu travel with a symmetric curve, 300 ms playback-view fade, 360 ms album flip, a 320 ms Cover Flow entrance that parts the outgoing menu halves and brings in the title/caption, and a 480 ms exit in which the two menu halves meet from opposite edges. The 25 fps 2007 hardware review informs the menu/flip/exit calibration; this is a visual measurement with at least one-frame boundary uncertainty, not recovered firmware constants. The previous My Classic-derived 560 ms flip is superseded. Artwork uses a 6 s interval and 650 ms fade; these remain provisional web calibration values. Menu/Center hold remains 600 ms, seek hold 350 ms, sleep hold 800 ms. Reduced motion skips navigation movement.

## Web-specific behavior

Imports and browser-local playlists remain available. Local photo albums/slideshows and local podcast shows/episodes are implemented. Video, camera capture, RSS subscriptions, Genius and iTunes synchronization are not represented by nonfunctional menu items. Storage and battery indicators use browser capabilities where available; a firmware-like icon is not evidence of hardware equivalence. Unavailable battery readings use a full icon by request; its accessible label identifies it as a default display. No numeric battery percentage or charging state is fabricated, and no disk capacity is invented. Original vectors are authored for this project.

## Supplied My Classic recording

A privately supplied 36.67-second recording was reviewed frame by frame around menu navigation, Cover Flow and settings. It confirms a split menu with Photos/Podcasts, continuous artwork browsing and checked choice submenus. A second 91.8-second recording adds the album flip, playback controls and photo browsing. Those visible interactions now inform the following implementation:

- Cover Flow retains its fan and header while the selected cover flips into an album/artist heading and track sheet occupying 80% of the LCD width. MENU reverses the flip and preserves the selected album.
- The playing screen anchors the reflected, slightly turned artwork on the left and metadata on the right. A single bottom bay switches between inline elapsed/progress/remaining time, seek, temporary volume, shuffle choices and rating. These indicators are passive; the dial changes their values.
- Photos opens a full-width thumbnail album list, then a five-column contact sheet with a gray count/date strip and yellow selection frame. Full-image viewing hides the menu header. The displayed date comes from the imported file's modification time; no capture date is inferred.

These are provisional interpretations of the recordings, not recovered application source or exact timing specifications. ReiPod retains the original iPod's 320 × 240 logical LCD grid rather than adopting the reference app's portrait-video proportions. The supplied IPA was inspected statically; its main executable remains encrypted. Reference videos, fonts, artwork and application binaries are not redistributed.

The web player deliberately treats the LCD as a display. Every in-app action is reachable through the wheel, Center, Menu, transport buttons or physical Hold switch; native file selection happens outside the device screen. Mouse notches are discrete rather than accelerated. Album-sheet transitions support quick reversals without leaving outgoing frames behind.

## Historical UI standardization checkpoint — 2026-10-28 (superseded below)

The current 7-unit progress/volume tracks, 110-unit artwork with `perspective(450u) rotateY(-18deg)`, gradients and reflection are pending physical-reference measurement. No replacement angle or bar height is selected in this checkpoint. The comparison with `robbiebyrd/ipod_ui`, fixed source revisions and measurement procedure are recorded in [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md) and [UI_STANDARDS.md](UI_STANDARDS.md).

## Playback reference pass — 2026-10-29

The whole playback composition now follows two contemporary 2007 Classic review images: a larger cover at the upper left, its continuous reflection, a compact metadata group, saved rating when present, and visible queue position. Disabled shuffle, decorative queue and lyric icons no longer occupy the top row; enabled shuffle/repeat indicators remain. The ordinary progress rail includes the reflection visible in both references. Cover/metadata geometry is consolidated in `firmware-display.css`, removing earlier conflicting rules.

The [research record](HARDWARE_RESEARCH.md#播放页整体对照--2026-10-29) records sources, LCD corners, normalization and ±3–4 logical-unit uncertainty. The 138u cover and `perspective(550u) rotateY(22deg) scaleX(1.18)` fit projected corners; they are not recovered firmware constants. Colors and substitute font metrics remain approximate. Seek/volume retain their previous geometry pending matching direct evidence; the unsupported glass-style restyling was withdrawn. Lyrics entry, wheel controls, session restoration, provider isolation and playback transports remain unchanged. This pass includes no service migration or real-account/device playback verification.

### Seek and volume evidence follow-up

A 2007 Classic video now directly supports the thin seek rail, larger diamond and reflection. A separate 2009 Classic tutorial supports a broad volume fill between speaker icons. At this historical step, seek used a 7u rail and 9u rotated square (about 12.7u projected), superseded by the user-supplied control reference below; volume uses the 15u track material with roughly 20u horizontal insets. Exact firmware and the 2009 hardware revision remain unknown; volume dimensions carry roughly ±6u uncertainty, and colors/icons remain approximations. This supersedes the earlier decision to retain both old states pending imagery; see the final section of HARDWARE_RESEARCH.md for provenance and limits.

### User-supplied control motion reference

The supplied My Classic recording now guides bottom-bay transitions: Center cycles move the old panel left and bring the new panel from the right in roughly 300ms; temporary volume uses a short 100ms crossfade. Transport input applies immediately, in-flight snapshots are replaced, and reduced motion switches directly. The rounded seek diamond and one-/three-wave solid speaker icons follow the user's stills while preserving the already approved volume rail. These are explicitly requested comparison-app adaptations; exact source timing and firmware equivalence are not claimed. See the final research section for measurements and uncertainty.

The control-bay jitter fix keeps completed animation fill in place until React detaches the outgoing panel; releasing it while the panel was still connected could flash that panel back at its original position. Stable layer keys and captured transform/opacity preserve continuity when a slide or volume fade is interrupted. Browser regressions reproduce the original premature cancellation and verify both detachment order and continuation from the captured position. This is an implementation fix, with no change to the reference timings or playback behavior; real-device frame pacing remains a separate verification step.

Cover Flow entry now reveals the fan by moving the outgoing menu halves toward opposite edges over the existing 320ms token. This is a user-requested ReiPod adaptation, reversing the established split-menu exit; it supersedes the earlier immediate fan reveal and is not a newly measured firmware animation. Captured clipping boundaries survive interruptions, so returning midway retains visible fragments rather than exposing whole duplicate pages. Reduced motion continues to enter directly.

### Status bar and battery — 2026-11-04

The Classic header now uses tighter blue transport silhouettes, a neutral gray title strip and a bevelled green battery with a distinct terminal. Battery frame/inset/terminal dimensions scale with the LCD; the former fixed-pixel insets reduced the visible fill disproportionately on phones. The title has an explicit line box within the header. The [metric record](UI_METRICS.md#2026-11-04-电池与状态栏chromeheader-局部修正) separates contemporary photo measurements from provisional vector/color fits. Device reading synchronization and the explicitly labelled full fallback remain unchanged. These changes do not establish exact firmware fonts, charging-stage icons or full hardware fidelity.

The first status-bar pass was rejected for its white inset and generic icon feel. The revision removes battery padding entirely, redraws filled shuffle/repeat arrows, centers the single-repeat numeral without a white badge, and shares the Classic LCD icon family between the header and playing view. These supersede the first pass; the surface shading and authored paths remain provisional fits.

### Settings, wheel materials and scale — 2026-11-04

Setting values now use the blue relationship visible in the contemporary settings photograph, with white focused values and muted disabled values. Track-list transport markers share the tight LCD icon silhouettes and inherit focus contrast. Black wheel legends use a lighter printed appearance; silver/black center surfaces use inward shading consistent with the contemporary review's description. These colors and gradients remain authored provisional fits. Visible HOLD geometry now scales with the shell while its separate54×44 CSSpx touch target remains accessible; the existing390px fit is not a measured hardware dimension. The [metric record](UI_METRICS.md#2026-11-04-主菜单与银黑机身外观任务53) separates these engineering corrections from hardware acceptance.


### Firmware menus and live search — 2026-11-05

The supported Music/Settings items now keep the contemporary device photograph order, with the home LCD title restored to iPod. Service/import/lyrics/appearance/license additions live under the explicit ReiPod Settings group, while Reset Settings stays last. Reset uses the existing preference/playback owners, preserving music, accounts and the current session. Its full stock default matrix and confirmation geometry remain unverified.

Search now uses a horizontal alphabet bay with live typed results: wheel/Center entry, Next for space, Previous for backspace, MENU for the result list and Center on Search for reentry. Local songs, artists, albums, playlists and audio podcasts search by contiguous names; collections open their own browsing scope. Online/native adapters still expose song-only search. Source revisions, original feature gaps and adaptations are tracked in [FIRMWARE_FEATURES.md](FIRMWARE_FEATURES.md); photo-fit sizes and the corrected span/chevron cascade are in [UI_METRICS.md](UI_METRICS.md#2026-11-05-原机菜单与搜索任务54).


### Lazer lyric motion — 2026-11-05

The original whole-word emphasis and browser smooth scrolling are replaced by independent grapheme waves, soft advancing masks, sustained final-word emphasis and interruptible staggered line springs. Distance blur now follows actual visible positions; inactive rows scale to97%, with consistent weight. Only near-viewport rows animate; paused glyph time, wheel browsing, background suspension and reduced motion retain their contracts. Scope, fixed reference revision and the independently authored rendering/math boundary are documented in [LAZER_RESEARCH.md](LAZER_RESEARCH.md). This modern extension does not establish legacy firmware fidelity or complete parity with every Lazer lyric feature.


### Authorized lyric test collection — 2026-11-05

The three built-in tracks are replaced by 晴天 / 七里香 / 兰亭序 with real album artwork, embedded metadata and synchronized lyrics. Source lengths are retained; AAC-LC at34.5kbps/32kHz/stereo totals3,817,420 bytes,949 bytes above the previous collection. 晴天/兰亭序 use genuine word timing converted from pinned AMLL TTML sources; 七里香 uses the original QQ LRC, with no fabricated word times. The source master tagged 台湾正式版 is297.247s versus299s in the QQ catalog, so acoustic offset calibration remains unverified. Source/rights/hash details are in [third-party notices](THIRD_PARTY_NOTICES.md) and the catalog. Importing embedded millisecond LRC now retains syncText timing instead of flattening it into plain text.


## Podcast home preview — 2026-11-05 / task 70

Highlighting Podcasts now fills the right pane with artwork from the browsable podcast shows, using the existing cover crop, motion and crossfade. It rotates between different shows at random, holds a single show, handles missing art and empty libraries, and respects reduced motion/sleep/visibility. Native system shows and web imports retain their own scope; preview changes do not start playback or rebuild a session. This is the user's My Classic comparison adaptation; exact legacy-firmware geometry and timing remain unverified. The user selected independent in-app playback after confirming My Classic does not follow Apple Podcasts' current session.


## System photos and media list pass — 2026-11-05 / task 71

The updated iPhone shell opens authorized PhotoKit albums directly. Photo imports and permission tools live in ReiPod Photo Settings; photo/podcast content lists contain no duplicate import actions. The photo grid now uses the photographed 2007 classic's dark title/date area, five columns and three visible rows, with the selected photo outlined in yellow. System creation dates and album scope are retained; local imports keep modification dates. Podcast shows use full-width artwork/title/episode-count rows. Actual iPhone photo browsing and podcast list/playback were confirmed by the user. Structural evidence and computed styles are in UI_METRICS task 71; exact firmware geometry, fonts and full slideshow settings remain unverified.


## 2026-11-06 / 任务72体验修正

照片最近时间优先、按需元数据/图像缓存，长菜单窗口化，原生全面屏安全区与透明底层、独立触觉开关已实现；照片连续切换保留前图至新图解码以消除黑屏空隙。其工程/真机验收和证据查UI_METRICS任务72与TASK_LOG，不扩张为原机字体/像素或完整照片固件验收。公开ProMotion配置已启用，当前设备WebKit rAF约59fps，APP02高帧率仍未完成。

## Main menu calibration — 2026-11-09 / CAL77

Menu letter spacing now follows the LCD scale, preserving the existing substitute-font fit on phones and desktop. Resting long menu labels display an ellipsis; selected labels keep their existing full-width marquee, and reduced motion keeps a static ellipsis. Full text remains in the DOM. Row height, type size/weight, split geometry, artwork preview and playback/input behavior retain their existing contracts.

The [state record](UI_METRICS.md#2026-11-09-主菜单逐状态校准c-m01--cal77) separates contemporary physical-photo measurements, English comparison fixtures and Chinese application captures. These bounded engineering corrections do not establish original font identity, Chinese firmware geometry or exact marquee timing.

## Ordinary playback midpoint pass — 2026-11-09 / CAL79

The ordinary art screen now shares the existing resting-text ellipsis rule for its title, artist and album. Reduced motion shows a static ellipsis instead of cutting a glyph; normal marquee behavior and timing remain. The bounded midpoint pass preserves cover/reflection projection, metadata geometry, progress/time alignment and playback ownership after comparing the existing 2007 photos and settled rendering.

The [state record](UI_METRICS.md#2026-11-09-普通播放页50单状态c-n01--cal79) distinguishes physical-photo measurements, fixed playing snapshots and actual local-media paused captures. The reference photos are not at50% and have unknown firmware; exact fonts, matching Chinese firmware and full C-N01 hardware acceptance remain open.

## Ordinary progress endpoints — 2026-11-09 / CAL81

The ordinary progress rail now reserves time-label width from the formatted track duration. Long recordings keep a stable rail when remaining minutes lose a digit; the existing short-track minimum slots and appearance stay. Hidden sizing text is absent from the accessibility readout. Local-file wheel tests cover0/50/100% after returning to the ordinary art screen, separately from the seek diamond.

The [endpoint record](UI_METRICS.md#2026-11-09-普通播放条0100端点c-n01--cal81) documents unchanged baseline pixels and the100-minute engineering sample. Matching firmware/Chinese endpoint photographs remain missing; these checks do not establish full hardware fidelity.

## Playback controls as one experience — 2026-11-09 / PLAY83

FIX86 correction: the extra mode/value captions introduced in PLAY83 have been removed. They had no original-device evidence and were not requested by the user. Shuffle uses a clear blue selection, rating has more legible inactive stars, and volume feedback stays visible while the wheel continues at0/100%. Artwork, metadata, the approved control style, Center/lyrics flow and playback ownership remain. These are labelled ReiPod usability adaptations; the complete local preview and continuous demo are the user deliverable, with source-fidelity limits retained in UI_METRICS.

## 2026-11-09 Browsing experience

Classic browse lists now retain the selected song's visible position when returning from playback or nested menus. Positions remain in the UI session and are scoped by provider/account and navigation range. Album thumbnails, secondary labels and counters scale with the LCD; focused album/genre secondary labels can scroll to reveal their full text and retain ellipsis with reduced motion. These are ReiPod engineering adaptations, not newly measured firmware constants. Evidence and boundaries: [BROWSE85](UI_METRICS.md#2026-11-09-主菜单与音乐浏览整块browse85).

## 2026-11-09 Quick Scroll

Songs, Artists and Albums now support sustained wheel rotation to jump between available initials in lists with more than100 items, followed by release for ordinary selection and playback through the original route. This implements documented Classic behavior; recognition thresholds are input adaptations and exact HUD geometry remains provisional. Unsupported initials retain ordinary navigation. [Evidence and bounds](UI_METRICS.md#2026-11-09-长曲库快速找歌c-f07-q--quick88).


## 2026-11-09 Settings and About

About now follows the contemporary three-card composition: shared identity/storage header, storage/count/version cards, page dots and Center-key cycling, with Menu returning and re-entry starting at the first card. It preserves ReiPod identity and reports origin storage, selected music library and explicitly local media counts; it does not invent a disk capacity, Apple firmware or serial number. Layout/colors remain provisional, and platform-specific fields are documented adaptations. The early Apple guide explicitly supports a Songs shortcut in the main menu; it is now optional, persisted and reset through existing owners. Unsupported adjustment percentages/instructions were removed without restyling the unmeasured slider geometry. Backlight/Clicker, customization/reload and reset/session preservation are checked as one experience; no new physical-device claim is made. See SETTINGS90 in UI_METRICS.


## 2026-11-09 Cover Flow, search and photos

The Cover Flow track sheet now uses the contemporary numbered-track/duration layout with a smaller top gap and denser rows, following the 2007 Geekanoids recording. Exact values remain provisional fits. Long captions retain marquee and gain proper static ellipsis with reduced motion. Selected search subtitles now reveal their full text through the existing marquee; the previously implemented result count and typed navigation remain. Photo grids remember their window by an anchor photo and relative row position, preserving the view across full-image browsing and nearby-photo changes; missing anchors fall back to keeping the selection visible. These are documented engineering adaptations. BATCH92 in UI_METRICS separates source evidence from browser comparisons; no new hardware/account verification is claimed.


## 2026-11-10 Podcasts and playlists

Re-entering a show now preserves its selected episode and list window through existing scoped navigation; resume still uses the established playback owner. Local playlist names/counts and track titles/artists follow the two-line hierarchy visible in the 2007 recording, removing duplicate playlist headings, the extra track footer and track chevrons. Actual playlists precede preserved ReiPod library shortcuts. Exact row/font values remain provisional; this is not complete firmware acceptance. Music membership selection and its Play queue now use the injected music library instead of the active playback session, excluding podcasts and unrelated playback tracks. On-The-Go save/clear/readonly-copy and playback preservation retain their existing contracts. MEDIA94 records evidence and engineering comparisons separately.

## 2026-11-10 Clocks, stopwatch and shell scale

World clocks now support region/city selection, ordered persistence and deletion. Stopwatch supports Play/Pause start/stop, Center laps, resume/new sessions, persisted logs and min/max/average statistics with deletion/clear confirmation. Apple’s 2008 classic 120GB guide documents these operations; exact 2007 firmware geometry remains unverified. Automatic IANA DST, the city catalog, bounded storage and wall-clock recovery across navigation/reload are explicit adaptations. The player and queues remain separate. Shell edges, shadows and bezel now scale from the existing maximum body width; measured browser LCD content dimensions stay unchanged at three viewport widths. Colors and substitute fonts were retained without inventing new hardware evidence. BATCH95 in UI_METRICS records provisional values and actual captures. An uninstalled development-signed iPhone package is prepared separately; this is not physical-device or account acceptance.
