import { defineConfig } from 'vite';

// The SDK locates its bundled Claude Code binary from its own package, so it must not be bundled
export default defineConfig({ build: { rollupOptions: { external: ['@anthropic-ai/claude-agent-sdk'] } } });
