import AVFAudio
import MediaPlayer
import UIKit

/// Hosts Apple's volume slider; never changes the audio session or music queue.
@MainActor
final class SystemVolumeControl {
    let view = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 120, height: 44))

    init() {
        view.isUserInteractionEnabled = false
        view.accessibilityElementsHidden = true
    }

    private var slider: UISlider? {
        view.subviews.compactMap { $0 as? UISlider }.first
    }

    var available: Bool {
        #if targetEnvironment(simulator)
        return false // MPVolumeView cannot control Simulator output.
        #else
        guard view.window != nil, let slider else { return false }
        return !slider.isHidden && slider.isEnabled
        #endif
    }

    func setVolume(_ value: Float) async throws {
        guard value.isFinite, (0...1).contains(value) else { throw NativeMusicError.invalidRequest }
        guard available, UIApplication.shared.applicationState == .active, let slider else {
            throw NativeMusicError.volumeUnavailable
        }
        // MPVolumeView documents its slider as UISlider. No private class names,
        // selectors, deprecated player.volume writes or audio-session activation.
        slider.setValue(value, animated: false)
        slider.sendActions(for: .valueChanged)
        slider.sendActions(for: .touchUpInside)
        // The output change is asynchronous. Acknowledge the real output rather
        // than returning the previous volume and making a fast wheel jump back.
        for _ in 0..<20 {
            if abs(AVAudioSession.sharedInstance().outputVolume - value) < 0.02 { return }
            try await Task.sleep(for: .milliseconds(20))
        }
        throw NativeMusicError.volumeUnavailable
    }
}
