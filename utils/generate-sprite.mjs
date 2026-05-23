import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('sprite ghost');

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../src/raw/icons');
const outputDir = join(__dirname, '../public/svg');
const outputFile = join(outputDir, 'sprite.svg');

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

async function buildSprite() {
  const startTime = Date.now();

  try {
    await mkdir(outputDir, { recursive: true });

    const files = await readdir(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith('.svg'));

    if (svgFiles.length === 0) {
      logger.warn(`⚠ No SVG files found in ${iconsDir}`);
      return;
    }

    logger.info(`Found ${svgFiles.length} SVG files`);

    let spriteContent =
      '<svg xmlns="http://www.w3.org/2000/svg" style="display: none">\n';
    let optimized = 0;
    let skipped = 0;

    for (const file of svgFiles) {
      try {
        const iconName = basename(file, '.svg');
        let content = await readFile(join(iconsDir, file), 'utf8');

        const result = optimize(content, svgoConfig);

        if (result.error) {
          logger.error(`⚠ Error optimizing ${file}: ${result.error}`);
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
        logger.error(`⚠ Error processing ${file}: ${err.message}`);
        skipped++;
      }
    }

    spriteContent += '</svg>';
    await writeFile(outputFile, spriteContent);

    const endTime = Date.now();
    const timeSpent = ((endTime - startTime) / 1000).toFixed(2);

    logger.success(
      `✓ Sprite saved: ${optimized} icons, ${skipped} skipped, ${timeSpent}s`
    );

    logger.success(`▶ Output: ${outputFile}`);
  } catch (err) {
    logger.error(`❌ Error: ${err.message}`);
    throw err;
  }
}

await buildSprite();
