import { defineConfig } from 'astro/config';
import viteSassGlob from '@moritzloewenstein/vite-plugin-sass-glob-import';
import { viteTouchGlobalScss } from './plugins/vite-touch-global-scss';
import { viteSvgSpriteWatcher } from './plugins/vite-svg-sprite-watcher';

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
    open: 'sitemap.html',
    host: true,
    watch: {
      usePolling: true,
    },
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
        '@ui': '/src/components/ui',
        '@components': '/src/components/common',
        '@modules': '/src/components/modules',
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
      viteTouchGlobalScss({
        watchedPaths: ['/src/ui/', '/src/components/', '/src/modules/'],
        globalScssPath: '/src/styles/index.scss',
      }),
      viteSvgSpriteWatcher({
        iconsPath: '/src/raw/icons/',
        spriteScript: 'node utils/generate-sprite.mjs',
      }),
    ],
  },
});
