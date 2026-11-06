import UIKit
import WebKit

struct NativeBatteryReading {
    let level: Double
    let charging: Bool

    static func read(level: Float, state: UIDevice.BatteryState) -> NativeBatteryReading? {
        guard level.isFinite, (0...1).contains(level), state != .unknown else { return nil }
        return NativeBatteryReading(level: Double(level), charging: state == .charging || state == .full)
    }
    var json: [String: Any] { ["level": level, "charging": charging] }
}

/// Only battery charge/power state is exposed; no identifiers, settings or media access.
@MainActor
final class DeviceBatteryBridge: NSObject, WKScriptMessageHandlerWithReply {
    weak var webView: WKWebView?
    private var observers: [any NSObjectProtocol] = []
    private var previouslyMonitoring = false

    func start() {
        if observers.isEmpty {
            previouslyMonitoring = UIDevice.current.isBatteryMonitoringEnabled
            for name in [UIDevice.batteryLevelDidChangeNotification, UIDevice.batteryStateDidChangeNotification] {
                observers.append(NotificationCenter.default.addObserver(forName: name, object: UIDevice.current, queue: .main) { [weak self] _ in
                    MainActor.assumeIsolated { self?.publish() }
                })
            }
            UIDevice.current.isBatteryMonitoringEnabled = true
        }
        publish()
    }
    func stop() {
        guard !observers.isEmpty else { return }
        observers.forEach(NotificationCenter.default.removeObserver)
        observers.removeAll()
        UIDevice.current.isBatteryMonitoringEnabled = previouslyMonitoring
    }
    private var reading: NativeBatteryReading? {
        NativeBatteryReading.read(level: UIDevice.current.batteryLevel, state: UIDevice.current.batteryState)
    }
    private func publish() {
        guard UIApplication.shared.applicationState == .active,
              let webView, webView.url?.scheme == "reipod-app", webView.url?.host == "bundle" else { return }
        webView.callAsyncJavaScript("window.dispatchEvent(new CustomEvent('reipod-native-battery', {detail: battery}));",
            arguments: ["battery": reading?.json ?? NSNull()], in: nil, in: .page, completionHandler: nil)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "reipod-app",
              message.frameInfo.request.url?.host == "bundle", let body = message.body as? [String: Any],
              body["version"] as? Int == 1, body["action"] as? String == "status" else {
            replyHandler(nil, "当前页面无权读取电池状态"); return
        }
        start()
        replyHandler(reading?.json ?? NSNull(), nil)
    }
}
