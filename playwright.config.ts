import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.001,
    },
  },
  use: {
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    timezoneId: "Asia/Tokyo",
    locale: "en-US",
    colorScheme: "light",
    reducedMotion: "reduce",
  },
});
