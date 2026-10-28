import Foundation
import WebKit

@MainActor
final class MusicBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let music: NativeMusicService
    weak var webView: WKWebView?

    init(music: NativeMusicService) { self.music = music }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        // Never grant native access to an iframe or an external webpage.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == "reipod-app",
              message.frameInfo.request.url?.host == "bundle" else {
            replyHandler(nil, "当前页面无权访问系统音乐"); return
        }
        let request: NativeMusicRequest
        do {
            let data = try JSONSerialization.data(withJSONObject: message.body)
            request = try JSONDecoder().decode(NativeMusicRequest.self, from: data)
        } catch {
            replyHandler(nil, "无效的系统音乐请求"); return
        }
        #if DEBUG
        if ![.status, .library, .playlists, .playlistTracks].contains(request.action) {
            print("[ReiPod Music] request action=\(request.action.rawValue) queueCount=\(request.ids?.count ?? 0)")
        }
        #endif
        Task { @MainActor in
            do {
                let result = try await music.handle(request)
                let data = try JSONEncoder().encode(result)
                let object = try JSONSerialization.jsonObject(with: data)
                replyHandler(object, nil)
            } catch {
                #if DEBUG
                let nativeError = error as NSError
                print("[ReiPod Music] failed action=\(request.action.rawValue) domain=\(nativeError.domain) code=\(nativeError.code) description=\(nativeError.localizedDescription)")
                if let underlying = nativeError.userInfo[NSUnderlyingErrorKey] as? NSError {
                    print("[ReiPod Music] underlying domain=\(underlying.domain) code=\(underlying.code) description=\(underlying.localizedDescription)")
                }
                #endif
                replyHandler(nil, error.localizedDescription)
            }
        }
    }

    func send(_ reply: NativeMusicReply) {
        guard let webView, webView.url?.scheme == "reipod-app", webView.url?.host == "bundle" else { return }
        do {
            let data = try JSONEncoder().encode(reply)
            let object = try JSONSerialization.jsonObject(with: data)
            webView.callAsyncJavaScript(
                "window.dispatchEvent(new CustomEvent('reipod-native-music', {detail: reply}));",
                arguments: ["reply": object], in: nil, in: .page, completionHandler: nil)
        } catch { /* A later foreground/status update can resynchronize the display. */ }
    }
}
