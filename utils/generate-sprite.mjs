import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';
import chalk from 'chalk';

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
      // eslint-disable-next-line no-console
      console.log(`${chalk.yellow('!')} No SVG files found in ${iconsDir}`);
      return;
    }

    const timestamp = chalk.gray(new Date().toLocaleTimeString());
    // eslint-disable-next-line no-console
    console.log(`${timestamp} Found ${chalk.green(svgFiles.length)} SVG files`);

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
          // eslint-disable-next-line no-console
          console.warn(
            `${chalk.yellow('⚠')} Error optimizing ${file}: ${result.error}`
          );
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
        // eslint-disable-next-line no-console
        console.warn(
          `${chalk.yellow('!')} Error processing ${file}: ${err.message}`
        );
        skipped++;
      }
    }

    spriteContent += '</svg>';
    await writeFile(outputFile, spriteContent);

    const endTime = Date.now();
    const timeSpent = ((endTime - startTime) / 1000).toFixed(2);
    const finalTimestamp = chalk.gray(new Date().toLocaleTimeString());

    // eslint-disable-next-line no-console
    console.log(
      `${finalTimestamp} ${chalk.green('✓')} Sprite saved: ${chalk.green(optimized)} icons, ${chalk.yellow(skipped)} skipped, ${chalk.gray(timeSpent + 's')}`
    );

    // eslint-disable-next-line no-console
    console.log(
      `${finalTimestamp} ${chalk.cyan('▶')} Output: ${chalk.cyan(outputFile)}`
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`${chalk.red('❌')} Error: ${err.message}`);
    throw err;
  }
}

await buildSprite();
