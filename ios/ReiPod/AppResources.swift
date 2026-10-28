import Foundation
import UniformTypeIdentifiers
import WebKit

@MainActor
final class AppResources: NSObject, WKURLSchemeHandler {
    private let root: URL
    private let music: NativeMusicService

    init(root: URL, music: NativeMusicService) {
        self.root = root.resolvingSymlinksInPath().standardizedFileURL
        self.music = music
    }

    static func resourceURL(path: String, root: URL) -> URL? {
        let relative = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let base = root.resolvingSymlinksInPath().standardizedFileURL
        let result = base.appendingPathComponent(relative.isEmpty ? "index.html" : relative)
            .resolvingSymlinksInPath().standardizedFileURL
        guard result.path.hasPrefix(base.path + "/") else { return nil }
        return result
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }
        let data: Data
        let mime: String
        if url.scheme == "reipod-artwork", url.host == "library" {
            guard let artwork = music.artwork(id: url.lastPathComponent) else {
                urlSchemeTask.didFailWithError(URLError(.resourceUnavailable)); return
            }
            data = artwork
            mime = "image/jpeg"
        } else {
            guard url.scheme == "reipod-app", url.host == "bundle",
                  let file = Self.resourceURL(path: url.path, root: root),
                  let content = try? Data(contentsOf: file, options: .mappedIfSafe) else {
                urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
            }
            data = content
            mime = switch file.pathExtension.lowercased() {
            case "js", "mjs": "application/javascript"
            case "css": "text/css"
            case "html": "text/html"
            case "json": "application/json"
            case "woff2": "font/woff2"
            default: UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
            }
        }
        // Safari can request byte ranges for bundled demo audio.
        var body = data
        var code = 200
        var headers = ["Content-Type": mime, "Content-Length": String(data.count),
                       "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes"]
        if let range = urlSchemeTask.request.value(forHTTPHeaderField: "Range"),
           range.hasPrefix("bytes=") {
            let bounds = range.dropFirst(6).split(separator: "-", omittingEmptySubsequences: false)
            if bounds.count == 2, let lower = Int(bounds[0]), lower >= 0, lower < data.count {
                let upper = min(Int(bounds[1]) ?? (data.count - 1), data.count - 1)
                if upper >= lower {
                    body = data.subdata(in: lower..<(upper + 1))
                    code = 206
                    headers["Content-Range"] = "bytes \(lower)-\(upper)/\(data.count)"
                    headers["Content-Length"] = String(body.count)
                }
            }
        }
        guard let response = HTTPURLResponse(url: url, statusCode: code, httpVersion: "HTTP/1.1", headerFields: headers) else {
            urlSchemeTask.didFailWithError(URLError(.badServerResponse)); return
        }
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(body)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}
}
