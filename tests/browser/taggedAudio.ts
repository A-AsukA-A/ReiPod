/** Original silent WAV fixtures with RIFF INFO/optional ID3 tags, parsed through the normal importer. */
export function taggedAudio(title: string, artist: string, album: string,
  tags: { genre?: string; composer?: string; albumArtist?: string; trackNumber?: number; discNumber?: number } = {}) {
  const chunk = (tag: string, bytes: Buffer) => {
    const out = Buffer.alloc(8 + bytes.length + (bytes.length % 2));
    out.write(tag, 0, 4, "ascii");
    out.writeUInt32LE(bytes.length, 4);
    bytes.copy(out, 8);
    return out;
  };
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(1, 2);
  fmt.writeUInt32LE(8000, 4);
  fmt.writeUInt32LE(16000, 8);
  fmt.writeUInt16LE(2, 12);
  fmt.writeUInt16LE(16, 14);
  const info = Buffer.concat([
    Buffer.from("INFO"),
    ...[
      ["INAM", title],
      ["IART", artist],
      ["IPRD", album],
    ].map(([tag, value]) => chunk(tag, Buffer.from(value + "\0", "utf8"))),
  ]);
  const synchsafe = (size: number) => Buffer.from([
    (size >>> 21) & 127, (size >>> 14) & 127, (size >>> 7) & 127, size & 127,
  ]);
  const frames = Object.entries({ TCON: tags.genre, TCOM: tags.composer, TPE2: tags.albumArtist,
    TRCK: tags.trackNumber === undefined ? undefined : String(tags.trackNumber),
    TPOS: tags.discNumber === undefined ? undefined : String(tags.discNumber) })
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([id, value]) => {
      const data = Buffer.concat([Buffer.from([3]), Buffer.from(value, "utf8")]);
      return Buffer.concat([Buffer.from(id), synchsafe(data.length), Buffer.alloc(2), data]);
    });
  const id3 = frames.length ? Buffer.concat([Buffer.from([73, 68, 51, 4, 0, 0]),
    synchsafe(frames.reduce((size, frame) => size + frame.length, 0)), ...frames]) : undefined;
  const body = Buffer.concat([
    Buffer.from("WAVE"),
    chunk("fmt ", fmt),
    chunk("data", Buffer.alloc(16000 * 12)),
    chunk("LIST", info),
    ...(id3 ? [chunk("id3 ", id3)] : []),
  ]);
  return {
    name: `${title}.wav`,
    mimeType: "audio/wav",
    buffer: chunk("RIFF", body),
  };
}
