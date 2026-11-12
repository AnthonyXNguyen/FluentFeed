import { defineConfig, devices } from "@playwright/test";

const PORT = 8099; // not 8081, so it doesn't collide with your own `expo start`

// End-to-end tests drive the real web app in Chromium. Supabase and the
// scoring API are faked per test (see e2e/fixtures.ts), so no credentials
// or backend are needed - locally or in CI.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    // The first page load waits for Metro to bundle the app.
    navigationTimeout: 120_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["microphone"],
    launchOptions: {
      // Fake mic so hold-to-speak records without hardware or a prompt.
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],

  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      CI: "1", // non-interactive Expo
      BROWSER: "none",
      // Fake hosts; every request to them is intercepted in e2e/fixtures.ts.
      EXPO_PUBLIC_SUPABASE_URL: "http://fakesb.test",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
      EXPO_PUBLIC_API_URL: "http://fakeapi.test",
    },
  },
});
