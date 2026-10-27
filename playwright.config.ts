import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.pw.ts",
  outputDir: ".local/playwright-results",
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    launchOptions: process.env.REIPOD_BROWSER_EXECUTABLE
      ? { executablePath: process.env.REIPOD_BROWSER_EXECUTABLE }
      : {},
  },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
