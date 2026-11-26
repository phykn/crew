import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Each test has its own scratch record, so they run side by side; past two Electron windows at once the slow ones time out
  workers: 2,
  fullyParallel: true,
  timeout: 60_000,
  // A step that waits on the scripted crew can take a few seconds while another window is busy
  expect: { timeout: 10_000 },
});
