import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { glob } from 'glob';
import chalk from 'chalk';
import inquirer from 'inquirer';

const QUALITY = 80;
const IMAGES_PATH = 'src/raw/images';
const OUT_PATH = 'public/images';

const optimizeImage = async (imagePath, imageMetadata, transformOptions) => {
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

  await sharpInstance.toFile(`${OUT_PATH}/${fileName}`);
  // eslint-disable-next-line no-console
  console.log(chalk.greenBright(`✓ ${fileName}`));
  sharpInstance.destroy();
};

const prepareImages = async (imagePath, options) => {
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
    optimizeImage(imagePath, imageMetadata, {
      quality,
      isWebp: false,
      isResize: false,
      isRetina: false,
    })
  );

  if (retina) {
    tasks.push(
      optimizeImage(imagePath, imageMetadata, {
        quality,
        isWebp: false,
        isResize: false,
        isRetina: true,
      })
    );
  }

  if (webp) {
    tasks.push(
      optimizeImage(imagePath, imageMetadata, {
        quality,
        isWebp: true,
        isResize: false,
        isRetina: false,
      })
    );

    if (retina) {
      tasks.push(
        optimizeImage(imagePath, imageMetadata, {
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
          `Очистить директорию ${chalk.whiteBright(OUT_PATH)}?`
        ),
        default: false,
      },
      {
        name: 'retina',
        type: 'confirm',
        message: chalk.blueBright('Использовать ретинизацию?'),
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
        message: chalk.blueBright('Качество изображений:'),
        default: QUALITY,
      },
    ]);

    const { clear, quality, retina, webp } = answers;

    if (clear) {
      await fs.rm(OUT_PATH, { recursive: true, force: true });
      // eslint-disable-next-line no-console
      console.log(
        chalk.blueBright(`✓ Директория ${chalk.whiteBright(OUT_PATH)} очищена`)
      );
    }

    await fs.mkdir(OUT_PATH, { recursive: true });
    // eslint-disable-next-line no-console
    console.log(
      chalk.blueBright(`✓ Директория ${chalk.whiteBright(OUT_PATH)} создана`)
    );

    const images = glob.sync([
      `${IMAGES_PATH}/**/*.jpg`,
      `${IMAGES_PATH}/**/*.jpeg`,
      `${IMAGES_PATH}/**/*.png`,
    ]);

    if (images.length === 0) {
      // eslint-disable-next-line no-console
      console.log(chalk.yellowBright(`⚠ Нет изображений в ${IMAGES_PATH}`));
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      chalk.yellowBright(`▶ Оптимизируем ${images.length} изображений...`)
    );

    let successCount = 0;
    let failedCount = 0;

    for (const img of images) {
      try {
        await prepareImages(img, { retina, webp, quality });
        successCount++;
      } catch (err) {
        failedCount++;
        // eslint-disable-next-line no-console
        console.error(
          chalk.redBright(`✗ ${path.basename(img)}: ${err.message}`)
        );
      }
    }

    if (failedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.redBright(
          `✗ Обработано: ${chalk.whiteBright(successCount)} изображений, ошибок: ${chalk.whiteBright(failedCount)}`
        )
      );

      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(
      chalk.greenBright(`✓ Все ${successCount} изображений оптимизированы`)
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(chalk.redBright(`✗ Ошибка: ${err.message}`));

    process.exit(1);
  }
};

main();
