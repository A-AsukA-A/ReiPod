# Classic interface reference

ReiPod targets the color split-screen iPod classic interface. It is a web implementation, not original firmware.

## Verified references

- [Apple technical specifications](https://support.apple.com/en-us/112321): 103.5 × 61.8 mm body; 2.5-inch, 320 × 240 color LCD. The body ratio and LCD aspect ratio follow those measurements. The LCD width/body width ratio is derived from the diagonal and resolution: 50.8 / 61.8.
- [Apple iPod classic User Guide](https://cdsassets.apple.com/live/6GJYWVAV/user/ma1195_ipod_classic_160gb_user_guide.pdf), pages 5–9 and 24–25: wheel selection, Menu return, long Menu home, long Center options, long side-button seeking, long Play sleep, Hold locking without interrupting playback, scrubber operation, shuffle, ratings, and lyrics. Page 8 illustrates the split menu and its status indicators.
- [Contemporary first-hand photographs, The Gadgeteer](https://the-gadgeteer.com/2007/09/19/apple_ipod_classic/): visual comparison of the menu, settings, album artwork motion, and metal enclosure. Used as reference only; photographs and original firmware assets are not distributed.
- [Apple's 2007 announcement](https://www.apple.com/newsroom/2007/09/05Apple-Introduces-New-iPod-classic/): Cover Flow and the metal enclosure identify the intended generation.

## Calibrated, rather than manufacturer-specified

The 20-pixel header, 24-pixel menu rows and 16-pixel menu type at a 320-pixel LCD width are visual calibrations. Chinese system sans-serif fonts (Microsoft YaHei / PingFang SC) are preferred, with Helvetica Neue / Arial fallbacks; proprietary font files are not bundled. The split is 160/160. The blue selection gradient, filled arrow silhouettes, embossed contextual icons, wheel proportions and reflections are redrawn in CSS/SVG.

Apple does not publish the transition curves or button-hold thresholds in these references. ReiPod's 280 ms page transition, 200 ms playback-view transition, 360 ms cover fade, 4.5 s artwork interval, 600 ms Menu/Center hold, 350 ms seek hold and 800 ms sleep hold are implementation choices, not claimed measurements from an original device.

## Web-specific behavior

Imports and browser-local playlists remain available. Local photo albums/slideshows and local podcast shows/episodes are implemented. Video, camera capture, RSS subscriptions, Genius and iTunes synchronization are not represented by nonfunctional menu items. Storage and battery indicators use browser capabilities where available; a firmware-like icon is not evidence of hardware equivalence. Unavailable battery readings use a full icon by request; its accessible label identifies it as a default display. No numeric battery percentage or charging state is fabricated, and no disk capacity is invented. Original vectors are authored for this project.

## Supplied My Classic recording

A privately supplied 36.67-second recording was reviewed frame by frame around menu navigation, Cover Flow and settings. It confirms a split menu with Photos/Podcasts, continuous artwork browsing and checked choice submenus. The recording does not show a song-playing interaction or selecting a Cover Flow album, so those flows follow the Apple guide above and remain subject to further visual comparison. The supplied IPA was inspected statically; its main executable is encrypted. Reference videos, fonts, artwork and application binaries are not redistributed.

The web player deliberately treats the LCD as a display. Every in-app action is reachable through the wheel, Center, Menu, transport buttons or physical Hold switch; native file selection happens outside the device screen. Mouse notches are discrete rather than accelerated. A dedicated Cover Flow album screen preserves album context and returns to the selected cover.
