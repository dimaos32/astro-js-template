import { defineConfig } from 'astro/config';
import viteSassGlob from '@moritzloewenstein/vite-plugin-sass-glob-import';
import { exec } from 'node:child_process';
import chalk from 'chalk';
import { normalize } from 'node:path';

export default defineConfig({
  devToolbar: { enabled: false },
  compressHTML: false,
  output: 'static',
  publicDir: './public',
  build: {
    format: 'file',
    assets: 'assets',
    assetsPrefix: '.',
  },
  server: {
    open: './sitemap.html',
    host: true,
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
        '@styles': '/src/styles/global',
      },
    },
    build: {
      assetsInlineLimit: 0,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          entryFileNames: 'scripts/scripts.js',
          assetFileNames: (assetInfo) => {
            if (!assetInfo.names) return '';

            const fileName = assetInfo.names[0];

            if (fileName.endsWith('.css')) {
              return 'styles/styles.css';
            }

            return `assets/${fileName}`;
          },
        },
      },
    },
    plugins: [
      viteSassGlob(),
      {
        name: 'svg-sprite-watcher',
        configureServer(server) {
          let isBuilding = false;
          const iconsPath = normalize('/src/raw/icons/');

          const rebuildSprite = (filePath) => {
            if (
              !normalize(filePath).includes(iconsPath) ||
              !filePath.endsWith('.svg')
            ) {
              return;
            }

            if (isBuilding) return;
            isBuilding = true;

            const timestamp = chalk.gray(new Date().toLocaleTimeString());
            // eslint-disable-next-line no-console
            console.log(
              `${timestamp} ${chalk.blue('🔄 SVG changed, rebuilding sprite...')}`
            );

            exec('node utils/generate-sprite.mjs', (error) => {
              isBuilding = false;
              if (error) {
                // eslint-disable-next-line no-console
                console.error(
                  `${timestamp} ${chalk.red('❌ Error:')} ${error.message}`
                );
              } else {
                // eslint-disable-next-line no-console
                console.log(
                  `${timestamp} ${chalk.green('✓ Sprite updated successfully')}`
                );
              }
            });
          };
          server.httpServer?.once('listening', () => {
            const timestamp = chalk.gray(new Date().toLocaleTimeString());
            // eslint-disable-next-line no-console
            console.log(
              `${timestamp} ${chalk.blue('🔨 Initial sprite build...')}`
            );
            exec('node util/generate-sprite.mjs', (error) => {
              if (!error) {
                // eslint-disable-next-line no-console
                console.log(`${timestamp} ${chalk.green('✓ Sprite ready')}`);
              }
            });
          });
          server.watcher
            .on('add', rebuildSprite)
            .on('change', rebuildSprite)
            .on('unlink', rebuildSprite);
        },
      },
    ],
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
});
