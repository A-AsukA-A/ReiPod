import Testing
import WebKit
import UIKit
@testable import ReiPod

@MainActor
struct WebBundleTests {
    @Test(.timeLimit(.minutes(1)))
    func bundledInterfaceSupportsNativeBridgeFetchAndStorage() async throws {
        let controller = PlayerViewController()
        let scene = try #require(UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let window = UIWindow(windowScene: scene)
        window.rootViewController = controller
        window.makeKeyAndVisible()
        controller.loadViewIfNeeded()
        defer { window.isHidden = true; controller.viewDidDisappear(false) }
        let web = try #require(controller.view.subviews.compactMap { $0 as? WKWebView }.first)
        var mounted = false
        for _ in 0..<150 {
            let value = try? await web.evaluateJavaScript("Boolean(document.querySelector('main[data-music-service]'))")
            if value as? Bool == true { mounted = true; break }
            try await Task.sleep(for: .milliseconds(100))
        }
        try #require(mounted, "The bundled JavaScript must mount without a network server")
        let service = try await web.callAsyncJavaScript("""
            const reply = await window.webkit.messageHandlers.reipodService.postMessage({version:1,service:'netease',action:'status',body:{},token:''});
            return {version:window.__REIPOD_SERVICE_VERSION__,status:reply.status,authorized:reply.data.authorized,hostVisible:!!window.webkit.messageHandlers.reipodServiceHost};
            """, arguments: [:], in: nil, contentWorld: .page)
        let serviceResult = try #require(service as? [String: Any])
        #expect(serviceResult["version"] as? Int == 1)
        #expect(serviceResult["status"] as? Int == 200)
        #expect(serviceResult["authorized"] as? Bool == false)
        #expect(serviceResult["hostVisible"] as? Bool == false)
        let crypto = try await web.evaluateJavaScript("Boolean(globalThis.crypto?.subtle)", in: nil, contentWorld: ThirdPartyMusicBridge.world)
        #expect(crypto as? Bool == true, "QQ sealed sessions require Web Crypto in the isolated world")
        let value = try await web.callAsyncJavaScript("""
            const notice = await fetch('./third-party-licenses.txt').then(r => r.text());
            localStorage.setItem('native-smoke', 'saved');
            const saved = localStorage.getItem('native-smoke');
            localStorage.removeItem('native-smoke');
            const database = await new Promise((resolve, reject) => {
              const r = indexedDB.open('reipod-native-smoke', 1);
              r.onupgradeneeded = () => r.result.createObjectStore('test');
              r.onerror = () => reject(r.error);
              r.onsuccess = () => { r.result.close(); resolve(true); };
            });
            const status = await window.webkit.messageHandlers.reipodMusic.postMessage({version: 1, action: 'status'});
            return {native: window.__REIPOD_NATIVE_MUSIC_VERSION__, fetched: notice.includes('MIT License'), saved, database, authorization: status.authorization};
            """, arguments: [:], in: nil, contentWorld: .page)
        let result = try #require(value as? [String: Any])
        #expect(result["native"] as? Int == 1)
        #expect(result["fetched"] as? Bool == true)
        #expect(result["saved"] as? String == "saved")
        #expect(result["database"] as? Bool == true)
        #expect(result["authorization"] as? String != nil)
    }
}
