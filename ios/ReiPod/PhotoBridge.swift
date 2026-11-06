import Photos
import PhotosUI
import WebKit

@MainActor
final class PhotoBridge: NSObject, WKScriptMessageHandlerWithReply, WKURLSchemeHandler {
    private let photos: NativePhotoService
    weak var webView: WKWebView?
    private var imageTasks: [ObjectIdentifier: PHImageRequestID] = [:]
    private var pending: Set<ObjectIdentifier> = []

    init(photos: NativePhotoService) { self.photos = photos }

    struct Request: Decodable {
        enum Action: String, Decodable { case status, authorize, preview, albums, photos, refresh, openSettings, limited }
        let version: Int
        let action: Action
        var album: String?
        var offset: Int?
        var limit: Int?
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "reipod-app",
              message.frameInfo.request.url?.host == "bundle" else { replyHandler(nil, "当前页面无权访问系统相册"); return }
        Task { @MainActor in
            do {
                let data = try JSONSerialization.data(withJSONObject: message.body)
                let request = try JSONDecoder().decode(Request.self, from: data)
                guard request.version == 1 else { throw PhotoError.invalidRequest }
                var reply = NativePhotoReply(authorization: photos.authorization)
                switch request.action {
                case .status: break
                case .authorize:
                    await photos.authorize()
                    reply = NativePhotoReply(authorization: photos.authorization)
                case .preview: reply = try photos.preview(offset: request.offset ?? 0)
                case .albums: reply = try photos.albums()
                case .photos:
                    reply = try photos.photos(album: request.album ?? "all-photos", offset: request.offset ?? 0,
                                              limit: request.limit ?? 100)
                case .refresh:
                    photos.invalidate()
                    reply = NativePhotoReply(authorization: photos.authorization)
                case .openSettings:
                    if let url = URL(string: UIApplication.openSettingsURLString) { await UIApplication.shared.open(url) }
                case .limited:
                    if photos.authorization == "limited", let controller = webView?.window?.rootViewController {
                        _ = await PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: controller)
                    }
                }
                replyHandler(try JSONSerialization.jsonObject(with: JSONEncoder().encode(reply)), nil)
            } catch { replyHandler(nil, error.localizedDescription) }
        }
    }

    func changed() {
        guard let webView, webView.url?.scheme == "reipod-app", webView.url?.host == "bundle" else { return }
        webView.callAsyncJavaScript("window.dispatchEvent(new Event('reipod-native-photos'));",
                                   arguments: [:], in: nil, in: .page, completionHandler: nil)
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        let key = ObjectIdentifier(urlSchemeTask)
        guard let url = urlSchemeTask.request.url else { urlSchemeTask.didFailWithError(URLError(.badURL)); return }
        pending.insert(key)
        let id = photos.image(url) { [weak self] data in
            guard let self, self.pending.remove(key) != nil else { return }
            self.imageTasks.removeValue(forKey: key)
            guard let data, let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "image/jpeg", "Cache-Control": "no-store"]) else {
                urlSchemeTask.didFailWithError(URLError(.resourceUnavailable)); return
            }
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        }
        if let id, pending.contains(key) { imageTasks[key] = id }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {
        let key = ObjectIdentifier(urlSchemeTask)
        pending.remove(key)
        if let id = imageTasks.removeValue(forKey: key) { photos.cancelImage(id) }
    }
}
