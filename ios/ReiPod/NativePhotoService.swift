import Photos
import UIKit

struct NativePhotoAlbum: Encodable {
    let id: String
    let title: String
    let count: Int
    let thumbnail: String?
}

struct NativePhoto: Encodable {
    let id: String
    let name: String
    let album: String
    let url: String
    let thumbnail: String
    let takenAt: Double?
    let system = true
}

struct NativePhotoReply: Encodable {
    let authorization: String
    var albums: [NativePhotoAlbum]?
    var photos: [NativePhoto]?
    var total: Int?
    var nextOffset: Int?
}

@MainActor
final class NativePhotoService: NSObject, PHPhotoLibraryChangeObserver {
    var onChange: (() -> Void)?
    private var albumSources: [String: PHFetchResult<PHAsset>] = [:]
    private var albumHandles: [String: String] = [:]
    private var assetHandles: [String: String] = [:]
    private var assetsByHandle: [String: String] = [:]
    private(set) var revision = 0
    private let images = PHCachingImageManager()
    private var albumSnapshot: NativePhotoReply?
    private let imageData = NSCache<NSURL, NSData>()

    static func fetchOptions() -> PHFetchOptions {
        let options = PHFetchOptions()
        options.predicate = NSPredicate(format: "mediaType == %d", PHAssetMediaType.image.rawValue)
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        return options
    }

    override init() {
        super.init()
        imageData.totalCostLimit = 12 * 1024 * 1024
        imageData.countLimit = 120
        NotificationCenter.default.addObserver(self, selector: #selector(clearImageCache),
            name: UIApplication.didReceiveMemoryWarningNotification, object: nil)
        PHPhotoLibrary.shared().register(self)
    }

    nonisolated func photoLibraryDidChange(_ changeInstance: PHChange) {
        Task { @MainActor [weak self] in self?.invalidate(); self?.onChange?() }
    }

    var authorization: String {
        switch PHPhotoLibrary.authorizationStatus(for: .readWrite) {
        case .authorized: "authorized"
        case .limited: "limited"
        case .denied: "denied"
        case .restricted: "restricted"
        default: "notDetermined"
        }
    }
    var canRead: Bool { ["authorized", "limited"].contains(authorization) }

    @objc func clearImageCache() {
        imageData.removeAllObjects()
        images.stopCachingImagesForAllAssets()
    }

    func invalidate() {
        revision += 1
        albumSources.removeAll()
        albumSnapshot = nil
        clearImageCache()
        if !canRead {
            albumHandles.removeAll(); assetHandles.removeAll(); assetsByHandle.removeAll()
        }
    }

    func authorize() async {
        if authorization == "notDetermined" {
            _ = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        }
        invalidate()
    }

    private func handle(for asset: PHAsset) -> String {
        let handle = assetHandles[asset.localIdentifier] ?? UUID().uuidString
        assetHandles[asset.localIdentifier] = handle
        assetsByHandle[handle] = asset.localIdentifier
        return handle
    }

    private func imageURL(_ asset: PHAsset, full: Bool = false) -> String {
        "reipod-photo://library/\(handle(for: asset))?size=\(full ? "full" : "thumb")&v=\(revision)"
    }

    func albums() throws -> NativePhotoReply {
        guard canRead else { throw PhotoError.permission }
        if let albumSnapshot { return albumSnapshot }
        let options = Self.fetchOptions()
        let all = PHAsset.fetchAssets(with: options)
        albumSources = ["all-photos": all]
        var albums = [NativePhotoAlbum(id: "all-photos", title: "所有照片", count: all.count,
                                      thumbnail: all.firstObject.map { imageURL($0) })]
        for type in [PHAssetCollectionType.album, .smartAlbum] {
            let collections = PHAssetCollection.fetchAssetCollections(with: type, subtype: .any, options: nil)
            for index in 0..<collections.count {
                let collection = collections.object(at: index)
                guard collection.assetCollectionSubtype != .smartAlbumUserLibrary,
                      collection.assetCollectionSubtype != .smartAlbumAllHidden else { continue }
                let assets = PHAsset.fetchAssets(in: collection, options: options)
                guard assets.count > 0 else { continue }
                let id = albumHandles[collection.localIdentifier] ?? UUID().uuidString
                albumHandles[collection.localIdentifier] = id
                albumSources[id] = assets
                albums.append(NativePhotoAlbum(id: id, title: collection.localizedTitle ?? "相册", count: assets.count,
                                              thumbnail: assets.firstObject.map { imageURL($0) }))
            }
        }
        let reply = NativePhotoReply(authorization: authorization, albums: albums, total: all.count)
        albumSnapshot = reply
        return reply
    }

    static func previewIndices(count: Int, offset: Int = 0) -> [Int] {
        let lower = min(max(0, offset), max(0, count))
        let upper = lower + min(8, max(0, count) - lower)
        return Array(lower..<upper)
    }

    func preview(offset: Int = 0) throws -> NativePhotoReply {
        guard canRead else { throw PhotoError.permission }
        guard offset >= 0 else { throw PhotoError.invalidRequest }
        let assets = albumSources["all-photos"] ?? PHAsset.fetchAssets(with: Self.fetchOptions())
        albumSources["all-photos"] = assets
        let photos = Self.previewIndices(count: assets.count, offset: offset).map { index in
            let asset = assets.object(at: index)
            return NativePhoto(id: handle(for: asset), name: "照片 \(index + 1)", album: "all-photos",
                url: imageURL(asset), thumbnail: imageURL(asset),
                takenAt: asset.creationDate.map { $0.timeIntervalSince1970 * 1000 })
        }
        return NativePhotoReply(authorization: authorization, photos: photos, total: assets.count,
            nextOffset: offset < assets.count && assets.count - offset > 8 ? offset + 8 : nil)
    }

    func photos(album: String, offset: Int, limit: Int) throws -> NativePhotoReply {
        guard canRead else { throw PhotoError.permission }
        guard offset >= 0, (1...100).contains(limit), let assets = albumSources[album] else { throw PhotoError.invalidRequest }
        let lower = min(offset, assets.count)
        let upper = lower + min(limit, assets.count - lower)
        let records = (lower..<upper).map { index in
            let asset = assets.object(at: index)
            return NativePhoto(id: handle(for: asset), name: "照片 \(index + 1)", album: album,
                               url: imageURL(asset, full: true), thumbnail: imageURL(asset),
                               takenAt: asset.creationDate.map { $0.timeIntervalSince1970 * 1000 })
        }
        return NativePhotoReply(authorization: authorization, photos: records, total: assets.count,
                                nextOffset: upper < assets.count ? upper : nil)
    }

    static func imageHandle(from url: URL) -> (id: String, full: Bool)? {
        guard url.scheme == "reipod-photo", url.host == "library", url.user == nil, url.port == nil,
              url.pathComponents.count == 2, UUID(uuidString: url.lastPathComponent) != nil,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let size = components.queryItems?.first(where: { $0.name == "size" })?.value,
              ["thumb", "full"].contains(size) else { return nil }
        return (url.lastPathComponent, size == "full")
    }

    func image(_ url: URL, completion: @escaping @MainActor (Data?) -> Void) -> PHImageRequestID? {
        guard canRead, let request = Self.imageHandle(from: url), let identifier = assetsByHandle[request.id] else {
            completion(nil); return nil
        }
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil).firstObject else {
            completion(nil); return nil
        }
        if let data = imageData.object(forKey: url as NSURL) { completion(data as Data); return nil }
        let generation = revision
        let options = PHImageRequestOptions()
        options.deliveryMode = .highQualityFormat
        options.resizeMode = .fast
        options.isNetworkAccessAllowed = true
        let size = request.full ? CGSize(width: 1600, height: 1600) : CGSize(width: 240, height: 240)
        return images.requestImage(for: asset, targetSize: size, contentMode: request.full ? .aspectFit : .aspectFill,
                                   options: options) { [weak self] image, info in
            guard info?[PHImageResultIsDegradedKey] as? Bool != true else { return }
            let data = image?.jpegData(compressionQuality: 0.85)
            Task { @MainActor in
                guard let self, self.canRead, self.revision == generation else { completion(nil); return }
                if let data { self.imageData.setObject(data as NSData, forKey: url as NSURL, cost: data.count) }
                completion(data)
            }
        }
    }

    func cancelImage(_ id: PHImageRequestID) { images.cancelImageRequest(id) }
}

enum PhotoError: LocalizedError {
    case permission, invalidRequest
    var errorDescription: String? {
        switch self {
        case .permission: "照片权限不可用，请在系统设置中允许访问"
        case .invalidRequest: "相册已更新，请返回相册列表后重试"
        }
    }
}
