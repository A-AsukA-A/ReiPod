import AVFAudio
import MediaPlayer
import UIKit

@MainActor
final class NativeMusicService {
    var onEvent: ((NativeMusicReply) -> Void)?
    private lazy var player = MPMusicPlayerController.systemMusicPlayer
    private var songCache: [MPMediaItem]?
    private var itemCache: [UInt64: MPMediaItem] = [:]
    private var playlistCache: [MPMediaPlaylist]?
    private var observers: [any NSObjectProtocol] = []
    private var timer: Timer?
    private var sequence = 0
    private var playbackIntent = 0
    private var artworkVersion = 0
    private let artworkCache = NSCache<NSString, NSData>()
    private var ownedQueue: [String] = []

    private var authorizationStatus: MPMediaLibraryAuthorizationStatus {
        #if targetEnvironment(simulator)
        // System music playback is a device-only API. Do not instantiate its
        // controller in the simulator's WebKit/resource smoke tests.
        return .restricted
        #else
        return MPMediaLibrary.authorizationStatus()
        #endif
    }
    var isAuthorized: Bool { authorizationStatus == .authorized }

    func startObservation() {
        guard isAuthorized, observers.isEmpty else { return }
        player.beginGeneratingPlaybackNotifications()
        MPMediaLibrary.default().beginGeneratingLibraryChangeNotifications()
        for name in [Notification.Name.MPMusicPlayerControllerNowPlayingItemDidChange,
                     Notification.Name.MPMusicPlayerControllerPlaybackStateDidChange] {
            observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.publish() }
            })
        }
        observers.append(NotificationCenter.default.addObserver(forName: .MPMediaLibraryDidChange, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self else { return }
                self.songCache = nil
                self.itemCache.removeAll()
                self.playlistCache = nil
                self.artworkVersion += 1
                self.artworkCache.removeAllObjects()
                var reply = self.status()
                reply.libraryChanged = true
                self.onEvent?(reply)
            }
        })
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.publish() }
        }
    }

    func stopObservation() {
        timer?.invalidate()
        timer = nil
        observers.forEach(NotificationCenter.default.removeObserver)
        observers.removeAll()
        if isAuthorized {
            player.endGeneratingPlaybackNotifications()
            MPMediaLibrary.default().endGeneratingLibraryChangeNotifications()
        }
    }

    func publish() { onEvent?(status()) }

    func status() -> NativeMusicReply {
        let authorization: String = switch authorizationStatus {
        case .authorized: "authorized"
        case .denied: "denied"
        case .restricted: "restricted"
        default: "notDetermined"
        }
        return NativeMusicReply(authorization: authorization, playback: isAuthorized ? playback() : nil)
    }

    private func songs() -> [MPMediaItem] {
        if let songCache { return songCache }
        let items = (MPMediaQuery.songs().items ?? []).filter { $0.persistentID > 0 }
        songCache = items
        for item in items { itemCache[item.persistentID] = item }
        return items
    }

    private func playlists() -> [MPMediaPlaylist] {
        if let playlistCache { return playlistCache }
        let items = (MPMediaQuery.playlists().collections ?? []).compactMap { $0 as? MPMediaPlaylist }
        playlistCache = items
        return items
    }

    private func track(_ item: MPMediaItem) -> NativeTrack {
        NativeTrack(id: String(item.persistentID), title: item.title ?? "未知歌曲",
                    artist: item.artist, album: item.albumTitle, albumArtist: item.albumArtist,
                    duration: item.playbackDuration.isFinite ? item.playbackDuration : 0,
                    artwork: item.artwork == nil ? nil : "reipod-artwork://library/\(item.persistentID)?v=\(artworkVersion)",
                    trackNumber: item.albumTrackNumber)
    }

    private func playback() -> NativePlayback {
        sequence += 1
        let item = player.nowPlayingItem
        let currentID = item.map { String($0.persistentID) }
        let index = player.indexOfNowPlayingItem
        let known = index >= 0 && index < ownedQueue.count && currentID == ownedQueue[index]
        let state: String = switch player.playbackState {
        case .playing: "playing"
        case .paused: "paused"
        case .interrupted: "paused"
        case .seekingBackward, .seekingForward: "playing"
        default: item == nil ? "idle" : "paused"
        }
        let repeatMode = switch player.repeatMode { case .one: "one"; case .all: "all"; default: "off" }
        return NativePlayback(sequence: sequence, currentId: currentID,
                              current: item.map(track), queue: known ? ownedQueue : currentID.map { [$0] } ?? [],
                              queueKnown: known, status: state,
                              position: player.currentPlaybackTime.isFinite ? max(0, player.currentPlaybackTime) : 0,
                              duration: item?.playbackDuration ?? 0,
                              volume: AVAudioSession.sharedInstance().outputVolume, repeat: repeatMode)
    }

    private func item(_ id: String) -> MPMediaItem? {
        guard let persistentID = NativeMusicID.parse(id) else { return nil }
        _ = songs()
        return itemCache[persistentID]
    }

    func artwork(id: String) -> Data? {
        guard isAuthorized, let item = item(id) else { return nil }
        let key = "\(id):\(artworkVersion)" as NSString
        if let data = artworkCache.object(forKey: key) { return data as Data }
        guard let image = item.artwork?.image(at: CGSize(width: 480, height: 480)),
              let data = image.jpegData(compressionQuality: 0.85) else { return nil }
        artworkCache.countLimit = 48
        artworkCache.setObject(data as NSData, forKey: key)
        return data
    }

    func handle(_ request: NativeMusicRequest) async throws -> NativeMusicReply {
        guard request.version == 1 else { throw NativeMusicError.invalidRequest }
        if request.action == .status { startObservation(); return status() }
        if request.action == .authorize {
            if authorizationStatus == .notDetermined {
                _ = await withCheckedContinuation { continuation in
                    MPMediaLibrary.requestAuthorization { status in continuation.resume(returning: status) }
                }
            }
            startObservation()
            return status()
        }
        if request.action == .openSettings {
            guard let url = URL(string: UIApplication.openSettingsURLString) else { throw NativeMusicError.invalidRequest }
            await UIApplication.shared.open(url)
            return status()
        }
        guard isAuthorized else { throw NativeMusicError.permission }
        startObservation()
        switch request.action {
        case .library:
            let items = songs()
            let page = try NativePage(count: items.count, offset: request.offset, limit: request.limit)
            var reply = status()
            reply.tracks = items[page.range].map(track)
            reply.total = items.count
            reply.nextOffset = page.nextOffset
            return reply
        case .playlists:
            let items = playlists()
            let page = try NativePage(count: items.count, offset: request.offset, limit: request.limit)
            var reply = status()
            reply.playlists = items[page.range].map { NativePlaylist(id: String($0.persistentID), name: $0.name ?? "未命名歌单") }
            reply.total = items.count
            reply.nextOffset = page.nextOffset
            return reply
        case .playlistTracks:
            guard let id = request.id.flatMap(NativeMusicID.parse),
                  let list = playlists().first(where: { $0.persistentID == id }) else { throw NativeMusicError.unavailablePlaylist }
            let items = list.items.filter { $0.mediaType.contains(.music) }
            for item in items { itemCache[item.persistentID] = item }
            let page = try NativePage(count: items.count, offset: request.offset, limit: request.limit)
            var reply = status()
            reply.tracks = items[page.range].map(track)
            reply.total = items.count
            reply.nextOffset = page.nextOffset
            return reply
        case .setQueue:
            guard let ids = request.ids, !ids.isEmpty,
                  let selectedID = request.selectedId, ids.contains(selectedID) else { throw NativeMusicError.invalidRequest }
            let items = ids.compactMap(item)
            guard items.count == ids.count, let selected = item(selectedID) else { throw NativeMusicError.unavailableSong }
            playbackIntent += 1
            let intent = playbackIntent
            let descriptor = MPMusicPlayerMediaItemQueueDescriptor(itemCollection: MPMediaItemCollection(items: items))
            descriptor.startItem = selected
            player.shuffleMode = .off // The interface has already chosen the queue order.
            player.setQueue(with: descriptor)
            ownedQueue = ids
            // The legacy async overlay is nonisolated in older SDKs. Start the
            // callback API on MainActor so the non-Sendable player never hops.
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
                player.prepareToPlay { error in
                    if let error { continuation.resume(throwing: error) }
                    else { continuation.resume() }
                }
            }
            guard playbackIntent == intent else { throw NativeMusicError.canceled }
            if let seconds = request.seconds, seconds.isFinite {
                player.currentPlaybackTime = max(0, min(seconds, selected.playbackDuration))
            }
            if request.autoplay == true { player.play() } else { player.pause() }
        case .play:
            playbackIntent += 1
            guard player.nowPlayingItem != nil else { throw NativeMusicError.unavailableSong }
            player.play()
        case .pause:
            playbackIntent += 1
            player.pause()
        case .next:
            playbackIntent += 1
            player.skipToNextItem()
        case .previous:
            playbackIntent += 1
            if player.currentPlaybackTime > 3 { player.skipToBeginning() } else { player.skipToPreviousItem() }
        case .seek:
            guard let seconds = request.seconds, seconds.isFinite,
                  let item = player.nowPlayingItem else { throw NativeMusicError.invalidRequest }
            player.currentPlaybackTime = max(0, min(seconds, item.playbackDuration))
        case .repeat:
            guard let mode = request.mode, ["off", "one", "all"].contains(mode) else { throw NativeMusicError.invalidRequest }
            player.repeatMode = switch mode { case "one": .one; case "all": .all; default: .none }
        default: throw NativeMusicError.invalidRequest
        }
        publish()
        return status()
    }
}
