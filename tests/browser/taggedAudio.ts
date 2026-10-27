/** Original silent WAV fixtures with real RIFF INFO tags, parsed through the normal importer. */
export function taggedAudio(title: string, artist: string, album: string) {
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
  const body = Buffer.concat([
    Buffer.from("WAVE"),
    chunk("fmt ", fmt),
    chunk("data", Buffer.alloc(16000 * 12)),
    chunk("LIST", info),
  ]);
  return {
    name: `${title}.wav`,
    mimeType: "audio/wav",
    buffer: chunk("RIFF", body),
  };
}
