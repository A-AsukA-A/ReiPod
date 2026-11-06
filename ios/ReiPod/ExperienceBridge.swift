import UIKit
import WebKit

/// App-only presentation/feedback, independent of media authorization and playback.
@MainActor
final class ExperienceBridge: NSObject, WKScriptMessageHandler {
    private let selection = UISelectionFeedbackGenerator()
    private let impact = UIImpactFeedbackGenerator(style: .light)
    private var lastFeedback: TimeInterval = -.infinity
    private var keepAwake = UserDefaults.standard.object(forKey: "reipod.keepAwake") as? Bool ?? true
    var onAppearance: (() -> Void)?

    static var background: UIColor {
        color(for: UserDefaults.standard.string(forKey: "reipod.background") ?? "transparent")
    }
    static func color(for background: String) -> UIColor {
        switch background {
        case "warm": UIColor(red: 232/255, green: 227/255, blue: 220/255, alpha: 1)
        case "dark": UIColor(red: 32/255, green: 33/255, blue: 36/255, alpha: 1)
        default: .clear
        }
    }
    func refreshActivity() { UIApplication.shared.isIdleTimerDisabled = keepAwake && UIApplication.shared.applicationState == .active }
    func suspend() { UIApplication.shared.isIdleTimerDisabled = false }

    struct Request: Decodable {
        enum Action: String, Decodable { case press, step, appearance }
        let version: Int
        let action: Action
        var background: String?
        var keepAwake: Bool?
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "reipod-app",
              message.frameInfo.request.url?.host == "bundle",
              let data = try? JSONSerialization.data(withJSONObject: message.body),
              let request = try? JSONDecoder().decode(Request.self, from: data), request.version == 1 else { return }
        if request.action == .appearance {
            guard let background = request.background, ["transparent", "warm", "dark"].contains(background),
                  let awake = request.keepAwake else { return }
            UserDefaults.standard.set(background, forKey: "reipod.background")
            UserDefaults.standard.set(awake, forKey: "reipod.keepAwake")
            keepAwake = awake
            onAppearance?()
            refreshActivity()
            return
        }
        guard UIApplication.shared.applicationState == .active else { return }
        let now = ProcessInfo.processInfo.systemUptime
        guard now - lastFeedback >= (request.action == .step ? 0.04 : 0.02) else { return }
        lastFeedback = now
        switch request.action {
        case .step: selection.selectionChanged(); selection.prepare()
        case .press: impact.impactOccurred(intensity: 0.65); impact.prepare()
        case .appearance: break
        }
    }
}
