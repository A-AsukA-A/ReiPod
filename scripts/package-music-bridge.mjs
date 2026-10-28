import {
  cp,
  mkdir,
  readFile,
  writeFile,
  rename,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
const output = resolve("dist/downloads");
await mkdir(output, { recursive: true });
const stage = await mkdtemp(resolve(".local/extension-package-"));
try {
  for (const name of [
    "worker.js",
    "manifest.json",
    "content.js",
    "third-party-licenses.txt",
  ]) {
    await cp(join(".local/extension", name), join(stage, name));
  }
  const manifest = JSON.parse(
    await readFile(join(stage, "manifest.json"), "utf8"),
  );
  manifest.content_scripts[0].matches = [
    "https://a-asuka-a.github.io/ReiPod/*",
  ];
  manifest.icons = Object.fromEntries(
    [16, 32, 48, 128].map((size) => [size, `icons/icon-${size}.png`]),
  );
  await cp("extension/icons", join(stage, "icons"), { recursive: true });
  await writeFile(
    join(stage, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const temporary = join(output, "reipod-extension.zip");
  await rm(temporary, { force: true });
  execFileSync("zip", ["-q", "-r", temporary, "."], { cwd: stage });
  const digest = createHash("sha256")
    .update(await readFile(temporary))
    .digest("hex");
  const filename = `reipod-extension-${digest.slice(0, 16)}.zip`;
  await rename(temporary, join(output, filename));
  const url = `https://a-asuka-a.github.io/ReiPod/downloads/${filename}`;
  const helper = (await readFile("extension/install-macos.sh", "utf8"))
    .replace("@@URL@@", url)
    .replace("@@SHA256@@", digest);
  await writeFile(join(output, "install-reipod.command"), helper);
  await writeFile(
    join(output, "extension.json"),
    JSON.stringify(
      { version: manifest.version, url, sha256: digest, filename },
      null,
      2,
    ) + "\n",
  );
  const page = (await readFile("extension/install.html", "utf8")).replaceAll(
    "@@ZIP@@",
    filename,
  );
  await writeFile(resolve("dist/extension-install.html"), page);
  console.log(`Extension download: ${filename} (SHA-256 ${digest})`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
