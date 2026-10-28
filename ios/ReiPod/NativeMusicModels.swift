import Foundation

struct NativeMusicRequest: Decodable {
    enum Action: String, Decodable {
        case status, authorize, library, playlists, playlistTracks
        case setQueue, play, pause, next, previous, seek, `repeat`, openSettings
    }
    let version: Int
    let action: Action
    let id: String?
    let ids: [String]?
    let selectedId: String?
    let offset: Int?
    let limit: Int?
    let seconds: Double?
    let autoplay: Bool?
    let mode: String?
}

struct NativeTrack: Encodable {
    let id: String
    let title: String
    let artist: String?
    let album: String?
    let albumArtist: String?
    let duration: Double
    let artwork: String?
    let trackNumber: Int
}

struct NativePlaylist: Encodable {
    let id: String
    let name: String
}

struct NativePlayback: Encodable {
    let sequence: Int
    let currentId: String?
    let current: NativeTrack?
    let queue: [String]
    let queueKnown: Bool
    let status: String
    let position: Double
    let duration: Double
    let volume: Float
    let `repeat`: String
}

struct NativeMusicReply: Encodable {
    var authorization: String
    var playback: NativePlayback?
    var tracks: [NativeTrack]?
    var playlists: [NativePlaylist]?
    var nextOffset: Int?
    var total: Int?
    var libraryChanged: Bool?
}

enum NativeMusicError: LocalizedError {
    case permission, invalidRequest, unavailableSong, unavailablePlaylist, canceled
    var errorDescription: String? {
        switch self {
        case .permission: "请在系统设置中允许访问音乐资料库"
        case .invalidRequest: "无效的系统音乐操作"
        case .unavailableSong: "歌曲已不在系统资料库中，请刷新"
        case .unavailablePlaylist: "歌单已不在系统资料库中，请刷新"
        case .canceled: "操作已被较新的播放指令替代"
        }
    }
}

/// Persistent IDs must remain strings; UInt64 cannot round-trip through JS Number.
enum NativeMusicID {
    static func parse(_ string: String) -> UInt64? {
        guard !string.isEmpty, string.allSatisfy({ $0.isASCII && $0.isNumber }),
              let value = UInt64(string), value > 0 else { return nil }
        return value
    }
}

struct NativePage {
    let range: Range<Int>
    let nextOffset: Int?
    init(count: Int, offset: Int?, limit: Int?) throws {
        let start = offset ?? 0
        let size = limit ?? 100
        guard start >= 0, size > 0, size <= 200 else { throw NativeMusicError.invalidRequest }
        let lower = min(start, count)
        let upper = lower + min(size, count - lower)
        range = lower..<upper
        nextOffset = upper < count ? upper : nil
    }
}
