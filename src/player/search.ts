import type { Track } from "./Player";
const normalize = (text: string) =>
  text.normalize("NFKC").toLocaleLowerCase().trim();
export function searchTracks(tracks: Track[], query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return tracks;
  return tracks.filter((track) => {
    const text = normalize(
      [track.title, track.artist, track.album, track.filename].join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
}
