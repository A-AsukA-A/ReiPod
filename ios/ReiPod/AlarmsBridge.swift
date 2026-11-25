import AlarmKit
import AppIntents
import SwiftUI
import UIKit
import UserNotifications
import WebKit

nonisolated struct NativeAlarmRecord: Codable, Equatable, Sendable {
    let id: UUID
    let label: String
    let at: Double
    let minute: Int
    let weekdays: [Int]
    func valid(now: Double) -> Bool {
        !label.isEmpty && label.count <= 40 && at.isFinite && at > now && at < 7_300_000_000_000 &&
        (0..<1440).contains(minute) && weekdays.count <= 7 && Set(weekdays).count == weekdays.count && weekdays.allSatisfy { (0...6).contains($0) }
    }
    // Relative schedules retain local wall time across DST/time-zone changes; their next timestamp is not identity.
    func matches(_ other: Self) -> Bool {
        id == other.id && label == other.label && minute == other.minute && weekdays == other.weekdays && (!weekdays.isEmpty || at == other.at)
    }
}

@MainActor
private enum AlarmReceipts {
    static let key = "reipod.alarm-acknowledged.v1"
    static let changed = Notification.Name("ReiPodAlarmAcknowledged")
    static var values: [String: Double] { UserDefaults.standard.dictionary(forKey: key) as? [String: Double] ?? [:] }
    static func record(_ id: UUID, at: Double = 0) {
        var next = values
        next[id.uuidString.lowercased()] = max(at, Date().timeIntervalSince1970 * 1000)
        next = Dictionary(uniqueKeysWithValues: next.sorted { $0.value > $1.value }.prefix(64).map { ($0.key, $0.value) })
        UserDefaults.standard.set(next, forKey: key)
        NotificationCenter.default.post(name: changed, object: nil)
    }
}

@available(iOS 26.0, *)
nonisolated struct ReiPodAlarmMetadata: AlarmMetadata {}

@available(iOS 26.0, *)
struct StopReiPodAlarm: LiveActivityIntent {
    static let title: LocalizedStringResource = "停止 ReiPod 闹钟"
    @Parameter(title: "闹钟") var alarmID: String
    init() {}
    init(id: UUID) { alarmID = id.uuidString }
    func perform() async throws -> some IntentResult {
        guard let id = UUID(uuidString: alarmID) else { return .result() }
        // This intent is attached only to ReiPod's own scheduled UUID.
        try? AlarmManager.shared.stop(id: id)
        await AlarmReceipts.record(id)
        return .result()
    }
}

@MainActor
final class AlarmsBridge: NSObject, WKScriptMessageHandlerWithReply, UNUserNotificationCenterDelegate {
    static let shared = AlarmsBridge()
    weak var webView: WKWebView?
    private let center = UNUserNotificationCenter.current()
    private let planKey = "reipod.alarm-plan.v1"
    private let prefix = "reipod.alarm."
    private var plan: [NativeAlarmRecord] = []
    private var cancelled: Set<UUID> = []
    private var work: Task<Void, any Error>?
    private var observer: (any NSObjectProtocol)?

    struct Request: Decodable {
        enum Action: String, Decodable { case status, authorize, replace, stop, openSettings }
        let version: Int
        let action: Action
        let records: [NativeAlarmRecord]?
        let retain: [UUID]?
        let id: UUID?
    }
    enum Failure: LocalizedError {
        case invalid, permission
        var errorDescription: String? { self == .invalid ? "闹钟请求无效" : "请在系统设置中允许闹钟提醒" }
    }
    override init() {
        super.init()
        if let data = UserDefaults.standard.data(forKey: planKey), let saved = try? JSONDecoder().decode([NativeAlarmRecord].self, from: data) { plan = Array(saved.prefix(9)) }
        cancelled = Set((UserDefaults.standard.stringArray(forKey: planKey + ".cancelled") ?? []).compactMap(UUID.init(uuidString:)))
        center.delegate = self
        let stop = UNNotificationAction(identifier: "stop", title: "停止", options: [])
        center.setNotificationCategories([UNNotificationCategory(identifier: "reipod.alarm", actions: [stop], intentIdentifiers: [], options: [.customDismissAction])])
        observer = NotificationCenter.default.addObserver(forName: AlarmReceipts.changed, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in self?.changed() }
        }
    }
    isolated deinit { if let observer { NotificationCenter.default.removeObserver(observer) } }
    func changed() {
        guard let webView, OrganizerBridge.permits(mainFrame: true, url: webView.url) else { return }
        webView.callAsyncJavaScript("window.dispatchEvent(new Event('reipod-native-alarms'));", arguments: [:], in: nil, in: .page, completionHandler: nil)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard OrganizerBridge.permits(mainFrame: message.frameInfo.isMainFrame, url: message.frameInfo.request.url) else {
            replyHandler(nil, "当前页面无权调度闹钟"); return
        }
        Task { @MainActor in
            do {
                let request = try JSONDecoder().decode(Request.self, from: JSONSerialization.data(withJSONObject: message.body))
                guard request.version == 1 else { throw Failure.invalid }
                // Serialize mutations across async authorization/scheduling suspension points.
                let previous = work
                let operation = Task { @MainActor in
                    _ = try? await previous?.value
                    try await self.execute(request)
                }
                work = operation
                try await operation.value
                replyHandler(await status(), nil)
            } catch { replyHandler(nil, error.localizedDescription) }
        }
    }
    private func status() async -> [String: Any] {
        let authorization: String
        let engine: String
        if #available(iOS 26.0, *) {
            engine = "alarmkit"
            authorization = switch AlarmManager.shared.authorizationState {
            case .authorized: "authorized"
            case .notDetermined: "notDetermined"
            default: "denied"
            }
        } else {
            engine = "notifications"
            let settings = await center.notificationSettings()
            authorization = switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: "authorized"
            case .notDetermined: "notDetermined"
            default: "denied"
            }
        }
        return ["engine": engine, "authorization": authorization, "acknowledged": AlarmReceipts.values]
    }
    private func execute(_ request: Request) async throws {
        switch request.action {
        case .status: break
        case .authorize:
            if #available(iOS 26.0, *) {
                if AlarmManager.shared.authorizationState == .notDetermined { _ = try await AlarmManager.shared.requestAuthorization() }
            } else { _ = try await center.requestAuthorization(options: [.alert, .sound]) }
        case .openSettings:
            if let url = URL(string: UIApplication.openSettingsURLString) { await UIApplication.shared.open(url) }
        case .stop:
            guard let id = request.id, plan.contains(where: { $0.id == id }) else { throw Failure.invalid }
            if #available(iOS 26.0, *) {
                if try AlarmManager.shared.alarms.contains(where: { $0.id == id }) { try AlarmManager.shared.stop(id: id) }
            } else { center.removeDeliveredNotifications(withIdentifiers: notificationIDs(id)) }
            AlarmReceipts.record(id)
        case .replace:
            guard let records = request.records, records.count <= 9, Set(records.map(\.id)).count == records.count,
                  records.allSatisfy({ $0.valid(now: Date().timeIntervalSince1970 * 1000) }),
                  let retain = request.retain, retain.count <= 9 else { throw Failure.invalid }
            if await status()["authorization"] as? String != "authorized" {
                // Revocation must still permit disabling/deleting existing schedules.
                guard records.allSatisfy({ record in plan.contains { $0.matches(record) } }) else { throw Failure.permission }
                let kept = records + plan.filter { item in retain.contains(item.id) && !records.contains { $0.id == item.id } }
                cancelled.formUnion(plan.filter { item in !kept.contains { $0.id == item.id } }.map(\.id))
                plan = kept; persist()
                for id in Array(cancelled) { do { try cancel(id); cancelled.remove(id) } catch { /* Retry after permission is restored. */ } }
                persist(); return
            }
            try await replace(records, retaining: Set(retain))
        }
    }
    private func persist() {
        if let data = try? JSONEncoder().encode(plan) { UserDefaults.standard.set(data, forKey: planKey) }
        UserDefaults.standard.set(cancelled.map(\.uuidString), forKey: planKey + ".cancelled")
    }
    private func notificationIDs(_ id: UUID) -> [String] { (0...7).map { "\(prefix)\(id.uuidString).\($0)" } }
    private func cancel(_ id: UUID) throws {
        if #available(iOS 26.0, *) {
            if try AlarmManager.shared.alarms.contains(where: { $0.id == id }) { try AlarmManager.shared.cancel(id: id) }
        } else {
            let ids = notificationIDs(id)
            center.removePendingNotificationRequests(withIdentifiers: ids)
            center.removeDeliveredNotifications(withIdentifiers: ids)
        }
    }
    private func schedule(_ record: NativeAlarmRecord) async throws {
        if #available(iOS 26.0, *) {
            let title = LocalizedStringResource(stringLiteral: record.label)
            let alert = AlarmPresentation.Alert(title: title, stopButton: AlarmButton(text: "停止", textColor: .white, systemImageName: "stop.fill"))
            let attributes = AlarmAttributes<ReiPodAlarmMetadata>(presentation: AlarmPresentation(alert: alert), tintColor: .blue)
            let weekdays: [Locale.Weekday] = [.sunday, .monday, .tuesday, .wednesday, .thursday, .friday, .saturday]
            let schedule: Alarm.Schedule = record.weekdays.isEmpty ? .fixed(Date(timeIntervalSince1970: record.at / 1000)) :
                .relative(.init(time: .init(hour: record.minute / 60, minute: record.minute % 60), repeats: .weekly(record.weekdays.map { weekdays[$0] })))
            _ = try await AlarmManager.shared.schedule(id: record.id, configuration: .alarm(schedule: schedule, attributes: attributes, stopIntent: StopReiPodAlarm(id: record.id)))
        } else {
            let content = UNMutableNotificationContent()
            content.title = record.label
            content.body = "ReiPod 闹钟"
            content.sound = .default
            content.categoryIdentifier = "reipod.alarm"
            content.userInfo = ["reipodAlarmID": record.id.uuidString, "reipodAlarmAt": record.at]
            let days = record.weekdays.isEmpty ? [-1] : record.weekdays
            for day in days {
                var components: DateComponents
                if day == -1 { components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: Date(timeIntervalSince1970: record.at / 1000)) }
                else { components = DateComponents(hour: record.minute / 60, minute: record.minute % 60, weekday: day + 1) }
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: day != -1)
                try await center.add(UNNotificationRequest(identifier: "\(prefix)\(record.id.uuidString).\(day + 1)", content: content, trigger: trigger))
            }
        }
    }
    private func replace(_ records: [NativeAlarmRecord], retaining: Set<UUID>) async throws {
        // Finish removals requested while system permission was revoked before accepting new schedules.
        for id in Array(cancelled) { try cancel(id); cancelled.remove(id); persist() }
        let old = plan
        // Retained firing alarms remain owned until explicit Stop; no blanket cancellation.
        let kept = records + old.filter { item in retaining.contains(item.id) && !records.contains { $0.id == item.id } }
        let existing: Set<UUID>
        if #available(iOS 26.0, *) { existing = Set(try AlarmManager.shared.alarms.map(\.id)) }
        else {
            let pending = await center.pendingNotificationRequests()
            existing = Set(old.filter { item in pending.contains { notificationIDs(item.id).contains($0.identifier) } }.map(\.id))
        }
        var scheduled: [UUID] = []
        do {
            for record in records where !existing.contains(record.id) || !old.contains(where: { $0.matches(record) }) {
                // Only update this app's UUID. A changed weekly mask must remove its obsolete requests.
                if old.contains(where: { $0.id == record.id }) { try cancel(record.id) }
                try await schedule(record)
                scheduled.append(record.id)
            }
            for record in old where !kept.contains(where: { $0.id == record.id }) { try cancel(record.id) }
            plan = kept; persist()
        } catch {
            for id in scheduled { try? cancel(id) }
            for record in old where record.at > Date().timeIntervalSince1970 * 1000 || !record.weekdays.isEmpty { try? await schedule(record) }
            throw error
        }
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.sound])
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let raw = response.notification.request.content.userInfo["reipodAlarmID"] as? String
        let at = response.notification.request.content.userInfo["reipodAlarmAt"] as? Double ?? 0
        if let raw, let id = UUID(uuidString: raw) { Task { @MainActor in AlarmReceipts.record(id, at: at) } }
        completionHandler()
    }
}
