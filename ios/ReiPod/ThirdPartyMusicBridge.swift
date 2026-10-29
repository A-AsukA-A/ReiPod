import Foundation
import Security
import WebKit
import UIKit

private final class NoMusicRedirects: NSObject, URLSessionTaskDelegate, Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(nil) // The platform adapter inspects each redirect and its cookies.
    }
}

@MainActor
final class ThirdPartyMusicBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let world = WKContentWorld.world(name: "ReiPodMusicService")
    private static let hosts: Set<String> = [
        "api.tencentmusic.com", "y.gtimg.cn", "music.163.com", "interface.music.163.com", "interfacepc.music.163.com", "interface3.music.163.com", "qrcode.music.163.com",
        "u.y.qq.com", "c.y.qq.com", "c6.y.qq.com", "y.qq.com", "ssl.ptlogin2.qq.com", "ssl.ptlogin2.graph.qq.com",
        "xui.ptlogin2.qq.com", "ptlogin2.qq.com", "graph.qq.com", "open.weixin.qq.com",
        "lp.open.weixin.qq.com", "login.weixin.qq.com"
    ]
    weak var webView: WKWebView?
    private let session: URLSession

    override init() {
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false
        config.httpCookieStorage = nil
        config.urlCache = nil
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 25
        session = URLSession(configuration: config, delegate: NoMusicRedirects(), delegateQueue: nil)
        super.init()
    }

    static func allows(_ url: URL) -> Bool {
        url.scheme == "https" && url.user == nil && url.password == nil && url.port == nil && hosts.contains(url.host ?? "")
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == "reipod-app",
              message.frameInfo.request.url?.host == "bundle",
              let body = message.body as? [String: Any] else {
            replyHandler(nil, "当前页面无权访问内置音乐服务"); return
        }
        if message.name == "reipodService" {
            if body["action"] as? String == "open-login" {
                guard body["version"] as? Int == 1,
                      let service = body["service"] as? String,
                      ["netease", "qq"].contains(service) else {
                    replyHandler(nil, "无效音乐服务"); return
                }
                // Fixed provider destinations; never accept a URL supplied by the page.
                guard let raw = body["loginUrl"] as? String, raw.utf8.count <= 8192,
                      let authorization = URL(string: raw), authorization.user == nil,
                      authorization.password == nil, authorization.port == nil else {
                    replyHandler(nil, "无效平台授权链接"); return
                }
                let appURL: URL
                if service == "netease", authorization.scheme == "https",
                   authorization.host == "music.163.com", authorization.path == "/login",
                   URLComponents(url: authorization, resolvingAgainstBaseURL: false)?.queryItems?.contains(where: { $0.name == "codekey" && !($0.value ?? "").isEmpty }) == true {
                    var target = URLComponents()
                    target.scheme = "orpheus"; target.host = "openurl"
                    target.queryItems = [URLQueryItem(name: "url", value: raw)]
                    guard let url = target.url else { replyHandler(nil, "无效平台授权链接"); return }
                    appURL = url
                } else if service == "qq", authorization.scheme == "qqmusic",
                          authorization.host == "qq.com", authorization.path == "/other/openid" {
                    appURL = authorization
                } else if service == "qq", authorization.scheme == "https",
                          authorization.host == "y.qq.com", authorization.path == "/m/client/qr_code_login/authorize.html" {
                    guard let data = try? JSONSerialization.data(withJSONObject: ["url": raw, "_from_outside": "1"]),
                          let payload = String(data: data, encoding: .utf8) else { replyHandler(nil, "无效平台授权链接"); return }
                    var target = URLComponents()
                    target.scheme = "qqmusic"; target.host = "qq.com"; target.path = "/ui/openUrl"
                    target.queryItems = [URLQueryItem(name: "p", value: payload)]
                    guard let url = target.url else { replyHandler(nil, "无效平台授权链接"); return }
                    appURL = url
                } else { replyHandler(nil, "无效平台授权链接"); return }
                let website = URL(string: service == "netease" ? "https://music.163.com/" : "https://y.qq.com/")!
                UIApplication.shared.open(appURL, options: [:]) { opened in
                    if opened { replyHandler(["opened": true], nil); return }
                    UIApplication.shared.open(website, options: [:]) { openedWebsite in
                        replyHandler(openedWebsite ? ["opened": true] : nil,
                                     openedWebsite ? nil : "无法打开音乐平台，请稍后重试")
                    }
                }
                return
            }
            guard let webView, body["version"] as? Int == 1,
                  ["netease", "qq"].contains(body["service"] as? String ?? ""),
                  let data = try? JSONSerialization.data(withJSONObject: body), data.count <= 16384 else {
                replyHandler(nil, "无效音乐请求"); return
            }
            webView.callAsyncJavaScript("return await globalThis.reipodServiceRequest(request);",
                                        arguments: ["request": body], in: nil, in: Self.world) { result in
                switch result {
                case .success(let value): replyHandler(value, nil)
                case .failure: replyHandler(nil, "内置音乐服务暂不可用，请重试")
                }
            }
            return
        }
        // This handler is registered only in the isolated content world.
        guard message.name == "reipodServiceHost" else { replyHandler(nil, "无效桥接"); return }
        Task { @MainActor in
            do { replyHandler(try await handleHost(body), nil) }
            catch { replyHandler(nil, "内置音乐请求失败，请重试") }
        }
    }

    private func handleHost(_ body: [String: Any]) async throws -> Any {
        switch body["action"] as? String {
        case "secret":
            if let data = try readKey("secret"), let value = String(data: data, encoding: .utf8) { return value }
            var bytes = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw BridgeError.failed }
            let secret = Data(bytes).base64EncodedString()
            try writeKey("secret", data: Data(secret.utf8)); return secret
        case "load":
            guard let data = try readKey("state") else { return NSNull() }
            return try JSONSerialization.jsonObject(with: data)
        case "save":
            guard let state = body["state"] else { throw BridgeError.failed }
            let data = try JSONSerialization.data(withJSONObject: state)
            guard data.count <= 1_048_576 else { throw BridgeError.failed }
            try writeKey("state", data: data); return NSNull()
        case "fetch":
            guard let rawURL = body["url"] as? String, let url = URL(string: rawURL), Self.allows(url),
                  let method = body["method"] as? String, ["GET", "POST", "HEAD"].contains(method) else { throw BridgeError.failed }
            var request = URLRequest(url: url)
            request.httpMethod = method
            request.cachePolicy = .reloadIgnoringLocalCacheData
            for header in body["headers"] as? [[String]] ?? [] {
                guard header.count == 2, !header[1].contains("\r"), !header[1].contains("\n") else { throw BridgeError.failed }
                // URLSession derives transport headers from the validated destination.
                if ["host", "content-length", "connection"].contains(header[0].lowercased()) { continue }
                request.setValue(header[1], forHTTPHeaderField: header[0])
            }
            if let text = body["body"] as? String {
                guard text.utf8.count <= 262144 else { throw BridgeError.failed }
                request.httpBody = Data(text.utf8)
            }
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, data.count <= 8_388_608 else { throw BridgeError.failed }
            var headers: [[String]] = []
            for (key, value) in http.allHeaderFields {
                let name = String(describing: key), text = String(describing: value)
                if name.lowercased() == "set-cookie" {
                    // A cookie's Expires comma is not followed by a cookie-name=value pair.
                    let parts = text.replacingOccurrences(of: ",(?=\\s*[^;,=\\s]+=[^;]*)", with: "\n", options: .regularExpression).components(separatedBy: "\n")
                    headers.append(contentsOf: parts.map { [name, $0] })
                } else { headers.append([name, text]) }
            }
            return ["status": http.statusCode, "headers": headers, "body": data.base64EncodedString()]
        default: throw BridgeError.failed
        }
    }

    private enum BridgeError: Error { case failed }
    private func query(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.reipod.music-service", kSecAttrAccount as String: account]
    }
    private func readKey(_ account: String) throws -> Data? {
        var query = query(account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw BridgeError.failed }
        return data
    }
    private func writeKey(_ account: String, data: Data) throws {
        let base = query(account)
        let attributes: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let status = SecItemUpdate(base as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            guard SecItemAdd(base.merging(attributes) { _, new in new } as CFDictionary, nil) == errSecSuccess else { throw BridgeError.failed }
        } else if status != errSecSuccess { throw BridgeError.failed }
    }
}
