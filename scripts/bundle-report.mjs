import { readdir, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const files = await readdir("dist", { recursive: true });
const summary = {
  total: 0,
  program: 0,
  programGzip: 0,
  demoAudio: 0,
  entryGzip: 0,
};
for (const file of files) {
  const info = await stat(`dist/${file}`);
  if (!info.isFile()) continue;
  summary.total += info.size;
  if (/\.(mp3|m4a|wav)$/i.test(file)) {
    summary.demoAudio += info.size;
    continue;
  }
  summary.program += info.size;
  if (/\.(js|css|html)$/i.test(file)) {
    const data = await readFile(`dist/${file}`);
    const size = gzipSync(data).length;
    summary.programGzip += size;
    if (/assets[\\/]index-.*\.js$/.test(file)) summary.entryGzip += size;
  }
}
console.log(
  JSON.stringify(
    {
      bytes: summary,
      megabytes: Object.fromEntries(
        Object.entries(summary).map(([key, value]) => [
          key,
          Number((value / 1e6).toFixed(3)),
        ]),
      ),
    },
    null,
    2,
  ),
);
if (summary.entryGzip > 150_000)
  throw new Error("Entry bundle exceeds the 150 kB gzip budget.");
if (summary.programGzip > 350_000)
  throw new Error("Program code exceeds the 350 kB gzip budget.");

if (summary.demoAudio > 4_000_000)
  throw new Error("Bundled demo audio exceeds the 4 MB budget.");
