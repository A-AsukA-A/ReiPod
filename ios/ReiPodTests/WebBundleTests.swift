import Testing
import WebKit
@testable import ReiPod

@MainActor
struct WebBundleTests {
    @Test(.timeLimit(.minutes(1)))
    func bundledInterfaceSupportsNativeBridgeFetchAndStorage() async throws {
        let controller = PlayerViewController()
        controller.loadViewIfNeeded()
        defer { controller.viewDidDisappear(false) }
        let web = try #require(controller.view.subviews.compactMap { $0 as? WKWebView }.first)
        var mounted = false
        for _ in 0..<150 {
            let value = try? await web.evaluateJavaScript("Boolean(document.querySelector('main[data-music-service]'))")
            if value as? Bool == true { mounted = true; break }
            try await Task.sleep(for: .milliseconds(100))
        }
        try #require(mounted, "The bundled JavaScript must mount without a network server")
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
            """, arguments: [:], in: nil, in: .page)
        let result = try #require(value as? [String: Any])
        #expect(result["native"] as? Int == 1)
        #expect(result["fetched"] as? Bool == true)
        #expect(result["saved"] as? String == "saved")
        #expect(result["database"] as? Bool == true)
        #expect(result["authorization"] as? String != nil)
    }
}
