import Contacts
import EventKit
import Foundation

// The system stores and their non-Sendable records stay on this actor. Only value records leave it.
actor NativeOrganizerStore {
    private let events = EKEventStore()
    private let contacts = CNContactStore()
    private var handles: [String: String] = [:]
    private var contactIDs: [String: String] = [:]
    private var generation = -1
    private var remindersSnapshot: [OrganizerTodoRecord]?

    func prepare(revision: Int) {
        guard revision > generation else { return }
        generation = revision
        events.reset()
        remindersSnapshot = nil
        handles.removeAll(); contactIDs.removeAll()
    }
    private func handle(_ key: String) -> String {
        if let value = handles[key] { return value }
        let value = "system:" + UUID().uuidString
        handles[key] = value
        return value
    }
    func authorize(_ resource: OrganizerResource) async throws {
        switch resource {
        case .calendars:
            _ = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, any Error>) in
                events.requestFullAccessToEvents { granted, error in
                    if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: granted) }
                }
            }
        case .reminders:
            _ = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, any Error>) in
                events.requestFullAccessToReminders { granted, error in
                    if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: granted) }
                }
            }
        case .contacts:
            _ = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, any Error>) in
                contacts.requestAccess(for: .contacts) { granted, error in
                    if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: granted) }
                }
            }
        }
        events.reset()
    }
    nonisolated static func stamp(_ date: Date, allDay: Bool) -> OrganizerStamp {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = allDay ? .current : TimeZone(secondsFromGMT: 0)!
        let parts = calendar.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
        let day = String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
        return OrganizerStamp(day: day,
            clock: allDay ? nil : String(format: "%02d:%02d:%02d", parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0),
            zone: allDay ? nil : "UTC")
    }
    private func calendarName(_ calendar: EKCalendar) -> String {
        let source = calendar.source?.title ?? ""
        return String((source.isEmpty ? calendar.title : "\(source) · \(calendar.title)").prefix(500))
    }
    func calendarRecords(_ resource: OrganizerResource) -> [OrganizerCalendarRecord] {
        events.calendars(for: resource == .reminders ? .reminder : .event).map {
            OrganizerCalendarRecord(id: handle("calendar:\($0.calendarIdentifier)"), title: calendarName($0))
        }
    }
    func eventRecords(range: OrganizerRange, offset: Int, limit: Int) throws -> ([OrganizerEventRecord], Int, Int?) {
        let predicate = events.predicateForEvents(withStart: range.start, end: range.end, calendars: nil)
        let records = events.events(matching: predicate).filter { $0.startDate != nil && $0.endDate != nil && $0.calendar != nil }.sorted { $0.startDate < $1.startDate }
        guard offset >= 0, (1...100).contains(limit) else { throw OrganizerError.invalidRequest }
        let start = min(offset, records.count), end = start + min(limit, records.count - start)
        let values = records[start..<end].map { event in
            let id = handle("event:\(event.eventIdentifier ?? event.calendarItemIdentifier):\(event.startDate.timeIntervalSince1970)")
            let duration: Double
            if event.isAllDay {
                let days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: event.startDate),
                    to: Calendar.current.startOfDay(for: event.endDate)).day ?? 1
                duration = Double(max(1, days)) * 86400000
            } else { duration = max(0, event.endDate.timeIntervalSince(event.startDate) * 1000) }
            return OrganizerEventRecord(id: id, uid: id, title: String((event.title ?? "未命名日程").prefix(500)),
                calendar: calendarName(event.calendar), calendarId: handle("calendar:\(event.calendar.calendarIdentifier)"),
                start: Self.stamp(event.startDate, allDay: event.isAllDay), duration: duration,
                location: String((event.location ?? "").prefix(4000)), description: String((event.notes ?? "").prefix(12000)))
        }
        return (values, records.count, end < records.count ? end : nil)
    }
    func reminderRecords() async -> [OrganizerTodoRecord] {
        if let remindersSnapshot { return remindersSnapshot }
        let token = generation
        let predicate = events.predicateForReminders(in: nil)
        // Reserve opaque handles on the actor; no EventKit object crosses the callback boundary.
        let calendars = Dictionary(uniqueKeysWithValues: events.calendars(for: .reminder).map {
            ($0.calendarIdentifier, (handle("calendar:\($0.calendarIdentifier)"), calendarName($0)))
        })
        let result: [OrganizerTodoRecord] = await withCheckedContinuation { continuation in
            events.fetchReminders(matching: predicate) { values in
                let records = (values ?? []).sorted {
                    if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
                    return ($0.dueDateComponents?.date ?? .distantFuture) < ($1.dueDateComponents?.date ?? .distantFuture)
                }.prefix(10001).map { reminder in
                    let calendar = calendars[reminder.calendar.calendarIdentifier]
                    let date = reminder.dueDateComponents.flatMap { components -> Date? in
                        var components = components
                        components.calendar = components.calendar ?? Calendar(identifier: .gregorian)
                        components.timeZone = components.timeZone ?? .current
                        return components.date
                    }
                    return OrganizerTodoRecord(id: UUID().uuidString, title: String((reminder.title ?? "未命名待办").prefix(500)),
                        calendar: calendar?.1 ?? "提醒事项", calendarId: calendar?.0 ?? "reminders",
                        due: date.map { Self.stamp($0, allDay: reminder.dueDateComponents?.hour == nil) },
                        done: reminder.isCompleted, description: String((reminder.notes ?? "").prefix(12000)))
                }
                continuation.resume(returning: records)
            }
        }
        if token == generation { remindersSnapshot = result }
        return result
    }
    private func keys(photo: Bool) -> [any CNKeyDescriptor] {
        var keys: [any CNKeyDescriptor] = [CNContactFormatter.descriptorForRequiredKeys(for: .fullName), CNContactIdentifierKey as CNKeyDescriptor,
            CNContactGivenNameKey as CNKeyDescriptor, CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactMiddleNameKey as CNKeyDescriptor, CNContactOrganizationNameKey as CNKeyDescriptor,
            CNContactJobTitleKey as CNKeyDescriptor, CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactEmailAddressesKey as CNKeyDescriptor, CNContactPostalAddressesKey as CNKeyDescriptor,
            CNContactUrlAddressesKey as CNKeyDescriptor, CNContactBirthdayKey as CNKeyDescriptor]
        if photo { keys.append(CNContactThumbnailImageDataKey as CNKeyDescriptor) }
        return keys
    }
    private func contactRecord(_ contact: CNContact, id: String, photo: Bool) -> OrganizerContactRecord {
        let name = CNContactFormatter.string(from: contact, style: .fullName) ?? [contact.familyName, contact.givenName].filter { !$0.isEmpty }.joined(separator: " ")
        var fields: [OrganizerContactField] = []
        func add(_ label: String?, fallback: String, value: String) {
            guard !value.isEmpty, fields.count < 40 else { return }
            fields.append(OrganizerContactField(label: label.map { CNLabeledValue<NSString>.localizedString(forLabel: $0) } ?? fallback,
                value: String(value.prefix(4000))))
        }
        add(nil, fallback: "职位", value: contact.jobTitle)
        for item in contact.phoneNumbers.prefix(10) { add(item.label, fallback: "电话", value: item.value.stringValue) }
        for item in contact.emailAddresses.prefix(10) { add(item.label, fallback: "电子邮件", value: item.value as String) }
        for item in contact.postalAddresses.prefix(5) {
            add(item.label, fallback: "地址", value: CNPostalAddressFormatter.string(from: item.value, style: .mailingAddress))
        }
        for item in contact.urlAddresses.prefix(5) { add(nil, fallback: "网址", value: item.value as String) }
        if let birthday = contact.birthday, let month = birthday.month, let day = birthday.day {
            add(nil, fallback: "生日", value: (birthday.year.map { "\($0)年" } ?? "") + "\(month)月\(day)日")
        }
        let picture = photo ? contact.thumbnailImageData : nil
        return OrganizerContactRecord(id: id, name: String((name.isEmpty ? contact.organizationName.isEmpty ? "未命名联系人" : contact.organizationName : name).prefix(500)),
            first: String(contact.givenName.prefix(500)), last: String(contact.familyName.prefix(500)), company: String(contact.organizationName.prefix(500)), fields: fields,
            photo: picture.flatMap { data in
                guard data.count <= 100000 else { return nil }
                let mime: String
                if data.starts(with: [0x89, 0x50, 0x4e, 0x47] as [UInt8]) { mime = "image/png" }
                else if data.starts(with: [0xff, 0xd8] as [UInt8]) { mime = "image/jpeg" }
                else { return nil }
                return "data:\(mime);base64," + data.base64EncodedString()
            })
    }
    func contactRecords(offset: Int, limit: Int) throws -> ([OrganizerContactRecord], Int?) {
        guard offset >= 0, offset <= 100000, (1...100).contains(limit) else { throw OrganizerError.invalidRequest }
        let request = CNContactFetchRequest(keysToFetch: keys(photo: false)); request.sortOrder = .familyName
        var values: [OrganizerContactRecord] = [], index = 0, more = false
        try contacts.enumerateContacts(with: request) { contact, stop in
            defer { index += 1 }
            if index < offset { return }
            if values.count == limit { more = true; stop.pointee = true; return }
            let id = self.handle("contact:\(contact.identifier)"); self.contactIDs[id] = contact.identifier
            values.append(self.contactRecord(contact, id: id, photo: false))
        }
        return (values, more ? offset + values.count : nil)
    }
    func contactRecord(id: String) throws -> OrganizerContactRecord {
        guard let identifier = contactIDs[id] else { throw OrganizerError.unavailable }
        let contact = try contacts.unifiedContact(withIdentifier: identifier, keysToFetch: keys(photo: true))
        return contactRecord(contact, id: id, photo: true)
    }
}
