import Contacts
import EventKit
import UIKit
import WebKit

@MainActor
final class OrganizerBridge: NSObject, WKScriptMessageHandlerWithReply {
    weak var webView: WKWebView?
    private let store = NativeOrganizerStore()
    private var revision = 0
    private var observers: [any NSObjectProtocol] = []
    private var authorizing: [OrganizerResource: Task<Void, any Error>] = [:]

    struct Request: Decodable {
        enum Action: String, Decodable { case status, authorize, events, reminders, contacts, contact, refresh, openSettings }
        let version: Int; let action: Action
        let resource: OrganizerResource?
        let start: String?; let end: String?; let offset: Int?; let limit: Int?; let id: String?
    }
    override init() {
        super.init()
        for name in [Notification.Name.EKEventStoreChanged, Notification.Name.CNContactStoreDidChange, Notification.Name.NSSystemTimeZoneDidChange, UIApplication.significantTimeChangeNotification] {
            observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor [weak self] in self?.invalidate() }
            })
        }
    }
    isolated deinit { for observer in observers { NotificationCenter.default.removeObserver(observer) } }

    static func permits(mainFrame: Bool, url: URL?) -> Bool {
        mainFrame && url?.scheme == "reipod-app" && url?.host == "bundle" && url?.user == nil && url?.password == nil && url?.port == nil
    }
    var authorization: OrganizerAuthorization {
        func eventStatus(_ type: EKEntityType) -> String {
            switch EKEventStore.authorizationStatus(for: type) {
            case .fullAccess: "authorized"
            case .writeOnly: "writeOnly"
            case .notDetermined: "notDetermined"
            case .restricted: "restricted"
            case .denied: "denied"
            @unknown default: "denied"
            }
        }
        let status = CNContactStore.authorizationStatus(for: .contacts)
        let contactStatus: String
        if #available(iOS 18.0, *), status == .limited { contactStatus = "limited" }
        else {
            contactStatus = switch status {
            case .authorized: "authorized"
            case .notDetermined: "notDetermined"
            case .restricted: "restricted"
            default: "denied"
            }
        }
        return OrganizerAuthorization(calendars: eventStatus(.event), reminders: eventStatus(.reminder), contacts: contactStatus)
    }
    func invalidate() {
        revision += 1
        let token = revision
        Task { await store.prepare(revision: token) }
        guard let webView, Self.permits(mainFrame: true, url: webView.url) else { return }
        webView.callAsyncJavaScript("window.dispatchEvent(new Event('reipod-native-organizer'));", arguments: [:], in: nil, in: .page, completionHandler: nil)
    }
    private func authorize(_ resource: OrganizerResource) async throws {
        guard ["notDetermined", "writeOnly"].contains(authorization.status(resource)) else { return }
        if let task = authorizing[resource] { try await task.value; return }
        let task = Task { try await store.authorize(resource) }
        authorizing[resource] = task
        defer { authorizing[resource] = nil }
        try await task.value
        invalidate()
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard Self.permits(mainFrame: message.frameInfo.isMainFrame, url: message.frameInfo.request.url) else {
            replyHandler(nil, "当前页面无权访问系统日历或通讯录"); return
        }
        Task { @MainActor in
            do {
                let request = try JSONDecoder().decode(Request.self, from: JSONSerialization.data(withJSONObject: message.body))
                guard request.version == 1 else { throw OrganizerError.invalidRequest }
                let reply = try await execute(request)
                replyHandler(try JSONSerialization.jsonObject(with: JSONEncoder().encode(reply)), nil)
            } catch { replyHandler(nil, error.localizedDescription) }
        }
    }
    func execute(_ request: Request) async throws -> OrganizerReply {
        if request.action == .authorize {
            guard let resource = request.resource else { throw OrganizerError.invalidRequest }
            try await authorize(resource)
        }
        if request.action == .refresh { invalidate() }
        if request.action == .openSettings, let url = URL(string: UIApplication.openSettingsURLString) { await UIApplication.shared.open(url) }
        let token = revision, permissions = authorization
        var reply = OrganizerReply(authorization: permissions, revision: token)
        let resource: OrganizerResource?
        switch request.action {
        case .events: resource = .calendars
        case .reminders: resource = .reminders
        case .contacts, .contact: resource = .contacts
        default: resource = nil
        }
        guard let resource else { return reply }
        guard permissions.readable(resource) else { throw OrganizerError.permission }
        await store.prepare(revision: token)
        let offset = request.offset ?? 0, limit = request.limit ?? 100
        guard offset >= 0, (1...100).contains(limit) else { throw OrganizerError.invalidRequest }
        switch request.action {
        case .events:
            let (records, total, next) = try await store.eventRecords(range: OrganizerRange(start: request.start, end: request.end), offset: offset, limit: limit)
            reply.calendars = await store.calendarRecords(.calendars)
            reply.events = records; reply.total = total; reply.nextOffset = next
        case .reminders:
            let records = await store.reminderRecords()
            let count = min(records.count, 10000), start = min(offset, count), end = start + min(limit, count - start)
            reply.todos = Array(records[start..<end]); reply.total = count; reply.nextOffset = end < count ? end : nil; reply.truncated = records.count > count
        case .contacts:
            let (records, next) = try await store.contactRecords(offset: offset, limit: limit)
            reply.contacts = records; reply.nextOffset = next
        case .contact:
            guard let id = request.id, id.hasPrefix("system:"), id.count < 100 else { throw OrganizerError.invalidRequest }
            reply.contact = try await store.contactRecord(id: id)
        default: break
        }
        guard revision == token, authorization.readable(resource) else { throw OrganizerError.changed }
        return reply
    }
}
