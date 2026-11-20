import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Each test has its own scratch record, so they run side by side; past half the cores each one only slows down
  workers: '50%',
  fullyParallel: true,
  timeout: 60_000,
});
