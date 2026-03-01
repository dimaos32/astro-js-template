import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';

const gray = (text) => `\x1b[38;2;136;136;136m${text}\x1b[0m`;
const green = (text) => `\x1b[38;2;0;255;0m${text}\x1b[0m`;
const yellow = (text) => `\x1b[38;2;255;255;0m${text}\x1b[0m`;
const red = (text) => `\x1b[38;2;255;0;0m${text}\x1b[0m`;

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
      console.log(`${yellow('⚠')} No SVG files found in ${iconsDir}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `${gray(new Date().toLocaleTimeString())} Found ${green(svgFiles.length)} SVG files`
    );

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
            `${yellow('⚠')} Error optimizing ${file}: ${result.error}`
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
        console.warn(`${yellow('⚠')} Error processing ${file}: ${err.message}`);
        skipped++;
      }
    }

    spriteContent += '</svg>';
    await writeFile(outputFile, spriteContent);

    const endTime = Date.now();
    const timeSpent = ((endTime - startTime) / 1000).toFixed(2);

    // eslint-disable-next-line no-console
    console.log(
      `${gray(new Date().toLocaleTimeString())} ${green('✓')} Sprite saved: ${green(optimized)} icons, ${yellow(skipped)} skipped, ${gray(timeSpent + 's')}`
    );

    // eslint-disable-next-line no-console
    console.log(
      `${gray(new Date().toLocaleTimeString())} 📍 Output: ${outputFile}`
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`${red('✗')} Error: ${err.message}`);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

await buildSprite();
