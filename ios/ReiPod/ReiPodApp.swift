import SwiftUI

@main
struct ReiPodApp: App {
    @UIApplicationDelegateAdaptor(ReiPodDelegate.self) private var delegate
    var body: some Scene {
        WindowGroup {
            PlayerScreen()
                .ignoresSafeArea()
                .background(Color.clear)
                .preferredColorScheme(.light)
        }
    }
}

private struct PlayerScreen: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> PlayerViewController {
        PlayerViewController()
    }

    func updateUIViewController(_ controller: PlayerViewController, context: Context) {}
}

@MainActor
private final class ReiPodDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Set the notification delegate before launch returns, including cold notification launches.
        _ = AlarmsBridge.shared
        return true
    }
}
