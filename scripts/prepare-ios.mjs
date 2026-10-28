import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "dist");
const target = resolve(root, "ios", "ReiPod", "Web");
if (
  target !== resolve(root, "ios/ReiPod/Web") ||
  dirname(target) !== resolve(root, "ios/ReiPod")
)
  throw Error("Invalid generated resource directory");
await stat(resolve(source, "index.html"));
await mkdir(dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
console.log(
  "iPhone resources prepared in ios/ReiPod/Web. On Mac: cd ios && xcodegen generate && open ReiPod.xcodeproj",
);
