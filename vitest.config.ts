import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig, defineConfig({
  test: {
    // Research checkouts are untrusted references, not ReiPod test suites.
    exclude: [...configDefaults.exclude, "**/.local/**", "**/analysis/**", "**/docs/**"],
  },
}));
