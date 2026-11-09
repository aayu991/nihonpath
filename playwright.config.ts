import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.NIHONPATH_TEST_ORIGIN ?? "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3000",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
