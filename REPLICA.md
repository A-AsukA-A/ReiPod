# Classic interface reference

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

## UI standardization checkpoint — 2026-10-28

The current 7-unit progress/volume tracks, 110-unit artwork with `perspective(450u) rotateY(-18deg)`, gradients and reflection are pending physical-reference measurement. No replacement angle or bar height is selected in this checkpoint. The comparison with `robbiebyrd/ipod_ui`, fixed source revisions and measurement procedure are recorded in [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md) and [UI_STANDARDS.md](UI_STANDARDS.md).

## Playback reference pass — 2026-10-29

The whole playback composition now follows two contemporary 2007 Classic review images: a larger cover at the upper left, its continuous reflection, a compact metadata group, saved rating when present, and visible queue position. Disabled shuffle, decorative queue and lyric icons no longer occupy the top row; enabled shuffle/repeat indicators remain. The ordinary progress rail includes the reflection visible in both references. Cover/metadata geometry is consolidated in `firmware-display.css`, removing earlier conflicting rules.

The [research record](HARDWARE_RESEARCH.md#播放页整体对照--2026-10-29) records sources, LCD corners, normalization and ±3–4 logical-unit uncertainty. The 138u cover and `perspective(550u) rotateY(22deg) scaleX(1.18)` fit projected corners; they are not recovered firmware constants. Colors and substitute font metrics remain approximate. Seek/volume retain their previous geometry pending matching direct evidence; the unsupported glass-style restyling was withdrawn. Lyrics entry, wheel controls, session restoration, provider isolation and playback transports remain unchanged. This pass includes no service migration or real-account/device playback verification.

### Seek and volume evidence follow-up

A 2007 Classic video now directly supports the thin seek rail, larger diamond and reflection. A separate 2009 Classic tutorial supports a broad volume fill between speaker icons. Seek uses a 7u rail and 9u rotated square (about 12.7u projected); volume uses the 15u track material with roughly 20u horizontal insets. Exact firmware and the 2009 hardware revision remain unknown; volume dimensions carry roughly ±6u uncertainty, and colors/icons remain approximations. This supersedes the earlier decision to retain both old states pending imagery; see the final section of HARDWARE_RESEARCH.md for provenance and limits.

### User-supplied control motion reference

The supplied My Classic recording now guides bottom-bay transitions: Center cycles move the old panel left and bring the new panel from the right in roughly 300ms; temporary volume uses a short 100ms crossfade. Transport input applies immediately, in-flight snapshots are replaced, and reduced motion switches directly. The rounded seek diamond and one-/three-wave solid speaker icons follow the user's stills while preserving the already approved volume rail. These are explicitly requested comparison-app adaptations; exact source timing and firmware equivalence are not claimed. See the final research section for measurements and uncertainty.

The control-bay jitter fix keeps completed animation fill in place until React detaches the outgoing panel; releasing it while the panel was still connected could flash that panel back at its original position. Stable layer keys and captured transform/opacity preserve continuity when a slide or volume fade is interrupted. Browser regressions reproduce the original premature cancellation and verify both detachment order and continuation from the captured position. This is an implementation fix, with no change to the reference timings or playback behavior; real-device frame pacing remains a separate verification step.

Cover Flow entry now reveals the fan by moving the outgoing menu halves toward opposite edges over the existing 320ms token. This is a user-requested ReiPod adaptation, reversing the established split-menu exit; it supersedes the earlier immediate fan reveal and is not a newly measured firmware animation. Captured clipping boundaries survive interruptions, so returning midway retains visible fragments rather than exposing whole duplicate pages. Reduced motion continues to enter directly.
