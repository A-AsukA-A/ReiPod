# ReiPod development instructions

## Project scope

ReiPod is a classic-style player with local web playback, an iPhone WKWebView/MediaPlayer transport, and optional self-hosted NetEase/QQ services. Continue the existing implementation. UI work must preserve provider isolation, queues, native authorization, background playback, and local imports.

## Third-party music architecture

Product decision (2026-10-28): local apps provide built-in backend capabilities; the web version uses a browser extension. See [MUSIC_SERVICES.md](MUSIC_SERVICES.md) for the implementation status and boundaries.

- Local apps initialize their music service internally. Users must not need to start a server manually or configure an API URL for the default app experience. Desktop apps may bundle a Node service managed by the app; iOS implements equivalent capabilities through a native network bridge, not a desktop Node subprocess.
- GitHub Pages remains static. The default web route is an extension bridge that handles provider requests, signing and login sessions without a localhost HTTP service or a project-operated remote backend. Do not make the earlier Pages-to-localhost proposal the default architecture.
- Keep provider credentials within the native service or extension boundary; expose only the operations and results needed by the UI. Restrict bridge callers and provider destinations; do not expose an arbitrary URL proxy or raw platform cookies to the page.
- Keep a shared service contract and preserve provider/account/library/queue isolation, local imports and the existing Apple Music routes. Existing self-hosted support remains a development/optional path while migration is incomplete.
- Web extension work targets desktop Chrome/Edge first. iOS Safari extension support requires separate validation; do not present an ordinary Safari page or PWA as having extension/native capabilities. Login, playback permissions and background playback require actual platform verification.
- Report migration and real-account verification status explicitly. Current iOS/extension implementation and outstanding checks are tracked in [MUSIC_BRIDGE.md](MUSIC_BRIDGE.md); code or compile success does not establish real-account or device playback.

## UI work

Before changing UI, read [UI_STANDARDS.md](UI_STANDARDS.md), [REPLICA.md](REPLICA.md), [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md), and [PLAYBACK_INTERACTIONS.md](PLAYBACK_INTERACTIONS.md).

- The existing shell/menu target is the 2007 iPod classic 6G. Keep later Classic revisions, fifth-generation iPod video, nano, My Classic, and web replicas distinct.
- Cite evidence for restoration claims. Record model, firmware when known, source URL/revision, coordinate normalization, and measurement uncertainty. An existing CSS value or passing browser test is not proof of a hardware value.
- Prefer matching physical-device evidence and verified original-system behavior. Use Apple manuals for documented behavior, and treat their illustrations as illustrations. Modern HIG guides ReiPod additions and accessibility; it does not specify legacy firmware geometry.
- Label numeric values as documented, measured with uncertainty, provisional, or a ReiPod adaptation. Do not call estimates “pixel-perfect,” “manufacturer-specified,” or “hardware calibrated.”
- Preserve explicit user choices, including full artwork for the main-menu Now Playing preview, the long-Center lyrics shortcut, account/VIP feedback, and the lyrics switch. Document departures from stock behavior instead of silently removing them.
- Keep the LCD display-only and actions reachable through the wheel/buttons. Use deterministic fixtures and settled screenshots when evaluating layout. Keep motion interruptible and respect reduced motion.
- For component styling, inspect the final computed styles and cascade before editing. Avoid adding another conflicting override to repair an existing override. Keep geometry and motion sources explicit.
- Missing measurements are research tasks, not grounds to invent constants. Continue independent work; clarify only when a necessary product choice cannot be inferred. These rules add no separate approval gate to work the user has authorized.

## Validation

Use checks appropriate to the change. For a playback/account change: `npm test`, `npm run test:music-server`, `npm run build`, and relevant Playwright cases. Broaden browser testing when shared navigation/rendering changes. Use a configured browser executable if the bundled browser is unavailable.

For production artifacts run `node scripts/check-dist.mjs` and `npm run size`. iOS resources are generated with `npm run ios:prepare`; generated web resources and Xcode build outputs remain ignored. Do not claim a device installation or real-account test from a mock or compile result.

A standards/documentation edit needs source/link and diff review, not new tests that merely mirror prose. Preserve an evidence trail for later UI calibration; do not fabricate a baseline just to make a screenshot check pass.

## Files and credentials

`.local/`, `analysis/`, and `docs/` are ignored research/private directories. Put maintained public development documentation at the repository root, as with `UI_STANDARDS.md`. Do not unignore an entire private directory to publish a document.

Do not commit cookies, opaque session tokens, the session vault/key, Apple private keys, provisioning profiles, recordings, firmware images, private reference assets, `node_modules/`, or generated builds. Public references should normally be links, provenance notes and independently authored measurements, not redistributed copyrighted assets.

Read [MUSIC_SERVICES.md](MUSIC_SERVICES.md) before service changes and [ios/README.md](ios/README.md) before native changes. GitHub Pages hosts static assets only; a localhost music backend does not become a public backend when the website is pushed.
