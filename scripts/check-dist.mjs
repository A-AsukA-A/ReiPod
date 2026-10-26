import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const demoCatalog = JSON.parse(
  await readFile("src/player/demoCatalog.json", "utf8"),
);
const approvedMusic = new Map(
  demoCatalog.map((song) => [`music/${song.filename}`, song]),
);

const files = await readdir("dist", { recursive: true });
for (const file of files) {
  const path = file.replaceAll("\\", "/");
  if (
    (/\.(m4a|mp3|wav|flac|ipa)$/i.test(path) && !approvedMusic.has(path)) ||
    /(?:^|\/)(?:analysis|\.local|docs)\//.test(path)
  ) {
    throw new Error(`Private or unexpected file in public build: ${file}`);
  }
  if (/\.(html|js)$/.test(file)) {
    const content = await readFile(`dist/${file}`, "utf8");
    if (/__test-music|告白气球|千山万水/.test(content)) {
      throw new Error(
        `Private development music entry in public build: ${file}`,
      );
    }
  }
}
for (const [path, song] of approvedMusic) {
  const data = await readFile(`dist/${path}`);
  if (
    data.length !== song.bytes ||
    createHash("sha256").update(data).digest("hex") !== song.sha256
  ) {
    throw new Error(
      `Approved demo audio does not match its source manifest: ${path}`,
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
await readFile("dist/music/credits.txt", "utf8");
console.log(
  `Public build verified: ${approvedMusic.size} approved demo tracks, credits included, private test music excluded.`,
);
