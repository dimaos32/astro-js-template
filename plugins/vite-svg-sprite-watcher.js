import { exec } from 'node:child_process';
import { normalize } from 'node:path';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('sprite');

export function viteSvgSpriteWatcher(options = {}) {
  const iconsPath = normalize(options.iconsPath || '/src/raw/icons/');
  const spriteScript = options.spriteScript || 'node utils/generate-sprite.mjs';

  let hasGeneratedForBuild = false;

  const runSpriteGeneration = () => {
    return new Promise((resolve, reject) => {
      logger.info('🔨 Building sprite...');

      exec(spriteScript, (error) => {
        if (error) {
          logger.error(`❌ Error: ${error.message}`);

          reject(error);
        } else {
          logger.success('✓ Sprite built successfully');
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

      logger.info('🔍 Плагин svg-sprite-watcher активирован');
      logger.info(`   Слежу за: ${iconsPath}`);

      const rebuildSprite = (filePath) => {
        if (
          !normalize(filePath).includes(iconsPath) ||
          !filePath.endsWith('.svg')
        ) {
          return;
        }

        if (isBuilding) return;
        isBuilding = true;

        logger.info('🔄 SVG changed, rebuilding sprite...');

        exec(spriteScript, (error) => {
          isBuilding = false;
          if (error) {
            logger.error(`❌ Error: ${error.message}`);
          } else {
            logger.success('✓ Sprite updated successfully');
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
