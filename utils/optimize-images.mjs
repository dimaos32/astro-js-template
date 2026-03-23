import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { glob } from 'glob';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { optimize } from 'svgo';

const QUALITY = 80;
const RASTER_PATH = 'src/raw/images';
const SVG_OUT_PATH = 'public/svg';
const RASTER_OUT_PATH = 'public/images';

const PROTECTED_SVG_FILES = ['sprite.svg'];
const PROTECTED_RASTER_FILES = [];

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
  ],
};

const clearDirectory = async (dirPath, protectedFiles = []) => {
  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      if (protectedFiles.includes(file)) {
        continue;
      }

      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
};

const optimizeRaster = async (imagePath, imageMetadata, transformOptions) => {
  const { width, format, baseName, extName } = imageMetadata;
  let { quality, isWebp, isResize, isRetina } = transformOptions;

  const fileFormat = isWebp ? '.webp' : extName;
  const name = baseName.replace(extName, '');
  let fileName = isRetina ? `${name}@2x${fileFormat}` : `${name}${fileFormat}`;

  if (quality <= 0 || quality > 100) {
    quality = QUALITY;
  }

  let sharpInstance = sharp(imagePath);

  if (isResize) {
    fileName = isRetina ? `${name}@1x${fileFormat}` : `${name}${fileFormat}`;
    sharpInstance = sharpInstance.resize({ width: Math.round(width / 2) });
  }

  if (isWebp) {
    sharpInstance = sharpInstance.webp({ quality });
  } else {
    switch (format) {
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ mozjpeg: true, quality });
    }
  }

  await sharpInstance.toFile(`${RASTER_OUT_PATH}/${fileName}`);
  // eslint-disable-next-line no-console
  console.log(chalk.greenBright(`✓ ${fileName}`));
  sharpInstance.destroy();
};

const optimizeSvg = async (svgPath) => {
  const baseName = path.basename(svgPath);
  const fileName = baseName;

  try {
    const content = await fs.readFile(svgPath, 'utf8');
    const result = optimize(content, svgoConfig);

    if (result.error) {
      throw new Error(result.error);
    }

    await fs.writeFile(`${SVG_OUT_PATH}/${fileName}`, result.data);
    // eslint-disable-next-line no-console
    console.log(chalk.greenBright(`✓ ${fileName}`));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(chalk.redBright(`✗ ${fileName}: ${err.message}`));
    throw err;
  }
};

const prepareRaster = async (imagePath, options) => {
  const { quality, retina, webp } = options;

  const sharpInstance = sharp(imagePath);
  const metadata = await sharpInstance.metadata();
  const baseName = path.basename(imagePath);
  const extName = path.extname(imagePath);

  const imageMetadata = {
    width: metadata.width,
    format: metadata.format,
    baseName,
    extName,
  };

  const tasks = [];

  tasks.push(
    optimizeRaster(imagePath, imageMetadata, {
      quality,
      isWebp: false,
      isResize: false,
      isRetina: false,
    })
  );

  if (retina) {
    tasks.push(
      optimizeRaster(imagePath, imageMetadata, {
        quality,
        isWebp: false,
        isResize: false,
        isRetina: true,
      })
    );
  }

  if (webp) {
    tasks.push(
      optimizeRaster(imagePath, imageMetadata, {
        quality,
        isWebp: true,
        isResize: false,
        isRetina: false,
      })
    );

    if (retina) {
      tasks.push(
        optimizeRaster(imagePath, imageMetadata, {
          quality,
          isWebp: true,
          isResize: false,
          isRetina: true,
        })
      );
    }
  }

  await Promise.all(tasks);
  sharpInstance.destroy();
};

const main = async () => {
  try {
    const answers = await inquirer.prompt([
      {
        name: 'clear',
        type: 'confirm',
        message: chalk.blueBright(
          `Очистить директории ${chalk.whiteBright(RASTER_OUT_PATH)} и ${chalk.whiteBright(SVG_OUT_PATH)}?`
        ),
        default: false,
      },
      {
        name: 'retina',
        type: 'confirm',
        message: chalk.blueBright(
          'Использовать ретинизацию для растровых изображений?'
        ),
        default: true,
      },
      {
        name: 'webp',
        type: 'confirm',
        message: chalk.blueBright('Использовать WebP?'),
        default: true,
      },
      {
        name: 'quality',
        type: 'number',
        message: chalk.blueBright('Качество растровых изображений:'),
        default: QUALITY,
      },
    ]);

    const { clear, quality, retina, webp } = answers;

    if (clear) {
      await clearDirectory(RASTER_OUT_PATH, PROTECTED_RASTER_FILES);
      await clearDirectory(SVG_OUT_PATH, PROTECTED_SVG_FILES);

      const protectedInfo = [];
      if (PROTECTED_SVG_FILES.length) {
        protectedInfo.push(
          `${chalk.whiteBright(PROTECTED_SVG_FILES.join(', '))} в SVG`
        );
      }
      if (PROTECTED_RASTER_FILES.length) {
        protectedInfo.push(
          `${chalk.whiteBright(PROTECTED_RASTER_FILES.join(', '))} в изображениях`
        );
      }

      // eslint-disable-next-line no-console
      console.log(
        chalk.blueBright(
          `✓ Директории очищены${protectedInfo.length ? ` (сохранены: ${protectedInfo.join(', ')})` : ''}`
        )
      );
    }

    const svgFiles = glob.sync([`${RASTER_PATH}/**/*.svg`]);

    if (svgFiles.length > 0) {
      await fs.mkdir(SVG_OUT_PATH, { recursive: true });
      // eslint-disable-next-line no-console
      console.log(chalk.blueBright(`▶ Оптимизируем ${svgFiles.length} SVG...`));

      let svgSuccess = 0;
      let svgFailed = 0;

      for (const svg of svgFiles) {
        try {
          await optimizeSvg(svg);
          svgSuccess++;
          // eslint-disable-next-line no-unused-vars
        } catch (err) {
          svgFailed++;
        }
      }

      if (svgFailed > 0) {
        // eslint-disable-next-line no-console
        console.log(
          chalk.redBright(
            `✗ SVG: ${chalk.whiteBright(svgSuccess)} OK, ${chalk.whiteBright(svgFailed)} ошибок`
          )
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(
          chalk.greenBright(`✓ Все ${svgSuccess} SVG оптимизированы`)
        );
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(chalk.yellowBright(`⚠ Нет SVG в ${RASTER_PATH}`));
    }

    // Оптимизация растровых изображений
    const rasterFiles = glob.sync([
      `${RASTER_PATH}/**/*.jpg`,
      `${RASTER_PATH}/**/*.jpeg`,
      `${RASTER_PATH}/**/*.png`,
    ]);

    if (rasterFiles.length === 0) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.yellowBright(`⚠ Нет растровых изображений в ${RASTER_PATH}`)
      );
      return;
    }

    await fs.mkdir(RASTER_OUT_PATH, { recursive: true });
    // eslint-disable-next-line no-console
    console.log(
      chalk.yellowBright(
        `▶ Оптимизируем ${rasterFiles.length} растровых изображений...`
      )
    );

    let rasterSuccess = 0;
    let rasterFailed = 0;

    for (const img of rasterFiles) {
      try {
        await prepareRaster(img, { retina, webp, quality });
        rasterSuccess++;
      } catch (err) {
        rasterFailed++;
        // eslint-disable-next-line no-console
        console.error(
          chalk.redBright(`✗ ${path.basename(img)}: ${err.message}`)
        );
      }
    }

    if (rasterFailed > 0) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.redBright(
          `✗ Растры: ${chalk.whiteBright(rasterSuccess)} OK, ${chalk.whiteBright(rasterFailed)} ошибок`
        )
      );

      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(
      chalk.greenBright(
        `✓ Все ${rasterSuccess} растровых изображений оптимизированы`
      )
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(chalk.redBright(`✗ Ошибка: ${err.message}`));

    process.exit(1);
  }
};

main();
