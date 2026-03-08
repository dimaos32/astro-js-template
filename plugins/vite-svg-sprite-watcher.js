import { exec } from 'node:child_process';
import { normalize } from 'node:path';
import chalk from 'chalk';

export function viteSvgSpriteWatcher(options = {}) {
  const defaultIconsPath = '/src/raw/icons/';
  const defaultSpriteScript = 'node utils/generate-sprite.mjs';

  const iconsPath = normalize(options.iconsPath || defaultIconsPath);
  const spriteScript = options.spriteScript || defaultSpriteScript;

  return {
    name: 'vite-plugin-svg-sprite-watcher',
    configureServer(server) {
      let isBuilding = false;

      // eslint-disable-next-line no-console
      console.log('\x1b[33m🔍 Плагин svg-sprite-watcher активирован\x1b[0m');
      // eslint-disable-next-line no-console
      console.log(`\x1b[33m   Слежу за: ${iconsPath}\x1b[0m`);

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

        exec(spriteScript, (error) => {
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
        console.log(`${timestamp} ${chalk.blue('🔨 Initial sprite build...')}`);
        exec(spriteScript, (error) => {
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
  };
}
