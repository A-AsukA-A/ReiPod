import SwiftUI

@main
struct ReiPodApp: App {
    var body: some Scene {
        WindowGroup {
            PlayerScreen()
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
