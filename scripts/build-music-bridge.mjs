import { build } from "vite";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const extension = resolve(".local/extension");
await build({
  configFile: false,
  publicDir: false,
  define: {
    "process.env": "{}",
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    target: "es2022",
    outDir: extension,
    emptyOutDir: true,
    lib: {
      entry: resolve("extension/worker.mjs"),
      formats: ["es"],
      fileName: () => "worker.js",
    },
    rollupOptions: { output: { codeSplitting: false } },
  },
});
const notices = await Promise.all(
  [
    [
      "QQ Music API 3.3.5",
      "node_modules/@yakult-green-tea/qq-music-api/LICENSE",
    ],
    [
      "QQ Music API attribution",
      "node_modules/@yakult-green-tea/qq-music-api/ATTRIBUTION.md",
    ],
    ["CryptoJS 4.2.0", "node_modules/crypto-js/LICENSE"],
    ["qrcode 1.5.4", "node_modules/qrcode/license"],
    ["dijkstrajs", "node_modules/dijkstrajs/LICENSE.md"],
  ].map(async ([name, path]) => `${name}\n\n${await readFile(path, "utf8")}`),
);
await writeFile(
  resolve(extension, "third-party-licenses.txt"),
  notices.join("\n\n---\n\n"),
);
await copyFile("extension/manifest.json", resolve(extension, "manifest.json"));
await copyFile("extension/content.js", resolve(extension, "content.js"));
if (process.argv.includes("--ios")) {
  await mkdir("ios/ReiPod/Web", { recursive: true });
  await writeFile(
    "ios/ReiPod/Web/music-bridge-licenses.txt",
    notices.join("\n\n---\n\n"),
  );
  await build({
    configFile: false,
    publicDir: false,
    define: {
      "process.env": "{}",
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      target: "safari16",
      outDir: resolve("ios/ReiPod/Web"),
      emptyOutDir: false,
      lib: {
        entry: resolve("bridge/ios.mjs"),
        formats: ["iife"],
        name: "ReiPodMusicRuntime",
        fileName: () => "music-runtime.js",
      },
      rollupOptions: { output: { codeSplitting: false } },
    },
  });
}
console.log(`Music extension prepared: ${extension}`);
