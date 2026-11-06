import UIKit
import WebKit

@MainActor
final class PlayerViewController: UIViewController, WKNavigationDelegate {
    private let music = NativeMusicService()
    private let photos = NativePhotoService()
    private var photoBridge: PhotoBridge?
    private var bridge: MusicBridge?
    private var thirdPartyBridge: ThirdPartyMusicBridge?
    private let battery = DeviceBatteryBridge()
    private let experience = ExperienceBridge()
    private var webView: WKWebView?
    private var appliedSafeArea: UIEdgeInsets?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ExperienceBridge.background
        view.isOpaque = false
        guard let root = Bundle.main.url(forResource: "Web", withExtension: nil) else {
            let label = UILabel()
            label.text = "缺少网页资源，请先运行 npm run ios:prepare"
            label.numberOfLines = 0
            label.textAlignment = .center
            label.frame = view.bounds
            label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.addSubview(label)
            return
        }
        experience.onAppearance = { [weak self] in self?.applyAppearance() }
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(experience, name: "reipodExperience")
        configuration.userContentController.addUserScript(WKUserScript(
            source: "Object.defineProperty(window, '__REIPOD_NATIVE_EXPERIENCE_VERSION__', {value: 1, writable: false});",
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
        configuration.userContentController.addScriptMessageHandler(battery, contentWorld: .page, name: "reipodBattery")
        configuration.userContentController.addUserScript(WKUserScript(
            source: "Object.defineProperty(window, '__REIPOD_NATIVE_BATTERY_VERSION__', {value: 1, writable: false});",
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        let assets = AppResources(root: root, music: music)
        configuration.setURLSchemeHandler(assets, forURLScheme: "reipod-app")
        configuration.setURLSchemeHandler(assets, forURLScheme: "reipod-artwork")
        let photoBridge = PhotoBridge(photos: photos)
        configuration.setURLSchemeHandler(photoBridge, forURLScheme: "reipod-photo")
        configuration.userContentController.addScriptMessageHandler(photoBridge, contentWorld: .page, name: "reipodPhotos")
        configuration.userContentController.addUserScript(WKUserScript(
            source: "Object.defineProperty(window, '__REIPOD_NATIVE_PHOTOS_VERSION__', {value: 1, writable: false});",
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let bridge = MusicBridge(music: music)
        configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "reipodMusic")
        configuration.userContentController.addUserScript(WKUserScript(
            source: "Object.defineProperty(window, '__REIPOD_NATIVE_MUSIC_VERSION__', {value: 1, writable: false}); Object.defineProperty(window, '__REIPOD_NATIVE_PODCASTS_VERSION__', {value: 1, writable: false});",
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let thirdPartyBridge = ThirdPartyMusicBridge()
        if let runtimeURL = Bundle.main.url(forResource: "music-runtime", withExtension: "js", subdirectory: "Web"),
           let runtime = try? String(contentsOf: runtimeURL, encoding: .utf8) {
            configuration.userContentController.addScriptMessageHandler(thirdPartyBridge, contentWorld: .page, name: "reipodService")
            configuration.userContentController.addScriptMessageHandler(thirdPartyBridge, contentWorld: ThirdPartyMusicBridge.world, name: "reipodServiceHost")
            configuration.userContentController.addUserScript(WKUserScript(source: runtime, injectionTime: .atDocumentStart, forMainFrameOnly: true, in: ThirdPartyMusicBridge.world))
            configuration.userContentController.addUserScript(WKUserScript(
                source: "Object.defineProperty(window, '__REIPOD_SERVICE_VERSION__', {value: 1, writable: false});",
                injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.underPageBackgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        battery.webView = webView
        bridge.webView = webView
        photoBridge.webView = webView
        photos.onChange = { [weak photoBridge] in photoBridge?.changed() }
        self.photoBridge = photoBridge
        thirdPartyBridge.webView = webView
        self.thirdPartyBridge = thirdPartyBridge
        music.onEvent = { [weak bridge] reply in bridge?.send(reply) }
        self.bridge = bridge
        self.webView = webView
        guard let url = URL(string: "reipod-app://bundle/index.html") else { return }
        webView.load(URLRequest(url: url))
        NotificationCenter.default.addObserver(self, selector: #selector(becameActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(enteredBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        applyAppearance()
        updateSafeArea()
        becameActive()
    }
    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); applyAppearance(); updateSafeArea() }
    override func viewSafeAreaInsetsDidChange() { super.viewSafeAreaInsetsDidChange(); updateSafeArea() }

    // The backdrop is edge-to-edge. CSS receives real window insets for the controls.
    private func updateSafeArea() {
        guard let webView, let window = view.window else { return }
        let insets = window.safeAreaInsets
        guard insets != appliedSafeArea else { return }
        appliedSafeArea = insets
        webView.callAsyncJavaScript("""
            for (const [edge, value] of Object.entries(insets))
              document.documentElement.style.setProperty('--host-safe-' + edge, value + 'px');
            """, arguments: ["insets": ["top": insets.top, "bottom": insets.bottom,
                "left": insets.left, "right": insets.right]], in: nil, in: .page, completionHandler: nil)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        appliedSafeArea = nil
        updateSafeArea()
        battery.start()
    }
    override func viewDidDisappear(_ animated: Bool) { super.viewDidDisappear(animated); battery.stop(); music.stopObservation() }
    private func applyAppearance() {
        view.backgroundColor = ExperienceBridge.background
        view.window?.backgroundColor = ExperienceBridge.background
        if let root = view.window?.rootViewController, root !== self { root.view.backgroundColor = .clear }
    }
    @objc private func becameActive() { experience.refreshActivity(); battery.start(); music.startObservation(); music.libraryDidChange(); photos.invalidate(); photoBridge?.changed() }
    @objc private func enteredBackground() { experience.suspend(); battery.stop(); music.stopObservation() }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard navigationAction.targetFrame != nil,
              navigationAction.request.url?.scheme == "reipod-app",
              navigationAction.request.url?.host == "bundle" else { return .cancel }
        return .allow
    }
}
