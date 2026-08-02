import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  preserveOutput: "always",
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "he-IL",
    colorScheme: "light",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.CI ? undefined : "/usr/bin/google-chrome",
      args: ["--no-sandbox"],
    },
  },
  webServer:
    process.env.MOBILE_RELEASE_NEGATIVE_CONTROL === "1"
      ? undefined
      : {
          command: "npm run preview -- --host 127.0.0.1 --port 4173",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: false,
          timeout: 30_000,
        },
});
