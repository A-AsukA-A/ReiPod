import Foundation

nonisolated enum OrganizerResource: String, Codable, Sendable { case calendars, reminders, contacts }
nonisolated struct OrganizerAuthorization: Encodable, Sendable {
    let calendars: String
    let reminders: String
    let contacts: String
    func status(_ resource: OrganizerResource) -> String {
        switch resource { case .calendars: calendars; case .reminders: reminders; case .contacts: contacts }
    }
    func readable(_ resource: OrganizerResource) -> Bool { ["authorized", "limited"].contains(status(resource)) }
}
nonisolated struct OrganizerStamp: Encodable, Sendable { let day: String; var clock: String?; var zone: String? }
nonisolated struct OrganizerEventRecord: Encodable, Sendable {
    let id: String; let uid: String; let title: String; let calendar: String; let calendarId: String
    let start: OrganizerStamp; let duration: Double; let location: String; let description: String
    let excluded: [String] = []
}
nonisolated struct OrganizerTodoRecord: Encodable, Sendable {
    let id: String; let title: String; let calendar: String; let calendarId: String
    let due: OrganizerStamp?; let done: Bool; let description: String
}
nonisolated struct OrganizerContactField: Encodable, Sendable { let label: String; let value: String }
nonisolated struct OrganizerContactRecord: Encodable, Sendable {
    let id: String; let name: String; let first: String; let last: String; let company: String
    let fields: [OrganizerContactField]; var photo: String?
}
nonisolated struct OrganizerCalendarRecord: Encodable, Sendable { let id: String; let title: String }
nonisolated struct OrganizerReply: Encodable, Sendable {
    let authorization: OrganizerAuthorization
    let revision: Int
    var calendars: [OrganizerCalendarRecord]?
    var events: [OrganizerEventRecord]?
    var todos: [OrganizerTodoRecord]?
    var contacts: [OrganizerContactRecord]?
    var contact: OrganizerContactRecord?
    var nextOffset: Int?
    var total: Int?
    var truncated: Bool?
}
nonisolated enum OrganizerError: LocalizedError {
    case invalidRequest, permission, changed, unavailable
    var errorDescription: String? {
        switch self {
        case .invalidRequest: "无效的系统资料操作"
        case .permission: "请在系统设置中允许读取对应资料"
        case .changed: "系统资料或权限已改变，请刷新重试"
        case .unavailable: "该项系统资料已不可用"
        }
    }
}
nonisolated struct OrganizerRange: Sendable {
    let start: Date; let end: Date
    init(start: String?, end: String?) throws {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current; formatter.dateFormat = "yyyy-MM-dd"; formatter.isLenient = false
        guard let start, let end, start.count == 10, end.count == 10,
              let from = formatter.date(from: start), let to = formatter.date(from: end),
              formatter.string(from: from) == start, formatter.string(from: to) == end,
              from < to, to.timeIntervalSince(from) <= 63 * 86400,
              start >= "1900-01-01", end <= "2200-01-01" else { throw OrganizerError.invalidRequest }
        self.start = from; self.end = to
    }
}
