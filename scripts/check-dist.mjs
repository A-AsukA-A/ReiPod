import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const demoCatalog = JSON.parse(
  await readFile("src/player/demoCatalog.json", "utf8"),
);
const approvedMusic = new Map(
  demoCatalog.map((song) => [`music/${song.filename}`, song]),
);
const approvedCompanions = new Map(demoCatalog.flatMap(song => [
  [`artwork/${song.artworkFilename}`, { bytes: song.artworkBytes, sha256: song.artworkSha256 }],
  [`music/${song.lyricFilename}`, { bytes: song.lyricBytes, sha256: song.lyricSha256 }],
  [`music/${song.lrcFilename}`, { bytes: song.lrcBytes, sha256: song.lrcSha256 }],
]));

const files = await readdir("dist", { recursive: true });
for (const file of files) {
  const path = file.replaceAll("\\", "/");
  if (
    (/\.(m4a|mp3|wav|flac|ipa|mp4|mov|webm|m4v|aac|p8)$/i.test(path) &&
      !approvedMusic.has(path)) ||
    (/\.(lrc|yrc)$/i.test(path) && !approvedCompanions.has(path)) ||
    /(?:^|\/)(?:analysis|\.local|docs)\//.test(path)
  ) {
    throw new Error(`Private or unexpected file in public build: ${file}`);
  }
  if (/\.(html|js|json)$/.test(file)) {
    const content = await readFile(`dist/${file}`, "utf8");
    if (/-----BEGIN (?:EC |RSA |ENCRYPTED )?PRIVATE KEY-----/.test(content)) {
      throw new Error(`Private signing key in public build: ${file}`);
    }
    if (/__test-music|告白气球|千山万水/.test(content)) {
      throw new Error(
        `Private development music entry in public build: ${file}`,
      );
    }
  }
}
for (const [path, song] of [...approvedMusic, ...approvedCompanions]) {
  const data = await readFile(`dist/${path}`);
  if (
    data.length !== song.bytes ||
    createHash("sha256").update(data).digest("hex") !== song.sha256
  ) {
    throw new Error(
      `Approved demo asset does not match its distribution manifest: ${path}`,
    );
  }
}
const html = await readFile("dist/index.html", "utf8");
if (/\b(?:src|href)="\/(?!\/)/.test(html)) {
  throw new Error(
    "Root-relative asset URL would break repository-subpath hosting.",
  );
}
await readFile("dist/third-party-licenses.txt", "utf8");
await readFile("dist/music-metadata-license.txt", "utf8");
await readFile("dist/music/credits.txt", "utf8");
console.log(
  `Public build verified: ${approvedMusic.size} authorized demo tracks and companion hashes, credits included, unapproved music excluded.`,
);
