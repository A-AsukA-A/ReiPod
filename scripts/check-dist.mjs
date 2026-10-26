import { readdir, readFile } from "node:fs/promises";

const files = await readdir("dist", { recursive: true });
for (const file of files) {
  if (/\.(m4a|mp3|wav|flac|ipa)$/i.test(file) || /(?:^|\/)(?:analysis|\.local|docs)\//.test(file)) {
    throw new Error(`Private or unexpected file in public build: ${file}`);
  }
  if (/\.(html|js)$/.test(file)) {
    const content = await readFile(`dist/${file}`, "utf8");
    if (/__test-music|告白气球|千山万水/.test(content)) {
      throw new Error(`Private development music entry in public build: ${file}`);
    }
  }
}
const html = await readFile("dist/index.html", "utf8");
if (/\b(?:src|href)="\/(?!\/)/.test(html)) {
  throw new Error("Root-relative asset URL would break repository-subpath hosting.");
}
await readFile("dist/third-party-licenses.txt", "utf8");
console.log("Public build verified: relative assets, licenses included, private test music excluded.");
