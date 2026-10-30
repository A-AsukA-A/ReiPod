import type { Player, Track } from "./Player";
import { parseLyrics } from "./library";

export type ImportFile = { name: string; type: string; size: number; lastModified: number; text(): Promise<string> };
export type LocalMetadata = Partial<Pick<Track, "title" | "artist" | "album" | "albumArtist" | "genres" | "composers" | "trackNumber" | "duration" | "artwork" | "lyrics">>;
type Context<F extends ImportFile> = {
  player: Pick<Player, "add" | "getSnapshot" | "updateTrack" | "setQueue">;
  createUrl: (file: F) => string;
  revokeUrl: (url: string) => void;
  readMetadata: (file: F) => Promise<LocalMetadata>;
  readFiles: () => Promise<{ file: F; importedAt: number }[]>;
  saveFiles: (files: F[]) => Promise<void>;
  finishRestore: () => void;
  notify: (message: string) => void;
  now: () => number;
};
const fileId = (file: ImportFile) => `${file.name}:${file.size}:${file.lastModified}`;

/** Import coordination only. Files, metadata decoding, URLs and storage are host ports. */
export function createLocalLibrary<F extends ImportFile>({ player, createUrl, revokeUrl,
  readMetadata, readFiles, saveFiles, finishRestore, notify, now }: Context<F>) {
  let epoch = 0;
  let metadataJobs = Promise.resolve();
  let restoring: Promise<void> | null = null;
  const excludedRestores = new Set<string>();
  const liveTrack = (id: string, url: string, generation: number) => generation === epoch &&
    player.getSnapshot().tracks.find(track => track.id === id && track.url === url);
  const releaseArtwork = (metadata: LocalMetadata) => {
    if (metadata.artwork?.startsWith("blob:")) revokeUrl(metadata.artwork);
  };
  function importFiles(files: F[], persist = true) {
    const generation = epoch;
    const previous = new Set(player.getSnapshot().tracks.map(track => track.id));
    let rejected = 0;
    const tracks: Track[] = files.flatMap(file => {
      if (/\.(?:lrc|yrc)$/i.test(file.name)) return [];
      if (!/\.(mp3|m4a|aac|wav|wave|flac|ogg|oga|opus|aif|aiff|mp4)$/i.test(file.name) && !file.type.startsWith("audio/")) {
        rejected++; return [];
      }
      return [{ id: fileId(file), title: file.name.replace(/\.[^.]+$/, ""), filename: file.name,
        size: file.size, url: createUrl(file), importedAt: now(), kind: "local" }];
    });
    const added = player.add(tracks);
    const candidates = new Set(tracks.map(track => track.id));
    const audioFiles = files.filter(file => candidates.has(fileId(file)));
    const scheduled = new Set<string>();
    for (const file of audioFiles) {
      const id = fileId(file);
      if (previous.has(id) || scheduled.has(id)) continue;
      scheduled.add(id);
      const url = player.getSnapshot().tracks.find(track => track.id === id)!.url;
      metadataJobs = metadataJobs.then(async () => {
        if (!liveTrack(id, url, generation)) return;
        try {
          const metadata = await readMetadata(file);
          const current = liveTrack(id, url, generation);
          if (!current) { releaseArtwork(metadata); return; }
          const { lyrics, ...patch } = metadata;
          player.updateTrack(id, { ...patch,
            ...(lyrics && !current.lyrics?.length ? { lyrics } : {}) });
        } catch { /* Invalid tags must not stop decoding or later metadata jobs. */ }
      });
    }
    const lyricFiles = files.filter(file => /\.(?:lrc|yrc)$/i.test(file.name));
    // A snapshot read before this import must not replay older audio or sidecars.
    if (persist) for (const file of [...audioFiles, ...lyricFiles]) excludedRestores.add(fileId(file));
    for (const file of lyricFiles) {
      const stem = file.name.replace(/\.(?:lrc|yrc)$/i, "").toLocaleLowerCase();
      const named = (track: Track) => track.filename.replace(/\.[^.]+$/, "").toLocaleLowerCase() === stem || track.title.toLocaleLowerCase() === stem;
      const starting = player.getSnapshot().tracks;
      const targets = new Map(starting.map(track => [track.id, track.url]));
      const initialMatches = starting.filter(named);
      const relevant = () => generation === epoch && (!initialMatches.length || initialMatches.some(track => liveTrack(track.id, track.url, generation)));
      void file.text().then(text => {
        if (!relevant()) return;
        const names = player.getSnapshot().tracks.filter(named);
        const matches = names.filter(track => targets.get(track.id) === track.url);
        for (const track of matches) player.updateTrack(track.id, { lyrics: parseLyrics(text) });
        if (!names.length && persist) notify(`歌词「${file.name}」未找到同名歌曲`);
      }).catch(() => { if (persist && relevant()) notify("歌词文件读取失败"); });
    }
    if (persist && (audioFiles.length || lyricFiles.length))
      void saveFiles([...audioFiles, ...lyricFiles]).catch(() => {
        if (generation === epoch) notify("浏览器未能保存文件，本次仍可播放");
      });
    return { added, rejected, lyrics: lyricFiles.length };
  }
  return {
    importFiles,
    initialize() {
      const generation = epoch;
      restoring ??= readFiles().then(records => {
        if (generation !== epoch) return;
        const existing = new Set(player.getSnapshot().tracks.map(track => track.id));
        const eligible = records.filter(({ file }) => !excludedRestores.has(fileId(file)) && !existing.has(fileId(file)));
        importFiles(eligible.map(record => record.file), false);
        for (const { file, importedAt } of eligible) player.updateTrack(fileId(file), { importedAt });
        if (!player.getSnapshot().currentId) player.setQueue(player.getSnapshot().tracks.map(track => track.id));
      }).catch(() => {}).finally(() => { if (generation === epoch) finishRestore(); });
      return restoring;
    },
    forget(id: string) { excludedRestores.add(id); },
    invalidate() { epoch++; metadataJobs = Promise.resolve(); excludedRestores.clear(); },
  };
}
