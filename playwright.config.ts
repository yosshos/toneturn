import { defineConfig, devices } from '@playwright/test';

// Browser E2E with real Chromium. Microphone capture uses Chromium's fake device;
// speech recognition is NOT exercised for real — voice flows run in the labelled simulator (?sim=1).
export default defineConfig({
  testDir: 'e2e',
  timeout: 150_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 2, // lessons run in real time (audio + narration); heavy parallelism causes timeouts
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    // 690 px wide (0.51): the suite walks the phone layout (tab bar, menu sheet); e2e/desktop.spec.ts sets its own
    // 1440 / 900 px viewports for the side menu and the tablet rail (SPEC-DESKTOP).
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 690, height: 720 }, channel: 'chrome' } }, // installed Google Chrome (headless): real media stack; the downloaded Chromium is blocked by OS policy here
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], channel: 'chrome' }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: 'npx vite --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
    },
    {
      // Production build for service-worker / offline tests.
      command: 'npx vite build && npx vite preview --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
