# ReiPod development instructions

Start every task with [DEVELOPMENT.md](DEVELOPMENT.md) and [TASK_LOG.md](TASK_LOG.md), the unified development guide and persistent task handoff. Follow them alongside the rules below; update the owning document when a decision changes.

## Mandatory task log

- Every task, including research, review and documentation-only work, must read TASK_LOG.md before starting and update it before the final response. On context recovery, reread its current handoff and relevant specifications before continuing.
- At task start, record the objective, affected item IDs and current work in progress. Check the actual working tree; the log is a handoff, not proof that files or test results are still current.
- Update at meaningful checkpoints and before a planned interruption or handoff. Before finishing, refresh completed, unfinished and uncertain items, validation actually performed, and the exact next step with relevant file/source links. If no project state changed, still append a brief task outcome.
- Use stable item IDs. Keep unfinished work separate from uncertainty; record the evidence needed to resolve uncertainty. Never mark planned work, a partial review, a mock test or old verification as newly completed.
- Keep the current handoff concise; append dated task records below it. Summarize older completed history when needed, preserving decisions, evidence links and all open items. Do not paste conversations, raw tool output or credentials into the log. Detailed specifications remain in their owning documents.
- If the log cannot be read or written, report the concrete reason and include the missing handoff in the final response; do not silently claim compliance.

## Repository structure

Use [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for file placement. Keep implemented model identity/LCD/input policy in `src/models/` with evidence labels, application composition in `src/app/`, playback logic in `src/player/`, platform/service integration in `src/services/`, and model presentation/input in `src/ui/` and `src/input/`. Update the structure map, imports, scripts and documentation together when moving files. Do not equate a directory move with completed architectural separation.

## Project scope

ReiPod simulates the full iPod nano, iPod mini, and iPod/classic families, with local web playback, an iPhone WKWebView/MediaPlayer transport, and optional self-hosted NetEase/QQ services. Continue the existing implementation. UI work must preserve provider isolation, queues, native authorization, background playback, and local imports.

## Third-party music architecture

Product decision (2026-10-29): local apps provide built-in backend capabilities; the web version connects to the maintainer's HTTPS music backend. Browser extension distribution and transport are retired. See [MUSIC_SERVICES.md](MUSIC_SERVICES.md) and [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md).

- Local apps initialize their music service internally. Users must not need to start a server manually or configure an API URL for the default app experience. iOS uses a native network bridge, not a Node subprocess.
- GitHub Pages remains static and connects to the configured HTTPS backend. Do not revert to extension installation or Pages-to-localhost as the default route.
- Keep provider credentials within the native service or server boundary. Expose only needed operations and results, restrict callers and provider destinations, and never expose an arbitrary URL proxy or raw platform cookies to the page.
- Preserve provider/account/library/queue isolation, local imports and existing Apple Music routes. Keep development self-hosting available.
- Ordinary Safari pages and PWAs use the HTTPS backend; do not claim native authorization, background playback or lock-screen capabilities without actual platform verification.
- Report migration and real-account verification status explicitly. [MUSIC_BRIDGE.md](MUSIC_BRIDGE.md) tracks native verification; [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md) tracks server verification. Compile or anonymous QR success does not establish real-account playback.

## UI work

Before changing UI, read [DEVICE_STANDARDS.md](DEVICE_STANDARDS.md), [UI_METRICS.md](UI_METRICS.md), [UI_STANDARDS.md](UI_STANDARDS.md), [REPLICA.md](REPLICA.md), [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md), and [PLAYBACK_INTERACTIONS.md](PLAYBACK_INTERACTIONS.md).

- The product scope includes all generations of iPod nano, iPod mini, and iPod/classic, including the pre-classic iPod generations. The existing shell/menu baseline remains the 2007 iPod classic 6G; this is the current implementation baseline, not a limit on product scope. Keep each family, generation, hardware revision and firmware distinct; My Classic and web replicas remain comparison samples.
- Use [MacDB’s iPod/classic catalog](https://macdb.cn/ipod-classic) as a third-party model/specification index and an entry point to Apple technical documents; see [HARDWARE_RESEARCH.md](HARDWARE_RESEARCH.md). Verify specifications against the corresponding Apple source before adopting them. The linked page does not establish nano/mini coverage or firmware UI geometry.
- Follow the four-layer dependency contract in DEVELOPMENT.md. A model/firmware interaction is not an appearance theme. Keep playback/session lifetime independent of model and finish changes.
- Maintain per-state metric records in UI_METRICS.md. Provisional or unknown metrics cannot pass hardware-fidelity acceptance; browser screenshots are engineering evidence only.
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
