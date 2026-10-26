import { networkInterfaces } from "node:os";

console.log(
  "ReiPod iPhone check: start npm run dev, then open a LAN address in Safari.",
);
for (const [name, interfaces] of Object.entries(networkInterfaces())) {
  for (const item of interfaces ?? []) {
    if (
      item.family !== "IPv4" ||
      item.internal ||
      item.address.startsWith("169.254.") ||
      item.address.startsWith("198.18.")
    )
      continue;
    console.log(`${name}: http://${item.address}:5173`);
  }
}
console.log(
  "Keep the iPhone on a network that can reach this computer. Safari playback does not validate native background audio or haptics.",
);
