import UIKit
import WebKit

@MainActor
final class PlayerViewController: UIViewController, WKNavigationDelegate {
    private let music = NativeMusicService()
    private var bridge: MusicBridge?
    private var thirdPartyBridge: ThirdPartyMusicBridge?
    private var webView: WKWebView?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.91, green: 0.89, blue: 0.86, alpha: 1)
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
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        let assets = AppResources(root: root, music: music)
        configuration.setURLSchemeHandler(assets, forURLScheme: "reipod-app")
        configuration.setURLSchemeHandler(assets, forURLScheme: "reipod-artwork")
        let bridge = MusicBridge(music: music)
        configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "reipodMusic")
        configuration.userContentController.addUserScript(WKUserScript(
            source: "Object.defineProperty(window, '__REIPOD_NATIVE_MUSIC_VERSION__', {value: 1, writable: false});",
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
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)
        ])
        bridge.webView = webView
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

    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); becameActive() }
    override func viewDidDisappear(_ animated: Bool) { super.viewDidDisappear(animated); music.stopObservation() }
    @objc private func becameActive() { music.startObservation(); music.publish() }
    @objc private func enteredBackground() { music.stopObservation() }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard navigationAction.targetFrame != nil,
              navigationAction.request.url?.scheme == "reipod-app",
              navigationAction.request.url?.host == "bundle" else { return .cancel }
        return .allow
    }
}
