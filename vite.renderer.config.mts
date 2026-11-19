import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// The window shows the version the build was made from
export default defineConfig({ plugins: [react()], define: { __APP_VERSION__: JSON.stringify(pkg.version) } });
