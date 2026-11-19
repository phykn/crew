import { defineConfig } from 'vitest/config';

// Unit tests use a fake SDK and run in seconds; live tests call real Claude and cost money, so they run only on request
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/**/*.test.ts'], exclude: ['tests/live/**'] } },
      { test: { name: 'live', include: ['tests/live/*.test.ts'], testTimeout: 300_000 } },
    ],
  },
});
