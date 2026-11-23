import { defineConfig } from '@playwright/test';

// The demo recording is not a test, so it lives apart from e2e and runs only when asked
export default defineConfig({ testDir: '.', timeout: 180_000 });
