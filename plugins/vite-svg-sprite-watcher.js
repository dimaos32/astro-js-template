import { exec } from 'node:child_process';
import { normalize } from 'node:path';
import chalk from 'chalk';

export function viteSvgSpriteWatcher(options = {}) {
  const iconsPath = normalize(options.iconsPath || '/src/raw/icons/');
  const spriteScript = options.spriteScript || 'node utils/generate-sprite.mjs';

  let hasGeneratedForBuild = false;

  const runSpriteGeneration = () => {
    return new Promise((resolve, reject) => {
      const timestamp = chalk.gray(new Date().toLocaleTimeString());

      // eslint-disable-next-line no-console
      console.log(`${timestamp} ${chalk.blue('🔨 Building sprite...')}`);

      exec(spriteScript, (error) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error(
            `${timestamp} ${chalk.red('❌ Error:')} ${error.message}`
          );
          reject(error);
        } else {
          // eslint-disable-next-line no-console
          console.log(
            `${timestamp} ${chalk.green('✓ Sprite built successfully')}`
          );
          resolve();
        }
      });
    });
  };

  return {
    name: 'vite-plugin-svg-sprite-watcher',
    enforce: 'pre',

    buildStart() {
      if (!hasGeneratedForBuild) {
        hasGeneratedForBuild = true;
        return runSpriteGeneration();
      }

      return Promise.resolve();
    },

    configureServer(server) {
      let isBuilding = false;

      // eslint-disable-next-line no-console
      console.log(chalk.yellow('🔍 Плагин svg-sprite-watcher активирован'));
      // eslint-disable-next-line no-console
      console.log(chalk.yellow(`   Слежу за: ${iconsPath}`));

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
        runSpriteGeneration();
      });

      server.watcher
        .on('add', rebuildSprite)
        .on('change', rebuildSprite)
        .on('unlink', rebuildSprite);
    },
  };
}
