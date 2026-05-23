import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, normalize } from 'node:path';
import { optimize } from 'svgo';
import { createLogger } from '../utils/logger.mjs';

const svgoConfig = {
  plugins: [
    'preset-default',
    'removeDimensions',
    'removeTitle',
    'removeDesc',
    'removeComments',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'cleanupIds',
    {
      name: 'addAttributesToSVGElement',
      params: {
        attributes: [{ focusable: 'false' }],
      },
    },
  ],
};

async function buildSprite(iconsPath, outputDir, outputFile, logger) {
  const startTime = Date.now();

  try {
    await mkdir(outputDir, { recursive: true });

    const files = await readdir(iconsPath);
    const svgFiles = files.filter((file) => file.endsWith('.svg'));

    if (svgFiles.length === 0) {
      logger.warn(`No SVG files found in ${iconsPath}`);
      return;
    }

    let spriteContent =
      '<svg xmlns="http://www.w3.org/2000/svg" style="display: none">\n';
    let optimized = 0;
    let skipped = 0;
    const errors = [];

    for (const file of svgFiles) {
      try {
        const iconName = basename(file, '.svg');
        let content = await readFile(join(iconsPath, file), 'utf8');

        const result = optimize(content, svgoConfig);

        if (result.error) {
          errors.push(`${file}: ${result.error}`);
          skipped++;
          continue;
        }

        const viewBoxMatch = result.data.match(/viewBox=["']([^"']+)["']/);

        let symbolContent = result.data
          .replace(/<\?xml.*?\?>/, '')
          .replace(/<!DOCTYPE.*?>/, '')
          .replace(/<svg[^>]*>/, '')
          .replace(/<\/svg>/, '')
          .replace(/\n\s*/g, ' ')
          .trim();

        spriteContent += `  <symbol id="${iconName}"${viewBoxMatch ? ` viewBox="${viewBoxMatch[1]}"` : ''}>${symbolContent}</symbol>\n`;
        optimized++;
      } catch (err) {
        errors.push(`${file}: ${err.message}`);
        skipped++;
      }
    }

    spriteContent += '</svg>';
    await writeFile(outputFile, spriteContent);

    const endTime = Date.now();
    const timeSpent = endTime - startTime;

    if (optimized === svgFiles.length && skipped === 0) {
      logger.success(`Rebuilt ${timeSpent}ms`);
    } else {
      logger.warn(`Rebuilt ${optimized} ok, ${skipped} failed ${timeSpent}ms`);
      errors.forEach((err) => logger.error(`  ${err}`));
    }
  } catch (err) {
    logger.error(`Failed: ${err.message}`);
  }
}

export function viteSvgSpriteWatcher(options = {}) {
  const iconsPath = options.iconsPath || '/src/raw/icons/';
  const fullIconsPath = normalize(join(process.cwd(), iconsPath));
  const outputDir = options.outputDir || join(process.cwd(), 'public/svg');
  const outputFile = options.outputFile || join(outputDir, 'sprite.svg');

  const logger = createLogger('sprite');
  let debounceTimer = null;
  let serverInstance = null;

  const runSpriteGeneration = async () => {
    await buildSprite(fullIconsPath, outputDir, outputFile, logger);

    if (serverInstance) {
      serverInstance.ws.send({ type: 'full-reload' });
    }
  };

  const debouncedRegenerate = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runSpriteGeneration();
    }, 150);
  };

  return {
    name: 'vite-plugin-svg-sprite-watcher',
    enforce: 'pre',

    buildStart() {
      return runSpriteGeneration();
    },

    configureServer(server) {
      serverInstance = server;
      logger.info(`Watching ${iconsPath}`);

      server.watcher
        .on('add', (filePath) => {
          if (!filePath.includes(fullIconsPath) || !filePath.endsWith('.svg'))
            return;
          debouncedRegenerate();
        })
        .on('change', (filePath) => {
          if (!filePath.includes(fullIconsPath) || !filePath.endsWith('.svg'))
            return;
          debouncedRegenerate();
        })
        .on('unlink', (filePath) => {
          if (!filePath.includes(fullIconsPath) || !filePath.endsWith('.svg'))
            return;
          debouncedRegenerate();
        });
    },
  };
}
