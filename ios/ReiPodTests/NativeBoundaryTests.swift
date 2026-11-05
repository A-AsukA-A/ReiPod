import Foundation
import Testing
@testable import ReiPod

@MainActor
struct NativeBoundaryTests {
    @Test func thirdPartyNetworkIsRestrictedToPlatformHTTPS() throws {
        #expect(ThirdPartyMusicBridge.allows(try #require(URL(string: "https://music.163.com/weapi/test"))))
        for raw in ["http://music.163.com/", "https://music.163.com.evil.test/", "https://music.163.com:8443/", "https://user:password@music.163.com/", "http://127.0.0.1:3210/"] {
            #expect(!ThirdPartyMusicBridge.allows(try #require(URL(string: raw))))
        }
    }

    @Test func persistentIDsPreserveAll64Bits() throws {
        #expect(NativeMusicID.parse("18446744073709551615") == UInt64.max)
        #expect(NativeMusicID.parse("18446744073709551616") == nil)
        #expect(NativeMusicID.parse("1e3") == nil)
        #expect(NativeMusicID.parse("-1") == nil)
        #expect(NativeMusicID.parse("0") == nil)
        let track = NativeTrack(id: String(UInt64.max), title: "中文", artist: nil, album: nil, albumArtist: nil, duration: 1, artwork: nil, trackNumber: 1)
        let object = try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(track)) as? [String: Any])
        #expect(object["id"] as? String == "18446744073709551615")
    }

    @Test func pagesClampBoundsWithoutOverflow() throws {
        let page = try NativePage(count: 105, offset: 100, limit: 100)
        #expect(page.range == 100..<105)
        #expect(page.nextOffset == nil)
        #expect(try NativePage(count: 0, offset: Int.max, limit: 100).range.isEmpty)
        #expect(throws: (any Error).self) { try NativePage(count: 10, offset: -1, limit: 100) }
        #expect(throws: (any Error).self) { try NativePage(count: 10, offset: 0, limit: 201) }
    }

    @Test func podcastMetadataKeepsShowIdentityAndResumeTime() throws {
        let track = NativeTrack(id: "9007199254740993", title: "单集", artist: "嘉宾", album: nil,
                                albumArtist: nil, duration: 1800, artwork: nil, trackNumber: 0, discNumber: 2,
                                podcast: NativePodcast(showId: String(UInt64.max), showTitle: "节目", bookmark: 125.5))
        let object = try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(track)) as? [String: Any])
        let podcast = try #require(object["podcast"] as? [String: Any])
        #expect(object["discNumber"] as? Int == 2)
        #expect(podcast["showId"] as? String == "18446744073709551615")
        #expect(podcast["bookmark"] as? Double == 125.5)
        let request = try JSONDecoder().decode(NativeMusicRequest.self, from: Data(#"{"version":1,"action":"podcasts","offset":0,"limit":100,"refresh":true}"#.utf8))
        #expect(request.action == .podcasts)
        #expect(request.refresh == true)
    }

    @Test func bundledResourcePathsCannotEscape() {
        let root = URL(fileURLWithPath: "/private/reipod/Web", isDirectory: true)
        #expect(AppResources.resourceURL(path: "/index.html", root: root)?.path == root.appendingPathComponent("index.html").path)
        #expect(AppResources.resourceURL(path: "/../Info.plist", root: root) == nil)
        #expect(AppResources.resourceURL(path: "/assets/../../secret", root: root) == nil)
    }
}
