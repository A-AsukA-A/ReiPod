# Classic interface reference

ReiPod targets the color split-screen iPod classic interface. It is a web implementation, not original firmware.

Original hardware is the authority: prefer the same model/firmware's observed behavior and verified firmware analysis over My Classic, iPod.js or general modern UI recommendations. The source catalog, acquired original IPSW checks and timing observations are in [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md). Calibration choices are labelled rather than presented as recovered Apple constants.

## Verified references

- [Apple technical specifications](https://support.apple.com/en-us/112321): 103.5 × 61.8 mm body; 2.5-inch, 320 × 240 color LCD. The body ratio and LCD aspect ratio follow those measurements. The LCD width/body width ratio is derived from the diagonal and resolution: 50.8 / 61.8.
- [Apple iPod classic User Guide](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1195_ipod_classic_160gb_user_guide.pdf), pages 5–9 and 24–25: wheel selection, Menu return, long Menu home, long Center options, long side-button seeking, long Play sleep, Hold locking without interrupting playback, scrubber operation, shuffle, ratings, and lyrics. Page 8 illustrates the split menu and its status indicators.
- [Contemporary first-hand photographs, The Gadgeteer](https://the-gadgeteer.com/2007/09/19/apple_ipod_classic/): visual comparison of the menu, settings, album artwork motion, and metal enclosure. Used as reference only; photographs and original firmware assets are not distributed.
- [Apple's 2007 announcement](https://www.apple.com/newsroom/2007/09/05Apple-Introduces-New-iPod-classic/): Cover Flow and the metal enclosure identify the intended generation.

## Calibrated, rather than manufacturer-specified

The 20-pixel header, 24-pixel menu rows and 16-pixel menu type at a 320-pixel LCD width are visual calibrations. The LCD uses bundled Noto Sans SC (SIL OFL 1.1), with real weights 400–700 and font synthesis disabled, so Windows, Android and iOS use the same glyph shapes and metrics. UI glyphs preload (99 kB); common library characters and extended characters load on demand (1.83 MB / 5.93 MB). This is a redistributable substitute, not Apple's firmware font; OS rasterization can still vary. `scripts/subset-font.py` reproduces the font shards from Google's source TTF. The split is 160/160. The blue selection gradient, filled arrow silhouettes, embossed contextual icons, wheel proportions and reflections are redrawn in CSS/SVG.

## Menu hierarchy and HOLD

The menu baseline is the **2007 iPod classic (6th generation)**, cross-checked with the contemporary first-hand photographs linked above: [main menu](https://the-gadgeteer.com/assets/apple-ipod-classic-10.jpg), [Music](https://the-gadgeteer.com/assets/apple-ipod-classic-7.jpg), and [Settings](https://the-gadgeteer.com/assets/apple-ipod-classic-42.jpg). The Apple guide, page 26, explicitly places Cover Flow in Music; page 8 describes optional main-menu shortcuts. Main-menu placement alone therefore does not identify a faithful default.

- Main menu: Music → Photos → Podcasts → Extras → Settings → Shuffle Songs → Now Playing (when a current track exists). Unsupported Videos is omitted.
- Highlighting Now Playing uses the same full-pane artwork renderer, crop and slow drift as the Music cover carousel, without a separate thumbnail or metadata card. It shows the current song's artwork, falling back to the matching album's artwork. The preview stays on the current track when paused and updates on track changes; it does not cycle unrelated covers. Only missing or failed artwork uses the music-note placeholder.
- Music: Cover Flow → Playlists → Artists → Albums → Songs → Genres → Composers → Search. Unsupported Audiobooks is omitted. Web import and demo actions follow the original categories.
- The Artists browser drills into a scoped album list with All Songs at the top, matching the [2007 hardware photograph](https://the-gadgeteer.com/assets/apple-ipod-classic-26.jpg). Artists also has an All Albums aggregate. Back navigation remembers focus separately for each artist scope, and playback uses only that scope's tracks, including within compilations. Albums sorts by title; Cover Flow separately sorts by artist then title, as specified on page 26 of the Apple guide. Missing or failed artwork uses a neutral music-note placeholder.
- Settings starts with About → Shuffle → Repeat → Main Menu → Music Menu → Volume Limit → Backlight → Brightness. The Music Menu page controls visibility of existing music categories. Web appearance, library management and credits follow the implemented device settings.
- Version 3 preferences remove the old automatically enabled Cover Flow/import/demo home shortcuts. Explicitly adding Cover Flow in the new Main Menu settings remains possible. Appearance and playback preferences are retained.
- The top-left switch is **HOLD**, not mute: the guide's pages 6–7 specify an orange bar and disabled controls while audio continues. Its 34 × 7 px top-edge slot has a 54 × 44 px touch target, a metal thumb and 160 ms transform/opacity transitions. Keyboard toggles and reduced motion skip the thumb animation. These dimensions and timing are web adaptations, not measured firmware values.

Apple does not publish the transition curves or button-hold thresholds in these references. Motion timing now comes from `src/ui/motion.ts`: 360 ms menu travel with a symmetric curve, 300 ms playback-view fade, 360 ms album flip, a 320 ms Cover Flow title/caption entrance, and a 480 ms exit in which the two menu halves meet from opposite edges. The 25 fps 2007 hardware review informs the menu/flip/exit calibration; this is a visual measurement with at least one-frame boundary uncertainty, not recovered firmware constants. The previous My Classic-derived 560 ms flip is superseded. Artwork uses a 6 s interval and 650 ms fade; these remain provisional web calibration values. Menu/Center hold remains 600 ms, seek hold 350 ms, sleep hold 800 ms. Reduced motion skips navigation movement.

## Web-specific behavior

Imports and browser-local playlists remain available. Local photo albums/slideshows and local podcast shows/episodes are implemented. Video, camera capture, RSS subscriptions, Genius and iTunes synchronization are not represented by nonfunctional menu items. Storage and battery indicators use browser capabilities where available; a firmware-like icon is not evidence of hardware equivalence. Unavailable battery readings use a full icon by request; its accessible label identifies it as a default display. No numeric battery percentage or charging state is fabricated, and no disk capacity is invented. Original vectors are authored for this project.

## Supplied My Classic recording

A privately supplied 36.67-second recording was reviewed frame by frame around menu navigation, Cover Flow and settings. It confirms a split menu with Photos/Podcasts, continuous artwork browsing and checked choice submenus. A second 91.8-second recording adds the album flip, playback controls and photo browsing. Those visible interactions now inform the following implementation:

- Cover Flow retains its fan and header while the selected cover flips into an album/artist heading and track sheet occupying 80% of the LCD width. MENU reverses the flip and preserves the selected album.
- The playing screen anchors the reflected, slightly turned artwork on the left and metadata on the right. A single bottom bay switches between inline elapsed/progress/remaining time, seek, temporary volume, repeat/shuffle choices and rating. These indicators are passive; the dial changes their values.
- Photos opens a full-width thumbnail album list, then a five-column contact sheet with a gray count/date strip and yellow selection frame. Full-image viewing hides the menu header. The displayed date comes from the imported file's modification time; no capture date is inferred.

These are visual calibrations from the recordings, not recovered application source or exact timing specifications. ReiPod retains the original iPod's 320 × 240 logical LCD grid rather than adopting the reference app's portrait-video proportions. The supplied IPA was inspected statically; its main executable remains encrypted. Reference videos, fonts, artwork and application binaries are not redistributed.

The web player deliberately treats the LCD as a display. Every in-app action is reachable through the wheel, Center, Menu, transport buttons or physical Hold switch; native file selection happens outside the device screen. Mouse notches are discrete rather than accelerated. Album-sheet transitions support quick reversals without leaving outgoing frames behind.
