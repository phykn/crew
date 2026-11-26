import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerPKG } from '@electron-forge/maker-pkg';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'node:fs/promises';
import path from 'node:path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // The title bar's campfire, drawn from the same paths as TitleBar.tsx; icon.ico on Windows, icon.icns on macOS
    icon: 'assets/icon',
    // The crew's rules and definitions are read at runtime from resources/crew
    extraResource: ['crew'],
  },
  rebuildConfig: {},
  hooks: {
    // Windows packages one folder, so its contents are lifted into out itself and the app is out/crew.exe; the macOS
    // package stays in its folder, where its makers look for it
    postPackage: async (_config, { platform, outputPaths }) => {
      if (platform !== 'win32') return;
      for (const dir of outputPaths) {
        const out = path.dirname(dir);
        for (const name of await fs.readdir(out))
          if (path.join(out, name) !== dir) await fs.rm(path.join(out, name), { recursive: true, force: true });
        for (const name of await fs.readdir(dir)) await fs.rename(path.join(dir, name), path.join(out, name));
        await fs.rmdir(dir);
      }
    },
  },
  // The macOS app as a zip, which any computer can make, and as a .pkg installer, which only a Mac can make
  makers: [new MakerZIP({}, ['darwin']), new MakerPKG({}, ['darwin'])],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/backend/index.ts', config: 'vite.main.config.mts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.mts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.mts' }],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
